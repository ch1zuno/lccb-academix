/**
 * Superadmin containment & governance routes:
 *  - GET  /admin/tutors
 *  - POST /admin/tutors/:id/suspend
 *  - POST /admin/tutors/:id/reinstate
 *  - POST /admin/users/:id/revoke-sessions
 */
import express from 'express';
import { query, withTransaction } from '../db.js';
import { requireAuth, requireRole, requireStepUp } from '../middleware/auth.js';
import { httpError } from '../middleware/errors.js';
import { audit, requestIp } from '../lib/audit.js';

const router = express.Router();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertUuid(raw, label = 'id') {
  const id = String(raw ?? '').trim();
  if (!UUID_RE.test(id)) throw httpError(400, `Invalid ${label}`);
  return id;
}

/** GET /admin/tutors — superadmin tutor governance roster. */
router.get('/admin/tutors', requireAuth, requireRole('superadmin'), async (_req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT u.id, u.custom_id, u.name, u.email, u.program, u.is_verified, u.is_available,
              u.totp_enabled, u.suspended_at, u.suspended_reason, u.created_at,
              (SELECT count(*)::int FROM sessions s WHERE s.tutor_id = u.id AND s.status = 'completed') AS completed_sessions,
              (SELECT count(*)::int FROM sessions s WHERE s.tutor_id = u.id AND s.status IN ('upcoming', 'in-progress')) AS active_sessions
         FROM users u
        WHERE u.role = 'tutor'
        ORDER BY u.suspended_at NULLS LAST, u.is_verified DESC, u.name ASC`,
    );
    res.json({ tutors: rows });
  } catch (e) { next(e); }
});

/** POST /admin/tutors/:id/suspend { reason } — unverify, disable availability, and revoke all sessions. */
router.post('/admin/tutors/:id/suspend', requireAuth, requireRole('superadmin'), requireStepUp, async (req, res, next) => {
  try {
    const tutorId = assertUuid(req.params.id, 'tutor id');
    const reason = String(req.body?.reason ?? '').trim().slice(0, 300);
    if (reason.length < 5) {
      throw httpError(400, 'A suspension reason (at least 5 characters) is required');
    }

    const updated = await withTransaction(async (client) => {
      const { rows: [tutor] } = await client.query(
        `SELECT id, custom_id, name, role, is_verified, suspended_at
           FROM users WHERE id = $1 FOR UPDATE`,
        [tutorId],
      );
      if (!tutor || tutor.role !== 'tutor') throw httpError(404, 'Tutor not found');

      const { rows: [row] } = await client.query(
        `UPDATE users
            SET is_verified = false,
                is_available = false,
                suspended_at = CURRENT_TIMESTAMP,
                suspended_reason = $2,
                token_version = token_version + 1
          WHERE id = $1
          RETURNING id, custom_id, name, is_verified, is_available, suspended_at, suspended_reason, token_version`,
        [tutorId, reason],
      );

      await client.query(
        `INSERT INTO notifications (user_id, title, message, type, priority)
         VALUES ($1, 'Tutor accreditation suspended', $2, 'warning', 'high')`,
        [tutorId, `Your tutor accreditation has been suspended by the administrator. Reason: ${reason}`],
      );

      await audit({
        actorId: req.user.id,
        actorRole: req.user.role,
        action: 'admin.tutor_suspend',
        entity: 'user',
        entityId: tutorId,
        detail: { customId: tutor.custom_id, name: tutor.name, reason },
        ip: requestIp(req),
      }, client);

      return row;
    });

    res.json({ suspended: true, tutor: updated });
  } catch (e) { next(e); }
});

/** POST /admin/tutors/:id/reinstate — restore a suspended tutor's verified status. */
router.post('/admin/tutors/:id/reinstate', requireAuth, requireRole('superadmin'), requireStepUp, async (req, res, next) => {
  try {
    const tutorId = assertUuid(req.params.id, 'tutor id');

    const updated = await withTransaction(async (client) => {
      const { rows: [tutor] } = await client.query(
        `SELECT id, custom_id, name, role FROM users WHERE id = $1 FOR UPDATE`,
        [tutorId],
      );
      if (!tutor || tutor.role !== 'tutor') throw httpError(404, 'Tutor not found');

      const { rows: [row] } = await client.query(
        `UPDATE users
            SET is_verified = true,
                is_available = true,
                suspended_at = NULL,
                suspended_reason = NULL,
                certified_by_id = $2
          WHERE id = $1
          RETURNING id, custom_id, name, is_verified, is_available, suspended_at`,
        [tutorId, req.user.id],
      );

      await client.query(
        `INSERT INTO notifications (user_id, title, message, type, priority)
         VALUES ($1, 'Tutor accreditation reinstated', 'Your tutor accreditation has been restored by the administrator.', 'success', 'high')`,
        [tutorId],
      );

      await audit({
        actorId: req.user.id,
        actorRole: req.user.role,
        action: 'admin.tutor_reinstate',
        entity: 'user',
        entityId: tutorId,
        detail: { customId: tutor.custom_id, name: tutor.name },
        ip: requestIp(req),
      }, client);

      return row;
    });

    res.json({ reinstated: true, tutor: updated });
  } catch (e) { next(e); }
});

/** POST /admin/users/:id/revoke-sessions — emergency kill-switch bumping token_version for any user. */
router.post('/admin/users/:id/revoke-sessions', requireAuth, requireRole('superadmin'), requireStepUp, async (req, res, next) => {
  try {
    const userId = assertUuid(req.params.id, 'user id');
    if (userId === req.user.id) {
      throw httpError(400, 'Use /api/auth/logout-all to revoke your own sessions');
    }
    const reason = String(req.body?.reason ?? '').trim().slice(0, 240) || 'Administrative session revocation';

    const { rows: [row] } = await query(
      `UPDATE users
          SET token_version = token_version + 1
        WHERE id = $1
        RETURNING id, custom_id, name, role, token_version`,
      [userId],
    );
    if (!row) throw httpError(404, 'User not found');

    await audit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'admin.revoke_sessions',
      entity: 'user',
      entityId: userId,
      detail: { targetRole: row.role, customId: row.custom_id, reason, tokenVersion: row.token_version },
      ip: requestIp(req),
    });

    res.json({ revoked: true, userId: row.id, tokenVersion: row.token_version });
  } catch (e) { next(e); }
});

export default router;
