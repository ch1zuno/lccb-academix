import crypto from 'node:crypto';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { query, withTransaction } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { httpError } from '../middleware/errors.js';
import { config } from '../config.js';
import { audit } from '../lib/audit.js';

const router = express.Router();

const tokenLimiter = rateLimit({ windowMs: 60_000, max: 30, message: { error: 'Slow down on token requests' } });

/* ---------- GET /sessions/mine ---------- */
router.get('/sessions/mine', requireAuth, async (req, res, next) => {
  try {
    const status = req.query.status ? String(req.query.status).trim() : null;
    const subject = req.query.subject ? String(req.query.subject).trim() : null;
    const sort = String(req.query.sort || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 60));
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);

    const conditions = ['(s.tutor_id = $1 OR s.learner_id = $1)'];
    const params = [req.user.id];

    if (status && status !== 'all') {
      params.push(status);
      conditions.push(`s.status = $${params.length}`);
    }

    if (subject && subject !== 'all') {
      params.push(subject);
      conditions.push(`(sub.code = $${params.length} OR sub.id::text = $${params.length})`);
    }

    const whereClause = conditions.join(' AND ');
    const orderClause = sort === 'ASC' ? 's.date ASC, s.created_at ASC' : 's.date DESC, s.created_at DESC';

    params.push(limit);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const [sessionsResult, subjectsResult] = await Promise.all([
      query(
        `SELECT s.id, s.session_code, s.topic, s.date, s.time, s.duration, s.duration_hours, s.status, s.location,
                s.started_at, s.ended_at, s.actual_duration_seconds,
                s.tutor_id, s.learner_id, u1.custom_id AS tutor_custom_id, u2.custom_id AS learner_custom_id,
                u1.name AS tutor_name, u2.name AS learner_name, sub.name AS subject, sub.code AS subject_code,
                CASE WHEN EXISTS(SELECT 1 FROM user_avatars ua WHERE ua.user_id = u1.id)
                     THEN '/api/users/' || u1.id || '/avatar'
                     ELSE u1.avatar
                END AS tutor_avatar,
                CASE WHEN EXISTS(SELECT 1 FROM user_avatars ua WHERE ua.user_id = u2.id)
                     THEN '/api/users/' || u2.id || '/avatar'
                     ELSE u2.avatar
                END AS learner_avatar,
                s.rating, s.notes,
                (SELECT count(*) FROM session_check_ins c WHERE c.session_id = s.id) AS check_in_count,
                count(*) OVER()::int AS total_count
           FROM sessions s
           JOIN users u1 ON u1.id = s.tutor_id
           JOIN users u2 ON u2.id = s.learner_id
           JOIN subjects sub ON sub.id = s.subject_id
          WHERE ${whereClause}
          ORDER BY ${orderClause}
          LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        params
      ),
      query(
        `SELECT DISTINCT sub.code, sub.name
           FROM sessions s
           JOIN subjects sub ON sub.id = s.subject_id
          WHERE s.tutor_id = $1 OR s.learner_id = $1
          ORDER BY sub.code`,
        [req.user.id]
      ),
    ]);

    const rows = sessionsResult.rows;
    const total = rows[0]?.total_count ?? (offset === 0 ? rows.length : 0);
    const hasMore = (offset + rows.length) < total;

    res.json({
      sessions: rows,
      total,
      hasMore,
      subjects: subjectsResult.rows,
    });
  } catch (e) { next(e); }
});

/* ---------- POST /sessions/:id/stage-token (tutor, 10 min TTL, one active token) ---------- */
router.post('/sessions/:id/stage-token', requireAuth, requireRole('tutor'), tokenLimiter, async (req, res, next) => {
  try {
    const method = req.body?.method ?? 'otp';
    if (typeof method !== 'string' || !['qr', 'otp', 'fingerprint'].includes(method)) {
      throw httpError(400, 'method must be qr | otp | fingerprint');
    }
    const { rows } = await query(
      `SELECT id FROM sessions WHERE id = $1 AND tutor_id = $2 AND status = 'upcoming' LIMIT 1`,
      [req.params.id, req.user.id]);
    if (!rows[0]) throw httpError(404, 'No upcoming session found for this tutor');

    // Replace any still-unused token for this session
    await query(`UPDATE check_in_tokens SET used_at = CURRENT_TIMESTAMP
                 WHERE session_id = $1 AND used_at IS NULL`, [rows[0].id]);

    const tokenStr = method === 'fingerprint'
      ? `fp-${crypto.randomUUID().slice(0, 10)}`
      : `${Math.floor(100000 + Math.random() * 900000)}-${Math.floor(100000 + Math.random() * 900000)}`;

    await query(
      `INSERT INTO check_in_tokens (session_id, token, method, expires_at)
       VALUES ($1, $2, $3, now() + interval '10 minutes')`,
      [rows[0].id, tokenStr, method],
    );
    res.json({ session: rows[0].id, token: tokenStr, method, expiresIn: 600 });
  } catch (e) { next(e); }
});

/* ---------- POST /sessions/:id/check-in (learner or tutor presents token) ---------- */
router.post('/sessions/:id/check-in', requireAuth, tokenLimiter, async (req, res, next) => {
  try {
    const tokenStr = String(req.body?.token ?? '').trim();
    const method = typeof req.body?.method === 'string' ? req.body.method : 'otp';
    if (!tokenStr) throw httpError(400, 'token is required');

    const { rows } = await query(
      `SELECT t.id AS token_id, s.id, s.learner_id, s.tutor_id, s.status
       FROM check_in_tokens t
       JOIN sessions s ON s.id = t.session_id
       WHERE t.token = $1 AND t.session_id = $2 AND t.used_at IS NULL AND t.expires_at > now()`,
      [tokenStr, req.params.id]);
    const row = rows[0];
    if (!row) throw httpError(400, 'Invalid or expired token');
    if (req.user.id !== row.learner_id && req.user.id !== row.tutor_id) throw httpError(403, 'Not your session');
    if (row.status !== 'upcoming') throw httpError(409, 'This session is no longer open for check-in');

    const counted = await withTransaction(async (client) => {
      // Serialize against cancellation so a cancelled session can never take a
      // new check-in between the status read above and this insert.
      const locked = await client.query(
        `SELECT status FROM sessions WHERE id = $1 FOR UPDATE`, [row.id]);
      if (locked.rows[0]?.status !== 'upcoming') {
        throw httpError(409, 'This session is no longer open for check-in');
      }
      await client.query(`UPDATE check_in_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = $1`, [row.token_id]);
      // one check-in per user per session (guarded insert)
      const ins = await client.query(
        `INSERT INTO session_check_ins (session_id, user_id, method)
         SELECT $1, $2, $3
         WHERE NOT EXISTS (SELECT 1 FROM session_check_ins WHERE session_id = $1 AND user_id = $2)
         RETURNING id`,
        [row.id, req.user.id, ['qr', 'otp', 'fingerprint'].includes(method) ? method : 'otp'],
      );
      const { rows: c } = await client.query(
        `SELECT count(*)::int AS confirmations FROM session_check_ins c
         JOIN users u ON u.id = c.user_id
         WHERE c.session_id = $1`, [row.id]);
      if (c[0].confirmations >= 2) {
        await client.query(`UPDATE sessions SET status = 'in-progress', started_at = COALESCE(started_at, CURRENT_TIMESTAMP) WHERE id = $1 AND status = 'upcoming'`, [row.id]);
      }
      return { insertTwice: ins.rows.length === 0, confirmations: c[0].confirmations };
    });
    res.json({
      checkedIn: !counted.insertTwice,
      confirmations: counted.confirmations,
      sessionStarted: counted.confirmations >= 2,
    });
  } catch (e) { next(e); }
});

/* ---------- POST /sessions/:id/cancel (participant, upcoming only) ---------- */
router.post('/sessions/:id/cancel', requireAuth, async (req, res, next) => {
  try {
    const reason = String(req.body?.reason ?? '').trim().slice(0, 240) || null;
    const result = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `SELECT s.id, s.session_code, s.learner_id, s.tutor_id, s.status, sub.name AS subject
           FROM sessions s JOIN subjects sub ON sub.id = s.subject_id
          WHERE s.id = $1 FOR UPDATE`,
        [req.params.id],
      );
      const session = rows[0];
      if (!session) throw httpError(404, 'Session not found');
      if (req.user.id !== session.learner_id && req.user.id !== session.tutor_id) {
        throw httpError(403, 'Not your session');
      }
      if (session.status !== 'upcoming') {
        throw httpError(409, 'Only an upcoming session can be cancelled');
      }
      await client.query(
        `UPDATE sessions SET status = 'cancelled', cancel_reason = $2 WHERE id = $1`,
        [session.id, reason],
      );
      const otherId = req.user.id === session.learner_id ? session.tutor_id : session.learner_id;
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES ($1, 'Session cancelled', $2, 'warning')`,
        [otherId, `${req.user.name} cancelled ${session.session_code} (${session.subject})${reason ? ` — ${reason}` : ''}`],
      );
      return session;
    });

    await audit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'session.cancel',
      entity: 'session',
      entityId: result.id,
      detail: { code: result.session_code, reason },
    });
    res.json({ session: { id: result.id, status: 'cancelled' } });
  } catch (e) { next(e); }
});



