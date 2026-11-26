import crypto from 'node:crypto';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { query, withTransaction } from '../db.js';
import { requireAuth, requireVerifiedTutor } from '../middleware/auth.js';
import { httpError } from '../middleware/errors.js';
import { config } from '../config.js';
import { audit, requestIp } from '../lib/audit.js';
import {
  ONLINE_LOCATION,
  UUID_RE,
  formatDurationLabel,
  formatModeLabel,
  pgDateToYmd,
  parseDurationHours,
  validateDateAndTime,
  resolveApprovedVenue,
  checkTutorAvailabilityWindow,
  assertNoSlotConflicts,
} from '../lib/booking.js';
import {
  ensureFreshLifecycle,
  manilaTodayYmd,
  computeSessionCutoff,
} from '../lib/sessionLifecycle.js';
import {
  publishRoomEvent,
  getRoomPresenceStats,
  clearRoomPresence,
} from '../lib/realtimeEvents.js';
import { settleSessionRow } from '../lib/sessionSettlement.js';

const router = express.Router();

const tokenLimiter = rateLimit({ windowMs: 60_000, max: 30, message: { error: 'Slow down on token requests' } });

export function generateCheckInToken(method = 'otp') {
  if (method === 'fingerprint') {
    return `fp-${crypto.randomBytes(6).toString('hex')}`;
  }
  return `${crypto.randomInt(100000, 1000000)}-${crypto.randomInt(100000, 1000000)}`;
}

export function normalizeCheckInToken(raw) {
  const trimmed = String(raw ?? '').trim();
  const digitsMatch = /^(\d{6})[\s-]?(\d{6})$/.exec(trimmed);
  return digitsMatch ? `${digitsMatch[1]}-${digitsMatch[2]}` : trimmed;
}

export function isValidDeviceKey(provided, expected) {
  if (!provided || !expected) return false;
  const a = crypto.createHash('sha256').update(String(provided)).digest();
  const b = crypto.createHash('sha256').update(String(expected)).digest();
  return crypto.timingSafeEqual(a, b);
}

const SESSION_SELECT_COLUMNS = `
  s.id, s.session_code, s.topic, s.date, s.time, s.duration, s.duration_hours, s.status,
  s.mode, s.venue_id, s.location, s.language, s.is_now, s.cutoff_at,
  s.ended_by, s.ended_reason, s.needs_faculty_review, s.points_posted, s.both_present_seconds,
  v.name AS venue_name, v.building AS venue_building, v.room AS venue_room,
  s.started_at, s.ended_at, s.actual_duration_seconds,
  s.tutor_id, s.learner_id, u1.custom_id AS tutor_custom_id, u2.custom_id AS learner_custom_id,
  u1.name AS tutor_name, u2.name AS learner_name, sub.name AS subject, sub.code AS subject_code,
  COALESCE(
    (SELECT ua.r2_url FROM user_avatars ua WHERE ua.user_id = u1.id AND ua.r2_url IS NOT NULL),
    CASE WHEN EXISTS(SELECT 1 FROM user_avatars ua WHERE ua.user_id = u1.id)
         THEN '/api/users/' || u1.id || '/avatar'
         ELSE u1.avatar
    END
  ) AS tutor_avatar,
  COALESCE(
    (SELECT ua.r2_url FROM user_avatars ua WHERE ua.user_id = u2.id AND ua.r2_url IS NOT NULL),
    CASE WHEN EXISTS(SELECT 1 FROM user_avatars ua WHERE ua.user_id = u2.id)
         THEN '/api/users/' || u2.id || '/avatar'
         ELSE u2.avatar
    END
  ) AS learner_avatar,
  s.rating, s.notes,
  (SELECT count(*)::int FROM session_check_ins c WHERE c.session_id = s.id) AS check_in_count
`;

