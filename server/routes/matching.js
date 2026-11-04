import express from 'express';
import { query, withTransaction } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { httpError } from '../middleware/errors.js';
import { audit, requestIp } from '../lib/audit.js';

const router = express.Router();

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^(0?[1-9]|1[0-2]):[0-5]\d\s?(AM|PM)$/i;

function timeToMinutes(value) {
  const match = TIME_RE.exec(String(value ?? '').trim());
  if (!match) return null;
  let hour = Number(match[1]) % 12;
  if (/PM/i.test(match[2])) hour += 12;
  return hour * 60 + Number(String(value).match(/:(\d{2})/)[1]);
}
const todayYmd = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const TUTOR_SQL = (orderClause) => `
  SELECT u.id, u.custom_id, u.name, u.program, u.avatar, u.bio, u.is_available,
         u.hourly_rate, u.certified_by_id,
         COALESCE(
           (SELECT json_agg(json_build_object('code', s.code, 'name', s.name, 'department', s.department))
            FROM user_subjects us JOIN subjects s ON s.id = us.subject_id
            WHERE us.user_id = u.id), '[]') AS subjects,
         COALESCE(
           (SELECT json_build_object('sessions', s2.total, 'rating', round(s2.avg_rating::numeric, 1))
            FROM (
              SELECT tutor_id, count(*)::int AS total, COALESCE(avg(rating), 0) AS avg_rating
              FROM sessions
              WHERE status IN ('completed') AND rating IS NOT NULL
              GROUP BY tutor_id
            ) s2 WHERE s2.tutor_id = u.id),
           '{"sessions": 0, "rating": 0}') AS stats,
         (SELECT COALESCE(SUM(amount), 0) FROM points_ledger l WHERE l.user_id = u.id) AS points
  FROM users u
  WHERE u.role = 'tutor' ${orderClause}`;

/** GET /tutors?subject=PROG+201&available=1&q=mark — live tutor directory for the wizard */
router.get('/tutors', requireAuth, async (req, res, next) => {
  try {
    const clauses = [];
    const params = [];
    if (req.query.available === '1' || req.query.available === 'true') clauses.push('u.is_available AND u.is_verified');
    if (req.query.q) { params.push(`%${String(req.query.q).trim()}%`); clauses.push(`(u.name ILIKE $${params.length} OR u.program ILIKE $${params.length})`); }
    if (req.query.subject) {
      params.push(req.query.subject);
      clauses.push(`EXISTS (SELECT 1 FROM user_subjects us JOIN subjects s ON s.id = us.subject_id WHERE us.user_id = u.id AND s.code = $${params.length})`);
    }
    const where = clauses.length ? 'AND ' + clauses.join(' AND ') + ' ' : '';
    const { rows } = await query(TUTOR_SQL(where + 'AND u.is_verified ORDER BY u.name'), params);
    res.json({ tutors: rows });
  } catch (e) { next(e); }
});

/** GET /subjects — subject list for the wizard dropdowns */
router.get('/subjects', requireAuth, async (_req, res, next) => {
  try {
    const { rows } = await query(`SELECT s.id, s.code, s.name, s.department FROM subjects s ORDER BY s.code`);
    res.json({ subjects: rows });
  } catch (e) { next(e); }
});

/** POST /session-requests — learner books a session request; tutor is notified. */
router.post('/session-requests', requireAuth, requireRole('learner'), async (req, res, next) => {
  try {
    const { tutorId, subjectId, topic, preferredDate, preferredTime, note = null, location = 'Library Study Room A' } = req.body ?? {};
    if (!tutorId || !subjectId || !topic || !preferredDate || !preferredTime) {
      throw httpError(400, 'tutorId, subjectId, topic, preferredDate and preferredTime are required');
    }
    const date = String(preferredDate);
    if (!YMD_RE.test(date)) throw httpError(400, 'preferredDate must be YYYY-MM-DD');
    if (date < todayYmd()) throw httpError(400, 'preferredDate cannot be in the past');
    if (!TIME_RE.test(String(preferredTime).trim())) {
      throw httpError(400, 'preferredTime must look like 3:30 PM');
    }
    // tutor must actually teach that subject and still be verified/available
    const { rows: ok } = await query(
      `SELECT 1 FROM user_subjects us JOIN users u ON u.id = us.user_id
        WHERE us.user_id = $1 AND us.subject_id = $2 AND u.is_verified AND u.is_available`, [tutorId, subjectId]);
    if (!ok[0]) throw httpError(409, 'That tutor is not accredited or available for this subject');

    const { rows } = await query(
      `INSERT INTO session_requests (learner_id, tutor_id, subject_id, topic, preferred_date, preferred_time, note, location)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id, status`,
      [req.user.id, tutorId, subjectId, String(topic).slice(0, 120), date, String(preferredTime).slice(0, 20),
        note ? String(note).slice(0, 300) : null, String(location).slice(0, 80)],
    );
    await query(
      `INSERT INTO notifications (user_id, title, message, type)
       SELECT $1, 'New session request', 'Request from ' || $2 || ' — subject ' || s.name, 'info'
       FROM subjects s WHERE s.id = $3`,
      [tutorId, req.user.name, subjectId]).catch(() => {});
    await audit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'session.request',
      entity: 'session_request',
      entityId: rows[0].id,
      detail: { tutorId, subjectId, date, time: preferredTime },
      ip: requestIp(req),
    });
    res.status(201).json({ request: rows[0] });
  } catch (e) {
    if (e.code === '23503') { e.status = 400; e.message = 'Unknown tutor or subject'; }
    next(e);
  }
});

