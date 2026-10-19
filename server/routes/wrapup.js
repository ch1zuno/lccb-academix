import express from 'express';
import { query, withTransaction } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { httpError } from '../middleware/errors.js';

const router = express.Router();

/**
 * POST /sessions/:id/wrap-up  (session participant)
 * body: { notes, rating (1-5) }
 * ONE transaction:
 *   1. end session (in-progress|upcoming → completed) + save tutor notes
 *   2. store the learner's 1-5 rating
 *   3. decrement referral hours_remaining (when the session has one)
 *   4. auto-resolve referral at 0
 *   5. credit points_ledger for the tutor (+50 pts default)
 *   6. award badges (First Session at 1st completed; Rising Star at 10+)
 * Anything failing rolls back entirely.
 */
router.post('/sessions/:id/wrap-up', requireAuth, async (req, res, next) => {
  try {
    const sessionId = req.params.id;
    const isTutor = req.user.role === 'tutor';
    const notes = isTutor ? (String(req.body?.notes ?? '').slice(0, 500) || null) : null;
    const rating = Number(req.body?.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw httpError(400, 'rating (integer 1-5) is required');
    }
    const pointsToAward = 50; // simple flat rate for peer sessions (single-project decision.)

    const wrap = await withTransaction(async (client) => {
      // lock row for safe transitions
      const { rows: live } = await client.query(
        `SELECT id, tutor_id, learner_id, subject_id, referral_id, status
         FROM sessions WHERE id = $1 FOR UPDATE`,
        [sessionId]);
      const session = live[0];
      if (!session) throw httpError(404, 'Session not found');
      if (session.tutor_id !== req.user.id && session.learner_id !== req.user.id) {
        throw httpError(403, 'Not your session');
      }
      if (session.status === 'completed') throw httpError(409, 'Session already completed');
      if (session.status === 'cancelled') throw httpError(409, 'Cancelled sessions cannot be wrap-up');

      await client.query(
        `UPDATE sessions SET status = 'completed', notes = $1, rating = $2 WHERE id = $3`,
        [notes, rating, sessionId],
      );

      let referralResolved = null;
      if (session.referral_id) {
        const { rows: dec } = await client.query(
          `UPDATE referrals
             SET hours_remaining = GREATEST(COALESCE(hours_remaining, hours_required) - 1.5, 0)
           WHERE id = $1 RETURNING id, status, hours_remaining, hours_required`,
          [session.referral_id]);
        const ref = dec[0];
        if (ref && ref.hours_remaining <= 0 && ref.status !== 'resolved') {
          const { rows: resolved } = await client.query(
            `UPDATE referrals SET status = 'resolved' WHERE id = $1 RETURNING id, status`,
            [ref.id]);
          referralResolved = resolved[0]?.status ?? null;
          await client.query(
            `INSERT INTO notifications (user_id, title, message, type)
             SELECT learner_id, 'Referral complete', $2, 'success' FROM referrals WHERE id = $1`,
            [ref.id, `All mandatory hours completed — your referral is resolved.`]);
        }
      }

      await client.query(
        `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, 'Rating submitted', $2, 'success')`,
        [session.learner_id, `Your ${pointsToAward}-point session was rated ${rating}/5.`]);

      const { rows: ledgerRow } = await client.query(
        `INSERT INTO points_ledger (user_id, amount, description)
         VALUES ($1, $2, $3) RETURNING amount`,
        [req.user.id, pointsToAward, `Session wrap-up — ${session.id.slice(0, 8)} (${rating}★)`]);

      // learner attendance credit (same transaction)
      await client.query(
        `INSERT INTO points_ledger (user_id, amount, description)
         VALUES ($1, $2, $3)`,
        [session.learner_id, 25, `Attendance credit — ${session.id.slice(0, 8)}`]);

      // badge unlocks (safe idempotent)
      const { rows: completedCount } = await client.query(
        `SELECT count(*)::int AS n FROM sessions WHERE tutor_id = $1 AND status = 'completed'`, [req.user.id]);
      const totalDone = completedCount[0].n;
      const unlocks = [];
      const pushBadge = async (code) => {
        const { rows: b } = await client.query(
          `INSERT INTO user_badges (user_id, badge_id)
           SELECT $1, id FROM badges WHERE badge_code = $2
           ON CONFLICT (user_id, badge_id) DO NOTHING
           RETURNING (SELECT name FROM badges WHERE badge_code = $2) AS name`,
          [req.user.id, code]);
        if (b[0]) unlocks.push(b[0].name);
      };
      if (totalDone >= 1) await pushBadge('BG-001');
      if (totalDone >= 10) await pushBadge('BG-003');
      return {
        session: { id: sessionId, status: 'completed', notes },
        tutorBalance: (await client.query(
          `SELECT COALESCE(SUM(amount),0)::int AS balance FROM points_ledger WHERE user_id = $1`,
        [req.user.id])).rows[0].balance,
        referralResolved, points: ledgerRow.amount, badges: unlocks,
      };
    });
    res.json(wrap);
  } catch (e) { next(e); }
});

export default router;