/* ---------- GET /sessions/mine ---------- */
router.get('/sessions/mine', requireAuth, async (req, res, next) => {
  try {
    const scope = req.query.scope ? String(req.query.scope).trim().toLowerCase() : null;
    await ensureFreshLifecycle({ force: scope === 'checkin' });

    const status = req.query.status ? String(req.query.status).trim() : null;
    const subject = req.query.subject ? String(req.query.subject).trim() : null;
    const sort = String(req.query.sort || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 60));
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);

    const conditions = ['(s.tutor_id = $1 OR s.learner_id = $1)'];
    const params = [req.user.id];

    if (scope === 'checkin') {
      // Check-in tab ONLY shows upcoming and in-progress sessions for today (Asia/Manila),
      // plus any live midnight-grace Now session still before its cutoff.
      params.push(manilaTodayYmd());
      conditions.push(`s.status IN ('upcoming', 'in-progress')`);
      conditions.push(
        `(s.date = $${params.length}::date OR (s.is_now = true AND s.status = 'in-progress' AND COALESCE(s.cutoff_at, ((s.date + 1)::timestamp AT TIME ZONE 'Asia/Manila')) > CURRENT_TIMESTAMP))`,
      );
    } else if (status && status !== 'all') {
      params.push(status);
      conditions.push(`s.status = $${params.length}`);
    }

    if (subject && subject !== 'all') {
      params.push(subject);
      conditions.push(`(sub.code = $${params.length} OR sub.id::text = $${params.length})`);
    }

    const whereClause = conditions.join(' AND ');
    const orderClause = scope === 'checkin'
      ? `(s.status = 'in-progress') DESC, s.date ASC, s.created_at ASC`
      : sort === 'ASC' ? 's.date ASC, s.created_at ASC' : 's.date DESC, s.created_at DESC';

    params.push(limit);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const [sessionsResult, subjectsResult, nextUpcomingResult] = await Promise.all([
      query(
        `SELECT ${SESSION_SELECT_COLUMNS},
                EXISTS(SELECT 1 FROM session_check_ins c WHERE c.session_id = s.id AND c.user_id = $1) AS my_checked_in,
                count(*) OVER()::int AS total_count
           FROM sessions s
           JOIN users u1 ON u1.id = s.tutor_id
           JOIN users u2 ON u2.id = s.learner_id
           JOIN subjects sub ON sub.id = s.subject_id
           LEFT JOIN campus_venues v ON v.id = s.venue_id
          WHERE ${whereClause}
          ORDER BY ${orderClause}
          LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        params,
      ),
      query(
        `SELECT DISTINCT sub.code, sub.name
           FROM sessions s
           JOIN subjects sub ON sub.id = s.subject_id
          WHERE s.tutor_id = $1 OR s.learner_id = $1
          ORDER BY sub.code`,
        [req.user.id],
      ),
      scope === 'checkin'
        ? query(
          `SELECT s.id, s.session_code, s.date, s.time, s.mode, sub.name AS subject, sub.code AS subject_code
             FROM sessions s
             JOIN subjects sub ON sub.id = s.subject_id
            WHERE (s.tutor_id = $1 OR s.learner_id = $1)
              AND s.status = 'upcoming'
              AND s.date > $2::date
            ORDER BY s.date ASC, s.created_at ASC
            LIMIT 1`,
          [req.user.id, manilaTodayYmd()],
        )
        : Promise.resolve({ rows: [] }),
    ]);

    const rows = sessionsResult.rows;
    const total = rows[0]?.total_count ?? (offset === 0 ? rows.length : 0);
    const hasMore = (offset + rows.length) < total;

    res.json({
      sessions: rows,
      total,
      hasMore,
      subjects: subjectsResult.rows,
      ...(scope === 'checkin' ? { nextUpcoming: nextUpcomingResult.rows[0] ?? null } : {}),
    });
  } catch (e) { next(e); }
});

/* ---------- GET /sessions/:id (participant or superadmin room access check) ---------- */
router.get('/sessions/:id', requireAuth, async (req, res, next) => {
  try {
    await ensureFreshLifecycle({ force: true });
    const rawId = String(req.params.id ?? '').trim();
    const isUuid = UUID_RE.test(rawId);

    const { rows } = await query(
      `SELECT ${SESSION_SELECT_COLUMNS},
              EXISTS(SELECT 1 FROM session_check_ins c WHERE c.session_id = s.id AND c.user_id = $2) AS my_checked_in
         FROM sessions s
         JOIN users u1 ON u1.id = s.tutor_id
         JOIN users u2 ON u2.id = s.learner_id
         JOIN subjects sub ON sub.id = s.subject_id
         LEFT JOIN campus_venues v ON v.id = s.venue_id
        WHERE ${isUuid ? 's.id = $1' : 's.session_code = $1'}
        LIMIT 1`,
      [rawId, req.user.id],
    );

    const session = rows[0];
    if (!session) throw httpError(404, 'Session not found');

    const isParticipant = session.tutor_id === req.user.id || session.learner_id === req.user.id;
    if (!isParticipant && req.user.role !== 'superadmin') {
      throw httpError(403, 'You are not assigned to this session');
    }

    res.json({ session });
  } catch (e) { next(e); }
});

/* ---------- POST /sessions/:id/end (tutor-only for Online sessions, idempotent) ---------- */
router.post('/sessions/:id/end', requireAuth, async (req, res, next) => {
  try {
    await ensureFreshLifecycle({ force: true });
    const sessionId = String(req.params.id ?? '').trim();
    if (!UUID_RE.test(sessionId)) throw httpError(400, 'Invalid session id');

    const notes = req.body?.notes !== undefined
      ? (String(req.body.notes ?? '').trim().slice(0, 500) || null)
      : undefined;

    let broadcastPayload = null;
    let broadcastKeys = [];

    const result = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `SELECT * FROM sessions WHERE id = $1 FOR UPDATE`,
        [sessionId],
      );
      const session = rows[0];
      if (!session) throw httpError(404, 'Session not found');

      // Strict server enforcement: ONLY the assigned tutor of this session may end it.
      if (req.user.id !== session.tutor_id) {
        throw httpError(403, 'Only the assigned tutor can end this Online session');
      }

      if (session.mode !== 'online') {
        throw httpError(409, 'Face to Face sessions use the wrap-up flow to finish');
      }

      // Idempotent: double-clicks or two tabs never re-run settlement or double-post points.
      if (session.status === 'completed' || session.status === 'auto-closed') {
        return {
          alreadyEnded: true,
          session,
          actualDurationSeconds: Number(session.actual_duration_seconds) || 0,
          points: 0,
          learnerPoints: 0,
          pointsPosted: Boolean(session.points_posted),
          needsFacultyReview: Boolean(session.needs_faculty_review),
        };
      }

      if (session.status !== 'in-progress') {
        throw httpError(409, `Cannot end a session with status "${session.status}"`);
      }

      const presenceStats = getRoomPresenceStats(session.id);
      const settled = await settleSessionRow(client, session, {
        targetStatus: 'completed',
        endedBy: 'tutor',
        endedReason: 'tutor_ended',
        notes,
        presenceStats,
        actorId: req.user.id,
        actorRole: req.user.role,
        ip: requestIp(req),
        auditAction: 'session.end',
      });

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

      return { alreadyEnded: false, ...settled };
    });

    if (broadcastPayload) {
      clearRoomPresence(sessionId);
      await publishRoomEvent(broadcastKeys, broadcastPayload);
    }

    res.json(result);
  } catch (e) { next(e); }
});

/* ---------- POST /sessions/:id/stage-token (verified tutor/faculty, 10 min TTL, one active token) ---------- */
router.post('/sessions/:id/stage-token', requireAuth, requireVerifiedTutor({ allowFaculty: true }), tokenLimiter, async (req, res, next) => {
  try {
    const sessionId = String(req.params.id ?? '').trim();
    if (!UUID_RE.test(sessionId)) throw httpError(400, 'Invalid session id');
    await ensureFreshLifecycle({ force: true });
    const method = req.body?.method ?? 'otp';
    if (typeof method !== 'string' || !['qr', 'otp', 'fingerprint'].includes(method)) {
      throw httpError(400, 'method must be qr | otp | fingerprint');
    }
    const { rows } = await query(
      `SELECT id FROM sessions WHERE id = $1 AND tutor_id = $2 AND status = 'upcoming' LIMIT 1`,
      [sessionId, req.user.id],
    );
    if (!rows[0]) throw httpError(404, 'No upcoming session found for this tutor');

    await query(
      `UPDATE check_in_tokens SET used_at = CURRENT_TIMESTAMP
        WHERE session_id = $1 AND used_at IS NULL`,
      [rows[0].id],
    );

    const tokenStr = generateCheckInToken(method);

    await query(
      `INSERT INTO check_in_tokens (session_id, token, method, expires_at, created_by)
       VALUES ($1, $2, $3, now() + interval '10 minutes', $4)`,
      [rows[0].id, tokenStr, method, req.user.id],
    );
    res.json({ session: rows[0].id, token: tokenStr, method, expiresIn: 600 });
  } catch (e) { next(e); }
});

/* ---------- POST /sessions/:id/check-in (learner or tutor presents shared token) ---------- */
router.post('/sessions/:id/check-in', requireAuth, tokenLimiter, async (req, res, next) => {
  try {
    const sessionId = String(req.params.id ?? '').trim();
    if (!UUID_RE.test(sessionId)) throw httpError(400, 'Invalid session id');
    await ensureFreshLifecycle({ force: true });
    const tokenStr = normalizeCheckInToken(req.body?.token);
    const method = typeof req.body?.method === 'string' ? req.body.method : 'otp';
    if (!tokenStr) throw httpError(400, 'token is required');

    const safeMethod = ['qr', 'otp', 'fingerprint'].includes(method) ? method : 'otp';
    const clientIp = requestIp(req);
    const clientUa = String(req.get('user-agent') || '').slice(0, 120);

    const counted = await withTransaction(async (client) => {
      const { rows: sessRows } = await client.query(
        `SELECT id, session_code, learner_id, tutor_id, status, mode, date, is_now, duration_hours
           FROM sessions WHERE id = $1 FOR UPDATE`,
        [sessionId],
      );
      const session = sessRows[0];
      if (!session) throw httpError(400, 'Invalid or expired token');
      if (req.user.id !== session.learner_id && req.user.id !== session.tutor_id) {
        throw httpError(403, 'Not your session');
      }
      if (session.status !== 'upcoming') {
        throw httpError(409, 'This session is no longer open for check-in');
      }

      const { rows: tokRows } = await client.query(
        `SELECT id AS token_id
           FROM check_in_tokens
          WHERE token = $1 AND session_id = $2 AND used_at IS NULL AND expires_at > now()
          LIMIT 1`,
        [tokenStr, session.id],
      );
      const tok = tokRows[0];
      if (!tok) throw httpError(400, 'Invalid or expired token');

      const { rows: already } = await client.query(
        `SELECT 1 FROM session_check_ins WHERE session_id = $1 AND user_id = $2 LIMIT 1`,
        [session.id, req.user.id],
      );
      if (already[0]) {
        throw httpError(409, 'You have already checked in — waiting for your partner');
      }

      await client.query(
        `INSERT INTO session_check_ins (session_id, user_id, method)
         VALUES ($1, $2, $3)`,
        [session.id, req.user.id, safeMethod],
      );

      const { rows: c } = await client.query(
        `SELECT count(DISTINCT c.user_id)::int AS confirmations
           FROM session_check_ins c
          WHERE c.session_id = $1`,
        [session.id],
      );
      const confirmations = c[0].confirmations;

      let startedAtIso = null;
      if (confirmations >= 2) {
        // Retire the shared code once both devices have verified.
        await client.query(
          `UPDATE check_in_tokens SET used_at = CURRENT_TIMESTAMP
            WHERE session_id = $1 AND used_at IS NULL`,
          [session.id],
        );
        const startedNow = new Date();
        startedAtIso = startedNow.toISOString();
        const cutoff = computeSessionCutoff({
          date: session.date,
          isNow: Boolean(session.is_now),
          startedAt: startedNow,
          durationHours: session.duration_hours,
        });
        await client.query(
          `UPDATE sessions
              SET status = 'in-progress',
                  started_at = COALESCE(started_at, $2::timestamptz),
                  cutoff_at = $3::timestamptz
            WHERE id = $1 AND status = 'upcoming'`,
          [session.id, startedAtIso, cutoff.toISOString()],
        );
      }

      const { rows: prior } = await client.query(
        `SELECT ip, detail->>'ua' AS ua FROM audit_log
          WHERE action = 'session.check_in' AND entity_id = $1 AND actor_id <> $2
          ORDER BY created_at DESC LIMIT 1`,
        [session.id, req.user.id],
      );
      const sameClientHint = Boolean(prior[0] && prior[0].ip === clientIp && prior[0].ua && prior[0].ua === clientUa);
      await audit({
        actorId: req.user.id,
        actorRole: req.user.role,
        action: 'session.check_in',
        entity: 'session',
        entityId: session.id,
        detail: { mode: session.mode || 'online', method: safeMethod, confirmations, ua: clientUa, sameClientHint },
        ip: clientIp,
      }, client);

      return {
        session,
        confirmations,
        startedAtIso,
      };
    });

    if (counted.confirmations >= 2) {
      await publishRoomEvent([counted.session.id, counted.session.session_code], {
        type: 'session.started',
        sessionId: counted.session.id,
        mode: counted.session.mode || 'online',
        startedAt: counted.startedAtIso,
      });
    }

    res.json({
      checkedIn: true,
      confirmations: counted.confirmations,
      sessionStarted: counted.confirmations >= 2,
    });
  } catch (e) { next(e); }
});

/* ---------- PATCH /sessions/:id/reschedule (participant, upcoming only) ---------- */
router.patch('/sessions/:id/reschedule', requireAuth, async (req, res, next) => {
  try {
    const sessionId = String(req.params.id ?? '').trim();
    if (!UUID_RE.test(sessionId)) throw httpError(400, 'Invalid session id');
    await ensureFreshLifecycle({ force: true });
    const reason = String(req.body?.reason ?? '').trim().slice(0, 200) || null;
    const updated = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `SELECT s.id, s.session_code, s.learner_id, s.tutor_id, s.status, s.mode,
                s.venue_id, s.location, s.date, s.time, s.duration_hours, sub.name AS subject
           FROM sessions s
           JOIN subjects sub ON sub.id = s.subject_id
          WHERE s.id = $1 FOR UPDATE`,
        [sessionId],
      );
      const session = rows[0];
      if (!session) throw httpError(404, 'Session not found');
      if (req.user.id !== session.learner_id && req.user.id !== session.tutor_id) {
        throw httpError(403, 'Not your session');
      }
      if (session.status !== 'upcoming') {
        throw httpError(409, 'Only an upcoming session can be rescheduled');
      }

      const curDate = pgDateToYmd(session.date);
      const { date, time, startMinutes } = validateDateAndTime(
        req.body?.date ?? curDate,
        req.body?.time ?? session.time,
      );
      const durationHours = parseDurationHours(req.body?.durationHours, {
        defaultHours: Number(session.duration_hours) || 1,
      });

      const mode = session.mode || 'online';
      let venueId = null;
      let location = ONLINE_LOCATION;
      if (mode === 'face_to_face') {
        const venue = await resolveApprovedVenue(client, req.body?.venueId ?? session.venue_id);
        venueId = venue.id;
        location = venue.name;
      }

      const avail = await checkTutorAvailabilityWindow(client, session.tutor_id, date, startMinutes, durationHours);
      if (!avail.ok) throw httpError(409, avail.reason);

      await assertNoSlotConflicts(client, {
        tutorId: session.tutor_id,
        venueId,
        mode,
        date,
        startMinutes,
        durationHours,
        excludeSessionId: session.id,
      });

      const cutoff = computeSessionCutoff({ date, isNow: false, durationHours });
      const { rows: saved } = await client.query(
        `UPDATE sessions
            SET date = $1,
                time = $2,
                duration = $3,
                duration_hours = $4,
                venue_id = $5,
                location = $6,
                is_now = false,
                cutoff_at = $7::timestamptz
          WHERE id = $8
          RETURNING *`,
        [date, time, formatDurationLabel(durationHours), durationHours, venueId, location, cutoff.toISOString(), session.id],
      );

      const otherId = req.user.id === session.learner_id ? session.tutor_id : session.learner_id;
      const modeLabel = formatModeLabel(mode);
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES ($1, $2, $3, 'info')`,
        [
          otherId,
          `${modeLabel} session rescheduled`,
          `${req.user.name} rescheduled ${session.session_code} (${session.subject} · ${modeLabel}) to ${date} at ${time} (${location})${reason ? ` — ${reason}` : ''}.`,
        ],
      );
      await audit({
        actorId: req.user.id,
        actorRole: req.user.role,
        action: 'session.reschedule',
        entity: 'session',
        entityId: session.id,
        detail: {
          code: session.session_code,
          mode,
          from: { date: curDate, time: session.time, venueId: session.venue_id },
          to: { date, time, venueId, durationHours },
          reason,
        },
        ip: requestIp(req),
      }, client);
      return saved[0];
    });
    res.json({ session: updated });
  } catch (e) {
    if (e.code === '23505') {
      e.status = 409;
      e.message = /venue/i.test(e.constraint || '')
        ? 'That campus venue is already booked at this date and time'
        : 'That tutor already has a session at this date and time';
    }
    next(e);
  }
});

