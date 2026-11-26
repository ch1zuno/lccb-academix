import express from 'express';
import { query, withTransaction } from '../db.js';
import { config } from '../config.js';
import { requireAuth, requireRole, requireVerifiedTutor } from '../middleware/auth.js';
import { httpError } from '../middleware/errors.js';
import { audit, requestIp } from '../lib/audit.js';
import { toPublicProfile } from '../lib/publicProfile.js';
import {
  ONLINE_LOCATION,
  UUID_RE,
  YMD_RE,
  formatDurationLabel,
  formatModeLabel,
  pgDateToYmd,
  parseDurationHours,
  parseMode,
  validateDateAndTime,
  validateTopic,
  validateTutorLanguage,
  normalizeTutorLanguages,
  resolveApprovedVenue,
  checkTutorAvailabilityWindow,
  checkTutorAvailableNow,
  assertNoSlotConflicts,
  computeTutorSlots,
  timeToMinutes,
} from '../lib/booking.js';
import {
  ensureFreshLifecycle,
  manilaEndOfDayDate,
  computeSessionCutoff,
} from '../lib/sessionLifecycle.js';

const router = express.Router();

const TUTOR_SQL = (roleLiteral, orderClause) => `
  SELECT u.id, u.custom_id, u.name, u.role, u.title, u.department, u.program, u.avatar, u.bio, u.is_available,
         u.languages, u.hourly_rate, u.certified_by_id,
         COALESCE(
           (SELECT json_agg(json_build_object('id', s.id, 'code', s.code, 'name', s.name, 'department', s.department))
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
           '{"sessions": 0, "rating": 5.0}') AS stats,
         (SELECT COALESCE(SUM(amount), 0) FROM points_ledger l WHERE l.user_id = u.id) AS points
  FROM users u
  WHERE u.role = '${roleLiteral}' AND u.suspended_at IS NULL ${orderClause}`;

/** GET /tutors?subject=PROG+201&available=1&role=tutor|faculty&q=mark — live tutor/faculty directory for the wizard */
router.get('/tutors', requireAuth, async (req, res, next) => {
  try {
    const targetRole = req.query.role === 'faculty' ? 'faculty' : 'tutor';
    const clauses = [];
    const params = [];
    if (req.query.available === '1' || req.query.available === 'true') clauses.push('u.is_available AND u.is_verified');
    if (req.query.q) { params.push(`%${String(req.query.q).trim()}%`); clauses.push(`(u.name ILIKE $${params.length} OR COALESCE(u.program, u.department, '') ILIKE $${params.length})`); }
    if (req.query.subject) {
      params.push(req.query.subject);
      clauses.push(`EXISTS (SELECT 1 FROM user_subjects us JOIN subjects s ON s.id = us.subject_id WHERE us.user_id = u.id AND s.code = $${params.length})`);
    }
    const where = clauses.length ? 'AND ' + clauses.join(' AND ') + ' ' : '';
    const { rows } = await query(TUTOR_SQL(targetRole, where + 'AND u.is_verified ORDER BY u.name'), params);
    res.json({ tutors: rows });
  } catch (e) { next(e); }
});

