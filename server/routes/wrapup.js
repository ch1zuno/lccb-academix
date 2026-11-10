import express from 'express';
import { withTransaction } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { httpError } from '../middleware/errors.js';
import { audit, requestIp } from '../lib/audit.js';
import {
  awardWithinCap,
  SESSION_POINTS_EARNED_SQL,
  WEEKLY_LEARNER_SESSION_CAP,
  WEEKLY_TUTOR_SESSION_CAP,
} from '../lib/points.js';

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

    const durationSecondsParam = Number(req.body?.durationSeconds);

    const wrap = await withTransaction(async (client) => {
      // lock row for safe transitions
      const { rows: live } = await client.query(
        `SELECT id, tutor_id, learner_id, subject_id, referral_id, status, started_at, COALESCE(duration_hours, 1) AS duration_hours
         FROM sessions WHERE id = $1 FOR UPDATE`,
        [sessionId]);
      const session = live[0];
      if (!session) throw httpError(404, 'Session not found');
      if (session.tutor_id !== req.user.id && session.learner_id !== req.user.id) {
        throw httpError(403, 'Not your session');
      }
      if (session.status === 'completed') throw httpError(409, 'Session already completed');
      if (session.status === 'cancelled') throw httpError(409, 'Cancelled sessions cannot be wrap-up');

      // A session is only real after both parties check in. Without this gate
      // a tutor could create a booking and immediately wrap it up for points.
      const confirmations = (await client.query(
        `SELECT count(DISTINCT user_id)::int AS n FROM session_check_ins WHERE session_id = $1`,
        [sessionId],
      )).rows[0].n;
      if (confirmations < 2 || session.status !== 'in-progress') {
        throw httpError(409, 'Both the tutor and the learner must check in before wrap-up');
      }

      const actualDuration = Number.isInteger(durationSecondsParam) && durationSecondsParam > 0
        ? durationSecondsParam
        : (session.started_at ? Math.max(1, Math.round((Date.now() - new Date(session.started_at).getTime()) / 1000)) : 0);

      const { rows: updatedRows } = await client.query(
        `UPDATE sessions
            SET status = 'completed',
                notes = $1,
                rating = $2,
                ended_at = CURRENT_TIMESTAMP,
                actual_duration_seconds = $3
          WHERE id = $4
          RETURNING id, status, notes, rating, started_at, ended_at, actual_duration_seconds`,
        [notes, rating, actualDuration, sessionId],
      );
      const updatedSession = updatedRows[0];

      let referralResolved = null;
      if (session.referral_id) {
        const { rows: dec } = await client.query(
          `UPDATE referrals
             SET hours_remaining = GREATEST(COALESCE(hours_remaining, hours_required) - $2, 0)
           WHERE id = $1 RETURNING id, status, hours_remaining, hours_required`,
          [session.referral_id, session.duration_hours]);
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

      // Rolling weekly caps limit self-dealing without blocking the academic
      // record: the session still completes, only the ledger credit is capped.
      const tutorEarned = (await client.query(SESSION_POINTS_EARNED_SQL, [session.tutor_id])).rows[0].earned;
      const learnerEarned = (await client.query(SESSION_POINTS_EARNED_SQL, [session.learner_id])).rows[0].earned;
      const pointsToAward = awardWithinCap(50, tutorEarned, WEEKLY_TUTOR_SESSION_CAP);
      const learnerPoints = awardWithinCap(25, learnerEarned, WEEKLY_LEARNER_SESSION_CAP);

      await client.query(
        `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, 'Session wrapped up', $2, 'success')`,
        [session.learner_id, `Your session was rated ${rating}/5${learnerPoints ? ` and earned ${learnerPoints} attendance points` : ''}.`]);
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, 'Session wrapped up', $2, 'success')`,
        [session.tutor_id, `${pointsToAward} points posted for session ${session.id.slice(0, 8)}.`]);

      if (pointsToAward > 0) {
        await client.query(
          `INSERT INTO points_ledger (user_id, amount, description)
           VALUES ($1, $2, $3)`,
          [session.tutor_id, pointsToAward, `Session wrap-up — ${session.id.slice(0, 8)} (${rating}★)`]);
      }

      // learner attendance credit (same transaction)
      if (learnerPoints > 0) {
        await client.query(
          `INSERT INTO points_ledger (user_id, amount, description)
           VALUES ($1, $2, $3)`,
          [session.learner_id, learnerPoints, `Attendance credit — ${session.id.slice(0, 8)}`]);
      }

      // badge unlocks (safe idempotent)
      const { rows: completedCount } = await client.query(
        `SELECT count(*)::int AS n FROM sessions WHERE tutor_id = $1 AND status = 'completed'`, [session.tutor_id]);
      const totalDone = completedCount[0].n;
      const unlocks = [];
      const pushBadge = async (code) => {
        const { rows: b } = await client.query(
          `INSERT INTO user_badges (user_id, badge_id)
           SELECT $1, id FROM badges WHERE badge_code = $2
           ON CONFLICT (user_id, badge_id) DO NOTHING
           RETURNING (SELECT name FROM badges WHERE badge_code = $2) AS name`,
          [session.tutor_id, code]);
        if (b[0]) unlocks.push(b[0].name);
      };
      if (totalDone >= 1) await pushBadge('BG-001');
      if (totalDone >= 10) await pushBadge('BG-003');

      await audit({
        actorId: req.user.id,
        actorRole: req.user.role,
        action: 'session.wrap_up',
        entity: 'session',
        entityId: sessionId,
        detail: {
          rating,
          durationSeconds: actualDuration,
          tutorPoints: pointsToAward,
          learnerPoints,
          referralResolved,
          capped: pointsToAward < 50 || learnerPoints < 25,
        },
        ip: requestIp(req),
      }, client);

      return {
        session: updatedSession || { id: sessionId, status: 'completed', notes, rating, actual_duration_seconds: actualDuration },
        actualDurationSeconds: actualDuration,
        tutorBalance: (await client.query(
          `SELECT COALESCE(SUM(amount),0)::int AS balance FROM points_ledger WHERE user_id = $1`,
        [session.tutor_id])).rows[0].balance,
        referralResolved,
        points: pointsToAward,
        learnerPoints,
        capped: pointsToAward < 50 || learnerPoints < 25,
        badges: unlocks,
      };
    });
    res.json(wrap);
  } catch (e) { next(e); }
});

export default router;