/* ---------- POST /sessions/:id/cancel (participant, upcoming only) ---------- */
router.post('/sessions/:id/cancel', requireAuth, async (req, res, next) => {
  try {
    const sessionId = String(req.params.id ?? '').trim();
    if (!UUID_RE.test(sessionId)) throw httpError(400, 'Invalid session id');
    await ensureFreshLifecycle({ force: true });
    const reason = String(req.body?.reason ?? '').trim().slice(0, 240) || null;
    const result = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `SELECT s.id, s.session_code, s.learner_id, s.tutor_id, s.status, s.mode, s.location, sub.name AS subject
           FROM sessions s JOIN subjects sub ON sub.id = s.subject_id
          WHERE s.id = $1 FOR UPDATE`,
        [sessionId],
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
        `UPDATE sessions
            SET status = 'cancelled',
                cancel_reason = $2,
                ended_by = 'participant',
                ended_reason = 'cancelled',
                ended_at = CURRENT_TIMESTAMP
          WHERE id = $1`,
        [session.id, reason],
      );
      const otherId = req.user.id === session.learner_id ? session.tutor_id : session.learner_id;
      const modeLabel = formatModeLabel(session.mode);
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES ($1, $2, $3, 'warning')`,
        [
          otherId,
          `${modeLabel} session cancelled`,
          `${req.user.name} cancelled ${session.session_code} (${session.subject} · ${modeLabel} · ${session.location})${reason ? ` — ${reason}` : ''}`,
        ],
      );
      return session;
    });

    await audit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'session.cancel',
      entity: 'session',
      entityId: result.id,
      detail: { code: result.session_code, mode: result.mode, reason },
      ip: requestIp(req),
    });
    res.json({ session: { id: result.id, status: 'cancelled' } });
  } catch (e) { next(e); }
});

/* ================= Biometric device endpoints (X-Device-Key) ================= */

function requireDeviceKey(req, res, next) {
  if (!config.deviceApiKey) {
    return next(httpError(503, 'Biometric device API is not configured'));
  }
  if (!isValidDeviceKey(req.header('X-Device-Key') || '', config.deviceApiKey)) {
    return next(httpError(401, 'Invalid device key'));
  }
  next();
}

/** POST /device/import-roster — CSV `fingerprint_id,name` per line binds reader IDs to users. */
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
    await ensureFreshLifecycle();
    const { rows } = await query(
      `SELECT f.fingerprint_id, f.user_id, u.custom_id, u.name, f.enrolled_at
       FROM device_fingerprints f JOIN users u ON u.id = f.user_id ORDER BY f.enrolled_at`);
    res.json({ roster: rows });
  } catch (e) { next(e); }
});

/** POST /device/verify — reader reports a fingerprint: resolve user, log check-in (today only, never stale). */
router.post('/device/verify', requireDeviceKey, async (req, res, next) => {
  try {
    await ensureFreshLifecycle({ force: true });
    const fpr = String(req.body?.fingerprint_id ?? '').trim();
    if (!fpr) throw httpError(400, 'fingerprint_id required');
    const todayManila = manilaTodayYmd();
    const { rows } = await query(
      `SELECT u.id AS user_id, u.name, u.role,
              s.id AS session_id, s.session_code, s.topic, s.mode AS session_mode, sub.name AS subject, s.status AS session_status
       FROM device_fingerprints d
       JOIN users u ON u.id = d.user_id
       LEFT JOIN sessions s
         ON s.status IN ('upcoming','in-progress')
        AND (s.date = $2::date OR (s.is_now = true AND s.status = 'in-progress'))
        AND (s.learner_id = u.id OR s.tutor_id = u.id)
       LEFT JOIN subjects sub ON sub.id = s.subject_id
       WHERE d.fingerprint_id = $1
       ORDER BY (s.mode = 'face_to_face') DESC NULLS LAST, s.date NULLS LAST
       LIMIT 1`,
      [fpr, todayManila],
    );
    if (!rows[0]) throw httpError(404, 'Fingerprint not enrolled');
    const r = rows[0];
    if (!r.session_id) {
      return res.json({ user: { id: r.user_id, name: r.name, role: r.role }, session: null });
    }
    const count = await withTransaction(async (client) => {
      const locked = await client.query(
        `SELECT status, date, is_now, duration_hours FROM sessions WHERE id = $1 FOR UPDATE`,
        [r.session_id],
      );
      if (locked.rows[0]?.status !== 'upcoming') {
        throw httpError(409, 'This session is no longer open for check-in');
      }
      await client.query(
        `INSERT INTO session_check_ins (session_id, user_id, method)
         SELECT $1, $2, 'fingerprint'
         WHERE NOT EXISTS (SELECT 1 FROM session_check_ins WHERE session_id = $1 AND user_id = $2)`,
        [r.session_id, r.user_id],
      );
      const { rows: c } = await client.query(
        `SELECT count(*)::int AS confirmations FROM session_check_ins WHERE session_id = $1`,
        [r.session_id],
      );
      if (c[0].confirmations >= 2) {
        const startedNow = new Date();
        const cutoff = computeSessionCutoff({
          date: locked.rows[0].date,
          isNow: Boolean(locked.rows[0].is_now),
          startedAt: startedNow,
          durationHours: locked.rows[0].duration_hours,
        });
        await client.query(
          `UPDATE sessions
              SET status = 'in-progress',
                  started_at = COALESCE(started_at, $2::timestamptz),
                  cutoff_at = $3::timestamptz
            WHERE id = $1 AND status = 'upcoming'`,
          [r.session_id, startedNow.toISOString(), cutoff.toISOString()],
        );
      }
      return c[0];
    });
    res.json({ user: { id: r.user_id, name: r.name, role: r.role }, session: r, confirmations: count.confirmations });
  } catch (e) { next(e); }
});

export default router;