/** GET /tutors/:id/slots?date=YYYY-MM-DD&durationHours=1&mode=online|face_to_face&venueId=... */
router.get('/tutors/:id/slots', requireAuth, async (req, res, next) => {
  try {
    await ensureFreshLifecycle();
    const { id } = req.params;
    const isUuid = UUID_RE.test(String(id));
    const { rows } = await query(
      `SELECT id, is_verified, is_available, suspended_at, languages
         FROM users
        WHERE ${isUuid ? 'id = $1' : 'custom_id = $1'}
          AND role IN ('tutor', 'faculty')
          AND is_verified
          AND suspended_at IS NULL`,
      [id],
    );
    if (!rows[0]) throw httpError(404, 'Tutor not found');

    const dateYmd = String(req.query.date ?? '').trim();
    if (!YMD_RE.test(dateYmd)) throw httpError(400, 'date query parameter must be YYYY-MM-DD');

    const mode = req.query.mode ? parseMode(req.query.mode) : 'online';
    const durationHours = parseDurationHours(req.query.durationHours, { defaultHours: 1 });
    const venueId = req.query.venueId ? String(req.query.venueId).trim() : null;
    const excludeSessionId = req.query.excludeSessionId && UUID_RE.test(String(req.query.excludeSessionId))
      ? String(req.query.excludeSessionId)
      : null;

    const [slots, nowCheck] = await Promise.all([
      computeTutorSlots(
        { query },
        { tutorId: rows[0].id, dateYmd, durationHours, mode, venueId, excludeSessionId },
      ),
      checkTutorAvailableNow({ query }, rows[0], durationHours),
    ]);
    res.json({
      date: dateYmd,
      durationHours,
      mode,
      slots,
      availableNow: nowCheck.availableNow,
      nowReason: nowCheck.reason,
      nowTtlMinutes: config.nowRequestTtlMinutes,
      languages: normalizeTutorLanguages(rows[0].languages),
    });
  } catch (e) { next(e); }
});

/** GET /tutors/:id — public-safe profile for an accredited tutor or faculty specialist */
router.get('/tutors/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const isUuid = UUID_RE.test(String(id));

    const userResult = await query(
      `SELECT u.id, u.custom_id, u.name, u.role, u.title, u.bio, u.avatar, u.program, u.department,
              u.is_available, u.is_verified, u.languages,
              EXISTS(SELECT 1 FROM user_avatars ua WHERE ua.user_id = u.id) AS has_avatar
       FROM users u
       WHERE ${isUuid ? 'u.id = $1' : 'u.custom_id = $1'} AND u.role IN ('tutor', 'faculty')`,
      [id],
    );

    const user = userResult.rows[0];
    if (!user) throw httpError(404, 'Tutor not found');

    const statsResult = await query(
      `SELECT count(*)::int AS completed_sessions
       FROM sessions
       WHERE (tutor_id = $1 OR faculty_id = $1) AND status = 'completed'`,
      [user.id],
    );
    const stats = { completed_sessions: statsResult.rows[0]?.completed_sessions || 0 };

    const subjectsResult = await query(
      `SELECT s.id, s.code, s.name, s.department
       FROM user_subjects us
       JOIN subjects s ON s.id = us.subject_id
       WHERE us.user_id = $1
       ORDER BY s.code`,
      [user.id],
    );

    const publicProfile = toPublicProfile(user, subjectsResult.rows, stats);
    res.json({
      profile: publicProfile,
      tutorId: user.id,
      customId: user.custom_id,
    });
  } catch (e) { next(e); }
});

/** GET /subjects — subject list for the wizard dropdowns */
router.get('/subjects', requireAuth, async (_req, res, next) => {
  try {
    const { rows } = await query(`SELECT s.id, s.code, s.name, s.department FROM subjects s ORDER BY s.code`);
    res.json({ subjects: rows });
  } catch (e) { next(e); }
});