/* ================= Biometric device endpoints (X-Device-Key) ================= */

function requireDeviceKey(req, res, next) {
  if ((req.header('X-Device-Key') || '') !== config.deviceApiKey) {
    return next(httpError(401, 'Invalid device key'));
  }
  next();
}

/** POST /device/import-roster  — CSV `fingerprint_id,name` per line binds reader IDs to users. */
router.post('/device/import-roster', requireDeviceKey, async (req, res, next) => {
  try {
    const csv = String(req.body?.csv ?? '');
    if (!csv.trim()) throw httpError(400, `csv body required, one row per line: fingerprint_id,name`);
    let imported = 0; const failed = [];
    for (const line of csv.split(/\r?\n/)) {
      if (!line.trim()) continue;
      const [fpr, name] = line.split(',').map(s => s.trim());
      if (!fpr || !name) { failed.push(line); continue; }
      const { rows: u } = await query(
        `SELECT id FROM users WHERE name ILIKE $1 OR custom_id ILIKE $1 LIMIT 1`, [name]);
      if (!u[0]) { failed.push(name); continue; }
      await query(
        `INSERT INTO device_fingerprints (fingerprint_id, user_id)
         VALUES ($1, $2)
         ON CONFLICT (fingerprint_id) DO UPDATE SET user_id = EXCLUDED.user_id`,
        [fpr, u[0].id]);
      imported++;
    }
    res.json({ imported, failed });
  } catch (e) { next(e); }
});

