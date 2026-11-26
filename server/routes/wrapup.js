import express from 'express';
import { withTransaction } from '../db.js';
import { config } from '../config.js';
import { requireAuth } from '../middleware/auth.js';
import { httpError } from '../middleware/errors.js';
import { audit, requestIp } from '../lib/audit.js';
import { ensureFreshLifecycle } from '../lib/sessionLifecycle.js';
import { settleSessionRow } from '../lib/sessionSettlement.js';
import {
  publishRoomEvent,
  getRoomPresenceStats,
  clearRoomPresence,
} from '../lib/realtimeEvents.js';

const router = express.Router();
export const MIN_PRODUCTION_SESSION_SECONDS = 300; // Kept as named export; runtime uses config.minSessionPointsSeconds

/**
 * POST /sessions/:id/wrap-up (session participant)
 *
 * Behavior by mode:
 * - Online:
 *   - While `in-progress`: ONLY the assigned tutor can end it (learners get 403).
 *   - Once `completed` or `auto-closed`: participants can record post-session rating (learner)
 *     or notes (tutor) without re-posting points or decrementing referral hours.
 * - Face to Face:
 *   - Keeps the existing wrap-up flow (both checked in -> completed + ledger settlement in one tx).
 */
router.post('/sessions/:id/wrap-up', requireAuth, async (req, res, next) => {
  try {
    await ensureFreshLifecycle();
    const sessionId = req.params.id;
    const isTutorRole = req.user.role === 'tutor' || req.user.role === 'faculty';
    const notesProvided = req.body?.notes !== undefined;
    const notes = isTutorRole && notesProvided ? (String(req.body?.notes ?? '').slice(0, 500) || null) : undefined;
    const rawRating = req.body?.rating;
    const ratingProvided = rawRating !== undefined && rawRating !== null && rawRating !== '';

    let broadcastPayload = null;
    let broadcastKeys = [];

    const wrap = await withTransaction(async (client) => {
      const { rows: live } = await client.query(
        `SELECT * FROM sessions WHERE id = $1 FOR UPDATE`,
        [sessionId],
      );
      const session = live[0];
      if (!session) throw httpError(404, 'Session not found');
      if (session.tutor_id !== req.user.id && session.learner_id !== req.user.id) {
        throw httpError(403, 'Not your session');
      }

      const isSessionTutor = session.tutor_id === req.user.id;
      const isSessionLearner = session.learner_id === req.user.id;
      const tutorSelfRatingBlocked = isSessionTutor && !config.demoMode;

      // Validate rating when provided or required
      let parsedRating = undefined;
      if (ratingProvided && !tutorSelfRatingBlocked) {
        const n = Number(rawRating);
        if (!Number.isInteger(n) || n < 1 || n > 5) {
          throw httpError(400, 'rating (integer 1-5) is required');
        }
        parsedRating = n;
      }

      // ── Online post-end feedback (session already ended by tutor or auto-closed by system) ──
      if (session.mode === 'online' && (session.status === 'completed' || session.status === 'auto-closed')) {
        if (isSessionLearner) {
          if (parsedRating === undefined) throw httpError(400, 'rating (integer 1-5) is required');
          if (session.rating != null) throw httpError(409, 'Session already rated');
        } else if (isSessionTutor) {
          if (!notesProvided && parsedRating === undefined) {
            throw httpError(409, 'Session already completed');
          }
          if (session.notes != null && !notesProvided) {
            throw httpError(409, 'Session already completed');
          }
        }

        const { rows: [saved] } = await client.query(
          `UPDATE sessions
              SET notes = CASE WHEN $1::boolean THEN $2 ELSE notes END,
                  rating = CASE WHEN $3::boolean THEN $4 ELSE rating END
            WHERE id = $5
            RETURNING *`,
          [isSessionTutor && notesProvided, notes ?? null, parsedRating !== undefined, parsedRating ?? null, session.id],
        );

        await audit({
          actorId: req.user.id,
          actorRole: req.user.role,
          action: 'session.wrap_up_feedback',
          entity: 'session',
          entityId: session.id,
          detail: { rating: parsedRating ?? null, hasNotes: Boolean(notes) },
          ip: requestIp(req),
        }, client);

        const tutorBalance = (await client.query(
          `SELECT COALESCE(SUM(amount), 0)::int AS balance FROM points_ledger WHERE user_id = $1`,
          [session.tutor_id],
        )).rows[0].balance;

        return {
          session: saved,
          alreadySettled: true,
          actualDurationSeconds: Number(saved.actual_duration_seconds) || 0,
          tutorBalance,
          referralResolved: null,
          points: 0,
          learnerPoints: 0,
          pointsPosted: Boolean(saved.points_posted),
          needsFacultyReview: Boolean(saved.needs_faculty_review),
          capped: false,
          badges: [],
        };
      }

      // ── Reject non-in-progress states for initial wrap-up ──
      if (session.status === 'completed' || session.status === 'auto-closed') {
        throw httpError(409, 'Session already completed');
      }
      if (session.status === 'cancelled' || session.status === 'missed') {
        throw httpError(409, `${session.status} sessions cannot be wrapped up`);
      }

      // Online sessions in-progress can ONLY be ended by their tutor.
      if (session.mode === 'online' && !isSessionTutor) {
        throw httpError(403, 'Only the assigned tutor can end an Online session');
      }

      if (!tutorSelfRatingBlocked && parsedRating === undefined) {
        throw httpError(400, 'rating (integer 1-5) is required');
      }

      const confirmations = (await client.query(
        `SELECT count(DISTINCT user_id)::int AS n FROM session_check_ins WHERE session_id = $1`,
        [sessionId],
      )).rows[0].n;
      if (confirmations < 2 || session.status !== 'in-progress') {
        throw httpError(409, 'Both the tutor and the learner must check in before wrap-up');
      }

      const isOnline = session.mode === 'online';
      const presenceStats = isOnline ? getRoomPresenceStats(session.id) : null;
      const settled = await settleSessionRow(client, session, {
        targetStatus: 'completed',
        endedBy: isOnline ? 'tutor' : 'participant',
        endedReason: isOnline ? 'tutor_ended' : 'wrap_up',
        notes,
        rating: parsedRating,
        presenceStats,
        actorId: req.user.id,
        actorRole: req.user.role,
        ip: requestIp(req),
        auditAction: 'session.wrap_up',
      });

      if (isOnline) {
        broadcastKeys = [session.id, session.session_code].filter(Boolean);
        broadcastPayload = {
          type: 'session.ended',
          sessionId: session.id,
          endedBy: 'tutor',
          reason: settled.session.ended_reason,
          actualDurationSeconds: settled.actualDurationSeconds,
          pointsPosted: settled.pointsPosted,
          needsFacultyReview: settled.needsFacultyReview,
        };
      }

      return settled;
    });

    if (broadcastPayload) {
      clearRoomPresence(sessionId);
      await publishRoomEvent(broadcastKeys, broadcastPayload);
    }

    res.json(wrap);
  } catch (e) { next(e); }
});

export default router;