/** GET /learners/my-tutors — distinct tutors from completed sessions for learners */
router.get('/learners/my-tutors', requireAuth, requireRole('learner'), async (req, res, next) => {
  try {
    const { rows } = await query(
      `WITH learner_sessions AS (
         SELECT s.id, s.tutor_id, s.subject_id, s.date, s.created_at,
                sub.name AS subject_name, sub.code AS subject_code,
                ROW_NUMBER() OVER (PARTITION BY s.tutor_id ORDER BY s.date DESC, s.created_at DESC) AS rn
           FROM sessions s
           JOIN subjects sub ON sub.id = s.subject_id
          WHERE s.learner_id = $1 AND s.status = 'completed'
       ),
       tutor_stats AS (
         SELECT tutor_id,
                count(id)::int AS total_sessions,
                max(date) AS last_session_date
           FROM learner_sessions
          GROUP BY tutor_id
       )
       SELECT ts.tutor_id,
              u.custom_id AS tutor_custom_id,
              u.name AS tutor_name,
              u.role AS tutor_role,
              u.program AS tutor_program,
              u.is_verified AS is_accredited,
              u.is_available,
              COALESCE(
                (SELECT ua.r2_url FROM user_avatars ua WHERE ua.user_id = u.id AND ua.r2_url IS NOT NULL),
                CASE WHEN EXISTS(SELECT 1 FROM user_avatars ua WHERE ua.user_id = u.id)
                     THEN '/api/users/' || u.id || '/avatar'
                     ELSE u.avatar
                END
              ) AS avatar,
              ts.total_sessions,
              ts.last_session_date,
              ls.subject_name AS last_subject_name,
              ls.subject_code AS last_subject_code,
              COALESCE(
                (
                  SELECT json_agg(json_build_object('id', sub.id, 'code', sub.code, 'name', sub.name))
                    FROM user_subjects us
                    JOIN subjects sub ON sub.id = us.subject_id
                   WHERE us.user_id = u.id
                ), '[]'::json
              ) AS subjects
         FROM tutor_stats ts
         JOIN learner_sessions ls ON ls.tutor_id = ts.tutor_id AND ls.rn = 1
         JOIN users u ON u.id = ts.tutor_id
        ORDER BY ts.last_session_date DESC, ts.total_sessions DESC`,
      [req.user.id],
    );
    res.json({ tutors: rows });
  } catch (e) { next(e); }
});

/** PATCH /tutors/me/availability — verified tutor pauses or resumes new requests. */
router.patch('/tutors/me/availability', requireAuth, requireVerifiedTutor(), async (req, res, next) => {
  try {
    const { available } = req.body ?? {};
    if (typeof available !== 'boolean') throw httpError(400, 'available must be true or false');
    const { rows } = await query(
      `UPDATE users SET is_available = $2
        WHERE id = $1 AND role = 'tutor'
        RETURNING id, is_available`,
      [req.user.id, available],
    );
    if (!rows[0]) throw httpError(404, 'Tutor profile not found');
    await audit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'tutor.availability',
      entity: 'user',
      entityId: req.user.id,
      detail: { available },
      ip: requestIp(req),
    });
    res.json({ user: rows[0] });
  } catch (e) { next(e); }
});