/** GET /device/roster — the imported mapping for file check-out */
router.get('/device/roster', requireDeviceKey, async (_req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT f.fingerprint_id, f.user_id, u.custom_id, u.name, f.enrolled_at
       FROM device_fingerprints f JOIN users u ON u.id = f.user_id ORDER BY f.enrolled_at`);
    res.json({ roster: rows });
  } catch (e) { next(e); }
});

/** POST /device/verify — reader reports a fingerprint: resolve user, log check-in. */
router.post('/device/verify', requireDeviceKey, async (req, res, next) => {
  try {
    const fpr = String(req.body?.fingerprint_id ?? '').trim();
    if (!fpr) throw httpError(400, 'fingerprint_id required');
    const { rows } = await query(
      `SELECT u.id AS user_id, u.name, u.role,
              s.id AS session_id, s.session_code, s.topic, sub.name AS subject, s.status AS session_status
       FROM device_fingerprints d
       JOIN users u ON u.id = d.user_id
       LEFT JOIN sessions s
         ON s.status IN ('upcoming','in-progress') AND (s.learner_id = u.id OR s.tutor_id = u.id)
       LEFT JOIN subjects sub ON sub.id = s.subject_id
       WHERE d.fingerprint_id = $1
       ORDER BY s.date NULLS LAST
       LIMIT 1`, [fpr]);
    if (!rows[0]) throw httpError(404, 'Fingerprint not enrolled');
    const r = rows[0];
    if (!r.session_id) {
      return res.json({ user: { id: r.user_id, name: r.name, role: r.role }, session: null });
    }
    const count = await withTransaction(async (client) => {
      const locked = await client.query(
        `SELECT status FROM sessions WHERE id = $1 FOR UPDATE`, [r.session_id]);
      if (locked.rows[0]?.status !== 'upcoming') {
        throw httpError(409, 'This session is no longer open for check-in');
      }
      await client.query(
        `INSERT INTO session_check_ins (session_id, user_id, method)
         SELECT $1, $2, 'fingerprint'
         WHERE NOT EXISTS (SELECT 1 FROM session_check_ins WHERE session_id = $1 AND user_id = $2)`,
        [r.session_id, r.user_id]);
      const { rows: c } = await client.query(
        `SELECT count(*)::int AS confirmations FROM session_check_ins WHERE session_id = $1`, [r.session_id]);
      if (c[0].confirmations >= 2) {
        await client.query(`UPDATE sessions SET status = 'in-progress', started_at = COALESCE(started_at, CURRENT_TIMESTAMP) WHERE id = $1 AND status = 'upcoming'`, [r.session_id]);
      }
      return c[0];
    });
    res.json({ user: { id: r.user_id, name: r.name, role: r.role }, session: r, confirmations: count.confirmations });
  } catch (e) { next(e); }
});

export default router;