/** GET /session-requests — tutor sees own pending; learner sees own history */
router.get('/session-requests', requireAuth, async (req, res, next) => {
  try {
    const col = req.user.role === 'learner' ? 'sr.learner_id' : req.user.role === 'tutor' ? 'sr.tutor_id' : null;
    if (!col) throw httpError(403, 'Learners and tutors only');
    const { rows } = await query(
      `SELECT sr.*, u.name AS tutor_name, t.name AS learner_name, s.name AS subject, s.code AS subject_code
       FROM session_requests sr
       JOIN users u ON u.id = sr.tutor_id
       JOIN users t ON t.id = sr.learner_id
       JOIN subjects s ON s.id = sr.subject_id
       WHERE ${col} = $1
       ORDER BY sr.created_at DESC`, [req.user.id]);
    res.json({ requests: rows });
  } catch (e) { next(e); }
});

/** POST /session-requests/:id/accept — creates a real session from the request. */
router.post('/session-requests/:id/accept', requireAuth, requireRole('tutor'), async (req, res, next) => {
  try {
    const created = await withTransaction(async (client) => {
      const { rows: reqRows } = await client.query(
        `SELECT sr.*, s.name AS subject_name FROM session_requests sr JOIN subjects s ON s.id = sr.subject_id
         WHERE sr.id = $1 AND sr.tutor_id = $2 FOR UPDATE`,
        [req.params.id, req.user.id]);
      const run = reqRows[0];
      if (!run) throw httpError(404, 'Request not found or not addressed to you');
      if (run.status !== 'pending') throw httpError(409, `Request already ${run.status}`);

      // Serialize accepts per tutor/day so two overlapping (not just identical)
      // slots cannot slip past the overlap check at the same time.
      await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [
        `session-slot:${run.tutor_id}:${run.preferred_date}`,
      ]);

      // Friendly check first; uq_sessions_active_slot is the exact-slot guard.
      const busy = await client.query(
        `SELECT 1 FROM sessions
          WHERE tutor_id = $1 AND date = $2 AND time = $3 AND status IN ('upcoming','in-progress')`,
        [run.tutor_id, run.preferred_date, run.preferred_time]);
      if (busy.rows[0]) throw httpError(409, 'That tutor already has a session at this date and time');

      const requestedStart = timeToMinutes(run.preferred_time);
      if (requestedStart != null) {
        const { rows: sameDay } = await client.query(
          `SELECT time, COALESCE(duration_hours, 1) AS duration_hours FROM sessions
            WHERE tutor_id = $1 AND date = $2 AND status IN ('upcoming','in-progress')`,
          [run.tutor_id, run.preferred_date]);
        const requestedEnd = requestedStart + 60;
        const clash = sameDay.find((session) => {
          const start = timeToMinutes(session.time);
          if (start == null) return false;
          const end = start + Math.max(0.5, Number(session.duration_hours) || 1) * 60;
          return requestedStart < end && start < requestedEnd;
        });
        if (clash) throw httpError(409, 'That tutor already has a session overlapping this time');
      }

      const sessionCode = `SES-${String(Date.now()).slice(-6)}`;
      const { rows } = await client.query(
        `INSERT INTO sessions (session_code, tutor_id, learner_id, subject_id, topic, date, time, duration, duration_hours, status, location)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'1 hr',1,'upcoming',$8) RETURNING *`,
        [sessionCode, run.tutor_id, run.learner_id, run.subject_id, run.topic, run.preferred_date, run.preferred_time, run.location],
      );
      await client.query(
        `UPDATE session_requests SET status = 'accepted', session_id = $1 WHERE id = $2`,
        [rows[0].id, req.params.id]);
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, 'Request accepted', $2, 'success')`,
        [run.learner_id, `${req.user.name} accepted your session request — ${run.subject_name} on ${run.preferred_date}`]);
      await audit({
        actorId: req.user.id,
        actorRole: req.user.role,
        action: 'session.accept_request',
        entity: 'session',
        entityId: rows[0].id,
        detail: { requestId: run.id, learnerId: run.learner_id, date: run.preferred_date, time: run.preferred_time },
        ip: requestIp(req),
      }, client);
      return rows[0];
    });
    res.status(201).json({ session: created });
  } catch (e) {
    if (e.code === '23505') {
      e.status = 409;
      e.message = 'That tutor already has a session at this date and time';
    }
    next(e);
  }
});

/** POST /session-requests/:id/decline */
router.post('/session-requests/:id/decline', requireAuth, requireRole('tutor'), async (req, res, next) => {
  try {
    const { rows } = await query(
      `UPDATE session_requests SET status = 'declined' WHERE id = $1 AND tutor_id = $2 AND status = 'pending' RETURNING id, status`,
      [req.params.id, req.user.id]);
    if (!rows[0]) throw httpError(404, 'No pending request addressed to you');
    await audit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'session.decline_request',
      entity: 'session_request',
      entityId: rows[0].id,
      ip: requestIp(req),
    });
    res.json({ request: rows[0] });
  } catch (e) { next(e); }
});

export default router;