/** POST /session-requests — learner books a scheduled or instant ("Now") session request; tutor is notified. */
router.post('/session-requests', requireAuth, requireRole('learner'), async (req, res, next) => {
  try {
    await ensureFreshLifecycle({ force: true });
    const {
      tutorId,
      subjectId,
      topic,
      preferredDate,
      preferredTime,
      durationHours: rawDuration,
      mode: rawMode,
      venueId,
      language: rawLanguage,
      isNow: rawIsNow = false,
      note = null,
    } = req.body ?? {};

    const isNow = Boolean(rawIsNow);
    if (!tutorId || !subjectId || !topic || (!isNow && (!preferredDate || !preferredTime))) {
      throw httpError(
        400,
        isNow
          ? 'tutorId, subjectId, and topic are required'
          : 'tutorId, subjectId, topic, preferredDate and preferredTime are required',
      );
    }

    const mode = parseMode(rawMode, { defaultOnline: true });
    const durationHours = parseDurationHours(rawDuration, { defaultHours: 1 });
    const cleanTopic = validateTopic(topic);
    const cleanNote = note ? String(note).trim().slice(0, 300) : null;
    const isUuid = UUID_RE.test(String(tutorId));

    const created = await withTransaction(async (client) => {
      const { rows: ok } = await client.query(
        `SELECT u.id, u.name, u.is_verified, u.is_available, u.suspended_at, u.languages
           FROM user_subjects us
           JOIN users u ON u.id = us.user_id
          WHERE ${isUuid ? 'us.user_id = $1' : 'u.custom_id = $1'}
            AND us.subject_id = $2
            AND u.role IN ('tutor', 'faculty')
            AND u.is_verified = true
            AND u.is_available = true
            AND u.suspended_at IS NULL`,
        [tutorId, subjectId],
      );
      if (!ok[0]) throw httpError(409, 'That tutor is not accredited or available for this subject');
      const tutor = ok[0];
      const resolvedTutorId = tutor.id;
      if (resolvedTutorId === req.user.id) {
        throw httpError(400, 'You cannot book a tutoring session with yourself');
      }

      const language = validateTutorLanguage(rawLanguage, tutor.languages);

      let date;
      let time;
      let startMinutes;
      let expiresAt;

      if (isNow) {
        const nowCheck = await checkTutorAvailableNow(client, tutor, durationHours);
        if (!nowCheck.availableNow) {
          throw httpError(409, nowCheck.reason || 'Tutor is not currently available for an instant session');
        }
        date = nowCheck.date;
        time = nowCheck.time;
        startMinutes = nowCheck.startMinutes;
        expiresAt = new Date(Date.now() + config.nowRequestTtlMinutes * 60_000);
      } else {
        const parsed = validateDateAndTime(preferredDate, preferredTime);
        date = parsed.date;
        time = parsed.time;
        startMinutes = parsed.startMinutes;
        const avail = await checkTutorAvailabilityWindow(client, resolvedTutorId, date, startMinutes, durationHours);
        if (!avail.ok) throw httpError(409, avail.reason);
        expiresAt = manilaEndOfDayDate(date);
      }

      let resolvedVenueId = null;
      let canonicalLocation = ONLINE_LOCATION;
      if (mode === 'face_to_face') {
        const venue = await resolveApprovedVenue(client, venueId);
        resolvedVenueId = venue.id;
        canonicalLocation = venue.name;
      }

      // Enforce no double-booking of tutor or venue right at booking time (and re-verified on accept).
      await assertNoSlotConflicts(client, {
        tutorId: resolvedTutorId,
        venueId: resolvedVenueId,
        mode,
        date,
        startMinutes,
        durationHours,
      });

      const { rows } = await client.query(
        `INSERT INTO session_requests
           (learner_id, tutor_id, subject_id, topic, preferred_date, preferred_time, duration_hours,
            mode, venue_id, language, is_now, expires_at, note, location)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::timestamptz,$13,$14)
         RETURNING id, status, mode, venue_id, location, language, is_now, expires_at, preferred_date, preferred_time, duration_hours`,
        [
          req.user.id,
          resolvedTutorId,
          subjectId,
          cleanTopic,
          date,
          time,
          durationHours,
          mode,
          resolvedVenueId,
          language,
          isNow,
          expiresAt.toISOString(),
          cleanNote,
          canonicalLocation,
        ],
      );

      const modeLabel = formatModeLabel(mode);
      const notifTitle = isNow
        ? `Urgent: Instant ${modeLabel} session request (${config.nowRequestTtlMinutes}m)`
        : `New ${modeLabel} session request`;
      const notifPrefix = isNow
        ? `${req.user.name} wants to start a ${modeLabel} session NOW (accept within ${config.nowRequestTtlMinutes} min) for `
        : `${req.user.name} requested a ${modeLabel} session for `;
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type, priority)
         SELECT $1, $2, $3 || s.name || ' on ' || $4 || ' at ' || $5 || ' (' || $6 || ')', $7, $8
         FROM subjects s WHERE s.id = $9`,
        [
          resolvedTutorId,
          notifTitle,
          notifPrefix,
          date,
          time,
          canonicalLocation,
          isNow ? 'warning' : 'info',
          isNow ? 'high' : 'normal',
          subjectId,
        ],
      );

      await audit({
        actorId: req.user.id,
        actorRole: req.user.role,
        action: 'session.request',
        entity: 'session_request',
        entityId: rows[0].id,
        detail: { tutorId: resolvedTutorId, subjectId, mode, venueId: resolvedVenueId, language, isNow, date, time, durationHours },
        ip: requestIp(req),
      }, client);

      return rows[0];
    });

    res.status(201).json({ request: created });
  } catch (e) {
    if (e.code === '23503') { e.status = 400; e.message = 'Unknown tutor, subject, or venue'; }
    next(e);
  }
});

/** GET /session-requests — tutor/faculty sees own; learner sees own history */
router.get('/session-requests', requireAuth, async (req, res, next) => {
  try {
    await ensureFreshLifecycle({ force: true });
    const col = req.user.role === 'learner' ? 'sr.learner_id' : (req.user.role === 'tutor' || req.user.role === 'faculty') ? 'sr.tutor_id' : null;
    if (!col) throw httpError(403, 'Learners, tutors, and faculty only');

    const limit = req.query.limit ? Math.min(100, Math.max(1, parseInt(req.query.limit, 10))) : null;
    const offset = Math.max(0, parseInt(req.query.offset, 10) || 0);

    let sql = `SELECT sr.*, u.custom_id AS tutor_custom_id, t.custom_id AS learner_custom_id,
                      u.name AS tutor_name, t.name AS learner_name, s.name AS subject, s.code AS subject_code,
                      v.name AS venue_name, v.building AS venue_building, v.room AS venue_room,
                      pv.name AS proposed_venue_name, pv.building AS proposed_venue_building, pv.room AS proposed_venue_room,
                      count(*) OVER()::int AS total_count
               FROM session_requests sr
               JOIN users u ON u.id = sr.tutor_id
               JOIN users t ON t.id = sr.learner_id
               JOIN subjects s ON s.id = sr.subject_id
               LEFT JOIN campus_venues v ON v.id = sr.venue_id
               LEFT JOIN campus_venues pv ON pv.id = sr.proposed_venue_id
               WHERE ${col} = $1
               ORDER BY (sr.is_now AND sr.status = 'pending') DESC, sr.created_at DESC`;
    const params = [req.user.id];

    if (limit) {
      params.push(limit, offset);
      sql += ` LIMIT $2 OFFSET $3`;
    }

    const { rows } = await query(sql, params);
    const total = rows[0]?.total_count ?? (limit ? 0 : rows.length);

    res.json({
      requests: rows,
      total,
      hasMore: limit ? (offset + rows.length) < total : false,
    });
  } catch (e) { next(e); }
});

/** POST /session-requests/:id/accept — creates a real session from a pending request. */
router.post('/session-requests/:id/accept', requireAuth, requireVerifiedTutor({ allowFaculty: true }), async (req, res, next) => {
  try {
    await ensureFreshLifecycle({ force: true });
    const created = await withTransaction(async (client) => {
      const { rows: reqRows } = await client.query(
        `SELECT sr.*, s.name AS subject_name
           FROM session_requests sr
           JOIN subjects s ON s.id = sr.subject_id
          WHERE sr.id = $1 AND sr.tutor_id = $2 FOR UPDATE`,
        [req.params.id, req.user.id],
      );
      const run = reqRows[0];
      if (!run) throw httpError(404, 'Request not found or not addressed to you');
      if (run.status !== 'pending') throw httpError(409, `Request already ${run.status}`);

      if (run.expires_at && new Date(run.expires_at).getTime() <= Date.now()) {
        await client.query(`UPDATE session_requests SET status = 'expired' WHERE id = $1`, [run.id]);
        throw httpError(409, run.is_now ? 'This instant request has expired' : 'This request has expired');
      }

      const mode = run.mode || 'online';
      const durationHours = Number(run.duration_hours) || 1;
      const dateStr = pgDateToYmd(run.preferred_date);
      const startMinutes = timeToMinutes(run.preferred_time);

      let venueId = null;
      let location = ONLINE_LOCATION;
      if (mode === 'face_to_face') {
        const venue = await resolveApprovedVenue(client, run.venue_id);
        venueId = venue.id;
        location = venue.name;
      }

      if (startMinutes != null) {
        await assertNoSlotConflicts(client, {
          tutorId: run.tutor_id,
          venueId,
          mode,
          date: dateStr,
          startMinutes,
          durationHours,
        });
      }

      const cutoff = computeSessionCutoff({
        date: dateStr,
        isNow: Boolean(run.is_now),
        createdAt: new Date(),
        durationHours,
      });

      const sessionCode = `SES-${String(Date.now()).slice(-6)}`;
      const { rows } = await client.query(
        `INSERT INTO sessions
           (session_code, tutor_id, learner_id, subject_id, topic, date, time, duration, duration_hours,
            status, mode, venue_id, location, language, is_now, cutoff_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'upcoming',$10,$11,$12,$13,$14,$15::timestamptz) RETURNING *`,
        [
          sessionCode,
          run.tutor_id,
          run.learner_id,
          run.subject_id,
          run.topic,
          dateStr,
          run.preferred_time,
          formatDurationLabel(durationHours),
          durationHours,
          mode,
          venueId,
          location,
          run.language || 'English',
          Boolean(run.is_now),
          cutoff.toISOString(),
        ],
      );
      await client.query(
        `UPDATE session_requests SET status = 'accepted', session_id = $1 WHERE id = $2`,
        [rows[0].id, req.params.id],
      );
      const modeLabel = formatModeLabel(mode);
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type, priority) VALUES ($1, $2, $3, 'success', $4)`,
        [
          run.learner_id,
          run.is_now ? `Instant ${modeLabel} session accepted — join now!` : `${modeLabel} request accepted`,
          `${req.user.name} accepted your ${run.is_now ? 'instant ' : ''}${modeLabel} session — ${run.subject_name} on ${dateStr} at ${run.preferred_time} (${location}).`,
          run.is_now ? 'high' : 'normal',
        ],
      );
      await audit({
        actorId: req.user.id,
        actorRole: req.user.role,
        action: 'session.accept_request',
        entity: 'session',
        entityId: rows[0].id,
        detail: { requestId: run.id, learnerId: run.learner_id, mode, venueId, isNow: Boolean(run.is_now), date: dateStr, time: run.preferred_time },
        ip: requestIp(req),
      }, client);
      return rows[0];
    });
    res.status(201).json({ session: created });
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

/**
 * POST /session-requests/:id/propose — tutor proposes another approved venue (f2f)
 * and/or another date/time on a pending request; learner gets notified to confirm.
 */
router.post('/session-requests/:id/propose', requireAuth, requireVerifiedTutor({ allowFaculty: true }), async (req, res, next) => {
  try {
    const updated = await withTransaction(async (client) => {
      const { rows: reqRows } = await client.query(
        `SELECT sr.*, s.name AS subject_name
           FROM session_requests sr
           JOIN subjects s ON s.id = sr.subject_id
          WHERE sr.id = $1 AND sr.tutor_id = $2 FOR UPDATE`,
        [req.params.id, req.user.id],
      );
      const run = reqRows[0];
      if (!run) throw httpError(404, 'Request not found or not addressed to you');
      if (!['pending', 'counter_proposed'].includes(run.status)) {
        throw httpError(409, `Cannot propose changes on a ${run.status} request`);
      }

      const mode = run.mode || 'online';
      const durationHours = Number(run.duration_hours) || 1;
      const curDate = pgDateToYmd(run.preferred_date);

      const { date: propDate, time: propTime, startMinutes } = validateDateAndTime(
        req.body?.proposedDate ?? curDate,
        req.body?.proposedTime ?? run.preferred_time,
      );

      let propVenueId = null;
      let propLocation = ONLINE_LOCATION;
      if (mode === 'face_to_face') {
        const targetVenueId = req.body?.proposedVenueId ?? run.venue_id;
        const venue = await resolveApprovedVenue(client, targetVenueId);
        propVenueId = venue.id;
        propLocation = venue.name;
      }

      const sameDate = propDate === curDate;
      const sameTime = propTime === run.preferred_time;
      const sameVenue = mode === 'online' || propVenueId === run.venue_id;
      if (sameDate && sameTime && sameVenue) {
        throw httpError(400, 'Propose a different date, time, or campus venue — or accept the original request');
      }

      const avail = await checkTutorAvailabilityWindow(client, run.tutor_id, propDate, startMinutes, durationHours);
      if (!avail.ok) throw httpError(409, avail.reason);

      await assertNoSlotConflicts(client, {
        tutorId: run.tutor_id,
        venueId: propVenueId,
        mode,
        date: propDate,
        startMinutes,
        durationHours,
      });

      const proposalNote = req.body?.note ? String(req.body.note).trim().slice(0, 240) : null;
      const propExpiresAt = manilaEndOfDayDate(propDate);
      const { rows } = await client.query(
        `UPDATE session_requests
            SET status = 'counter_proposed',
                proposed_date = $1,
                proposed_time = $2,
                proposed_venue_id = $3,
                proposed_location = $4,
                proposal_note = $5,
                is_now = false,
                expires_at = $6::timestamptz
          WHERE id = $7
          RETURNING id, status, mode, proposed_date, proposed_time, proposed_venue_id, proposed_location, proposal_note`,
        [propDate, propTime, propVenueId, propLocation, proposalNote, propExpiresAt.toISOString(), run.id],
      );

      const modeLabel = formatModeLabel(mode);
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, 'info')`,
        [
          run.learner_id,
          `New ${mode === 'face_to_face' ? 'venue or time' : 'time'} proposed`,
          `${req.user.name} proposed ${propDate} at ${propTime} (${propLocation}) for your ${modeLabel} ${run.subject_name} session.${proposalNote ? ` Note: "${proposalNote}"` : ''}`,
        ],
      );
      await audit({
        actorId: req.user.id,
        actorRole: req.user.role,
        action: 'session.propose_change',
        entity: 'session_request',
        entityId: run.id,
        detail: { mode, proposedDate: propDate, proposedTime: propTime, proposedVenueId: propVenueId },
        ip: requestIp(req),
      }, client);
      return rows[0];
    });
    res.json({ request: updated });
  } catch (e) { next(e); }
});

/**
 * POST /session-requests/:id/accept-proposal — learner accepts tutor's proposed
 * venue/time, atomically creating the confirmed session with the agreed details.
 */
router.post('/session-requests/:id/accept-proposal', requireAuth, requireRole('learner'), async (req, res, next) => {
  try {
    const created = await withTransaction(async (client) => {
      const { rows: reqRows } = await client.query(
        `SELECT sr.*, s.name AS subject_name
           FROM session_requests sr
           JOIN subjects s ON s.id = sr.subject_id
          WHERE sr.id = $1 AND sr.learner_id = $2 FOR UPDATE`,
        [req.params.id, req.user.id],
      );
      const run = reqRows[0];
      if (!run) throw httpError(404, 'Request not found');
      if (run.status !== 'counter_proposed') {
        throw httpError(409, `No pending proposal to accept (currently ${run.status})`);
      }

      const mode = run.mode || 'online';
      const durationHours = Number(run.duration_hours) || 1;
      const rawDate = run.proposed_date || run.preferred_date;
      const dateStr = pgDateToYmd(rawDate);
      const finalTime = run.proposed_time || run.preferred_time;
      const { date, time, startMinutes } = validateDateAndTime(dateStr, finalTime);

      let venueId = null;
      let location = ONLINE_LOCATION;
      if (mode === 'face_to_face') {
        const venue = await resolveApprovedVenue(client, run.proposed_venue_id || run.venue_id);
        venueId = venue.id;
        location = venue.name;
      }

      await assertNoSlotConflicts(client, {
        tutorId: run.tutor_id,
        venueId,
        mode,
        date,
        startMinutes,
        durationHours,
      });

      const cutoff = computeSessionCutoff({ date, isNow: false, durationHours });
      const sessionCode = `SES-${String(Date.now()).slice(-6)}`;
      const { rows } = await client.query(
        `INSERT INTO sessions
           (session_code, tutor_id, learner_id, subject_id, topic, date, time, duration, duration_hours, status, mode, venue_id, location, language, is_now, cutoff_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'upcoming',$10,$11,$12,$13,false,$14::timestamptz) RETURNING *`,
        [
          sessionCode,
          run.tutor_id,
          run.learner_id,
          run.subject_id,
          run.topic,
          date,
          time,
          formatDurationLabel(durationHours),
          durationHours,
          mode,
          venueId,
          location,
          run.language || 'English',
          cutoff.toISOString(),
        ],
      );
      await client.query(
        `UPDATE session_requests
            SET status = 'accepted',
                preferred_date = $1,
                preferred_time = $2,
                venue_id = $3,
                location = $4,
                session_id = $5
          WHERE id = $6`,
        [date, time, venueId, location, rows[0].id, run.id],
      );

      const modeLabel = formatModeLabel(mode);
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, 'success')`,
        [
          run.tutor_id,
          `${modeLabel} proposal confirmed`,
          `${req.user.name} confirmed your proposed ${modeLabel} session — ${run.subject_name} on ${date} at ${time} (${location}).`,
        ],
      );
      await audit({
        actorId: req.user.id,
        actorRole: req.user.role,
        action: 'session.accept_proposal',
        entity: 'session',
        entityId: rows[0].id,
        detail: { requestId: run.id, mode, venueId, date, time },
        ip: requestIp(req),
      }, client);
      return rows[0];
    });
    res.status(201).json({ session: created });
  } catch (e) {
    if (e.code === '23505') {
      e.status = 409;
      e.message = /venue/i.test(e.constraint || '')
        ? 'That campus venue was just booked by someone else. Please request another slot.'
        : 'That tutor slot was just booked. Please request another time.';
    }
    next(e);
  }
});

