import express from 'express';
import { query } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { httpError } from '../middleware/errors.js';
import { audit, requestIp } from '../lib/audit.js';

const router = express.Router();
const lastAuditRead = new Map();

/**
 * GET /audit?limit=50&before=<id>
 * Superadmin-only, newest first. The table is append-only at the database
 * level; this endpoint is the read side of that record.
 */
router.get('/audit', requireAuth, requireRole('superadmin'), async (req, res, next) => {
  try {
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const before = req.query.before == null ? null : Number(req.query.before);
    if (before != null && !Number.isFinite(before)) throw httpError(400, 'before must be a numeric audit id');
    const { rows } = await query(
      `SELECT a.id, a.actor_id, a.actor_role, a.action, a.entity, a.entity_id,
              a.detail, a.ip, a.created_at, u.name AS actor_name
         FROM audit_log a
         LEFT JOIN users u ON u.id = a.actor_id
        WHERE ($1::bigint IS NULL OR a.id < $1)
        ORDER BY a.id DESC
        LIMIT $2`,
      [before, limit],
    );
    const now = Date.now();
    if (now - (lastAuditRead.get(req.user.id) || 0) > 60_000) {
      lastAuditRead.set(req.user.id, now);
      audit({
        actorId: req.user.id,
        actorRole: req.user.role,
        action: 'audit.read',
        entity: 'audit_log',
        detail: { limit, before },
        ip: requestIp(req),
      }).catch(() => {});
    }
    res.json({
      entries: rows,
      nextBefore: rows.length === limit ? rows[rows.length - 1].id : null,
    });
  } catch (e) { next(e); }
});

export default router;