/** POST /session-requests/:id/decline */
router.post('/session-requests/:id/decline', requireAuth, requireVerifiedTutor({ allowFaculty: true }), async (req, res, next) => {
  try {
    const { rows } = await query(
      `UPDATE session_requests SET status = 'declined'
        WHERE id = $1 AND tutor_id = $2 AND status IN ('pending', 'counter_proposed')
        RETURNING id, status, learner_id, subject_id, mode, preferred_date, preferred_time`,
      [req.params.id, req.user.id],
    );
    if (!rows[0]) throw httpError(404, 'No pending request addressed to you');
    const run = rows[0];
    const modeLabel = formatModeLabel(run.mode);
    await query(
      `INSERT INTO notifications (user_id, title, message, type)
       SELECT $1, 'Session request declined', $2 || ' declined your ' || $3 || ' request for ' || s.name || '.', 'warning'
       FROM subjects s WHERE s.id = $4`,
      [run.learner_id, req.user.name, modeLabel, run.subject_id],
    ).catch(() => {});
    await audit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'session.decline_request',
      entity: 'session_request',
      entityId: run.id,
      ip: requestIp(req),
    });
    res.json({ request: { id: run.id, status: run.status } });
  } catch (e) { next(e); }
});

/** POST /session-requests/:id/cancel — learner withdraws their own pending or proposed request. */
router.post('/session-requests/:id/cancel', requireAuth, requireRole('learner'), async (req, res, next) => {
  try {
    const { rows } = await query(
      `UPDATE session_requests SET status = 'cancelled'
        WHERE id = $1 AND learner_id = $2 AND status IN ('pending', 'counter_proposed')
        RETURNING id, tutor_id, subject_id, mode, preferred_date, preferred_time`,
      [req.params.id, req.user.id],
    );
    if (!rows[0]) {
      const { rows: existing } = await query(
        `SELECT status FROM session_requests WHERE id = $1 AND learner_id = $2`,
        [req.params.id, req.user.id],
      );
      if (!existing[0]) throw httpError(404, 'Request not found');
      throw httpError(409, `Only a pending request can be cancelled (currently ${existing[0].status})`);
    }
    const run = rows[0];
    const modeLabel = formatModeLabel(run.mode);
    await query(
      `INSERT INTO notifications (user_id, title, message, type)
       SELECT $1, 'Session request withdrawn', $2 || ' withdrew a ' || $3 || ' request for ' || s.name || ' on ' || $4, 'warning'
       FROM subjects s WHERE s.id = $5`,
      [run.tutor_id, req.user.name, modeLabel, run.preferred_date, run.subject_id],
    ).catch(() => {});
    await audit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'session.cancel_request',
      entity: 'session_request',
      entityId: run.id,
      detail: { tutorId: run.tutor_id, mode: run.mode, date: run.preferred_date, time: run.preferred_time },
      ip: requestIp(req),
    });
    res.json({ request: { id: run.id, status: 'cancelled' } });
  } catch (e) { next(e); }
});

export default router;
