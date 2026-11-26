import { httpError } from '../middleware/errors.js';

export const ALLOWED_MODES = ['face_to_face', 'online'];
export const ALLOWED_DURATIONS = [0.5, 1, 1.5, 2];
export const ONLINE_LOCATION = 'Online · LCCB Live Classroom';

export const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;
export const TIME_RE = /^(0?[1-9]|1[0-2]):[0-5]\d\s?(AM|PM)$/i;
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Standard campus operating hours (7:00 AM – 8:00 PM) when a tutor has no
// custom weekly schedule rows in tutor_availability.
export const CAMPUS_OPEN_MIN = 7 * 60;
export const CAMPUS_CLOSE_MIN = 20 * 60;

// Bookable slot options surfaced in the 5-step booking picker (9:00 AM – 6:00 PM).
export const DEFAULT_BOOKING_SLOT_MINUTES = [
  9 * 60, 10 * 60, 11 * 60,
  13 * 60, 14 * 60, 15 * 60, 16 * 60, 17 * 60, 18 * 60,
];

export function todayYmd() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function timeToMinutes(value) {
  const raw = String(value ?? '').trim();
  const match = TIME_RE.exec(raw);
  if (!match) return null;
  let hour = Number(match[1]) % 12;
  if (/PM/i.test(match[2])) hour += 12;
  const mins = Number(raw.match(/:(\d{2})/)[1]);
  return hour * 60 + mins;
}

export function pgTimeToMinutes(value) {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(value ?? '').trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function minutesToTimeLabel(totalMinutes) {
  const mins = ((Math.round(totalMinutes) % 1440) + 1440) % 1440;
  const h24 = Math.floor(mins / 60);
  const m = mins % 60;
  const suffix = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function normalizeTimeString(value) {
  const mins = timeToMinutes(value);
  return mins == null ? null : minutesToTimeLabel(mins);
}

export function formatModeLabel(mode) {
  return mode === 'face_to_face' ? 'Face to Face' : 'Online';
}

export function formatDurationLabel(hours) {
  const h = Number(hours) || 1;
  if (h === 0.5) return '30 min';
  if (h === 1) return '1 hr';
  return `${h} hrs`;
}

export function parseMode(raw, { defaultOnline = true } = {}) {
  if (raw === undefined) {
    if (defaultOnline) return 'online';
    throw httpError(400, "mode is required ('face_to_face' or 'online')");
  }
  if (typeof raw !== 'string' || !ALLOWED_MODES.includes(raw)) {
    throw httpError(400, "mode must be 'face_to_face' or 'online'");
  }
  return raw;
}

export function parseDurationHours(raw, { defaultHours = 1 } = {}) {
  if (raw === undefined || raw === null || raw === '') return defaultHours;
  const n = Number(raw);
  if (!ALLOWED_DURATIONS.includes(n)) {
    throw httpError(400, 'durationHours must be 0.5, 1, 1.5, or 2');
  }
  return n;
}

export function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

export function dayOfWeekForYmd(dateYmd) {
  // Noon UTC avoids any local timezone boundary shift on calendar dates.
  return new Date(`${dateYmd}T12:00:00Z`).getUTCDay();
}

export function validateDateAndTime(dateRaw, timeRaw) {
  const date = String(dateRaw ?? '').trim();
  if (!YMD_RE.test(date)) throw httpError(400, 'Date must be YYYY-MM-DD');
  if (date < todayYmd()) throw httpError(400, 'Date cannot be in the past');
  const startMinutes = timeToMinutes(timeRaw);
  if (startMinutes == null) throw httpError(400, 'Time must look like 3:30 PM');
  return { date, time: minutesToTimeLabel(startMinutes), startMinutes };
}

export async function resolveApprovedVenue(dbClient, venueId) {
  const id = String(venueId ?? '').trim();
  if (!id || !UUID_RE.test(id)) {
    throw httpError(400, 'An approved campus venue is required for Face to Face sessions');
  }
  const { rows } = await dbClient.query(
    `SELECT id, name, building, room, capacity, is_active FROM campus_venues WHERE id = $1`,
    [id],
  );
  const venue = rows[0];
  if (!venue || !venue.is_active) {
    throw httpError(400, 'Selected campus venue is not available. Choose an approved venue from the list.');
  }
  return venue;
}

/**
 * Validates that [startMinutes, startMinutes + durationHours * 60] fits inside
 * the tutor's configured tutor_availability windows (if any exist for this tutor),
 * or within standard campus hours (7:00 AM – 8:00 PM) otherwise.
 */
export async function checkTutorAvailabilityWindow(dbClient, tutorId, dateYmd, startMinutes, durationHours) {
  const endMinutes = startMinutes + Math.round(durationHours * 60);
  const { rows: allWindows } = await dbClient.query(
    `SELECT day_of_week, start_time, end_time FROM tutor_availability WHERE tutor_id = $1`,
    [tutorId],
  );
  if (allWindows.length === 0) {
    if (startMinutes < CAMPUS_OPEN_MIN || endMinutes > CAMPUS_CLOSE_MIN) {
      return { ok: false, reason: 'Sessions must be scheduled between 7:00 AM and 8:00 PM' };
    }
    return { ok: true };
  }
  const dow = dayOfWeekForYmd(dateYmd);
  const dayWindows = allWindows.filter((w) => Number(w.day_of_week) === dow);
  const fits = dayWindows.some((w) => {
    const ws = pgTimeToMinutes(w.start_time);
    const we = pgTimeToMinutes(w.end_time);
    return ws != null && we != null && startMinutes >= ws && endMinutes <= we;
  });
  if (!fits) {
    return { ok: false, reason: 'That time is outside this tutor’s available schedule' };
  }
  return { ok: true };
}

/**
 * Transaction-safe double-booking guard. Acquires advisory locks in deterministic
 * sorted key order to prevent deadlocks, then checks overlapping active sessions
 * for BOTH the tutor and (for face_to_face) the campus venue.
 */
export async function assertNoSlotConflicts(
  client,
  { tutorId, venueId = null, mode = 'online', date, startMinutes, durationHours = 1, excludeSessionId = null },
) {
  const lockKeys = [`session-slot:${tutorId}:${date}`];
  if (mode === 'face_to_face' && venueId) {
    lockKeys.push(`venue-slot:${venueId}:${date}`);
  }
  lockKeys.sort();
  for (const key of lockKeys) {
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [key]);
  }

  const requestedEnd = startMinutes + Math.max(0.5, Number(durationHours) || 1) * 60;

  const tutorParams = [tutorId, date];
  let tutorExclude = '';
  if (excludeSessionId) {
    tutorParams.push(excludeSessionId);
    tutorExclude = ` AND id <> $${tutorParams.length}`;
  }
  const { rows: tutorSessions } = await client.query(
    `SELECT id, time, COALESCE(duration_hours, 1) AS duration_hours
       FROM sessions
      WHERE tutor_id = $1 AND date = $2 AND status IN ('upcoming', 'in-progress')${tutorExclude}`,
    tutorParams,
  );
  const tutorClash = tutorSessions.find((s) => {
    const start = timeToMinutes(s.time);
    if (start == null) return false;
    const end = start + Math.max(0.5, Number(s.duration_hours) || 1) * 60;
    return rangesOverlap(startMinutes, requestedEnd, start, end);
  });
  if (tutorClash) {
    throw httpError(409, 'That tutor already has a session overlapping this date and time');
  }

  if (mode === 'face_to_face' && venueId) {
    const venueParams = [venueId, date];
    let venueExclude = '';
    if (excludeSessionId) {
      venueParams.push(excludeSessionId);
      venueExclude = ` AND id <> $${venueParams.length}`;
    }
    const { rows: venueSessions } = await client.query(
      `SELECT id, time, COALESCE(duration_hours, 1) AS duration_hours
         FROM sessions
        WHERE venue_id = $1 AND date = $2 AND mode = 'face_to_face'
          AND status IN ('upcoming', 'in-progress')${venueExclude}`,
      venueParams,
    );
    const venueClash = venueSessions.find((s) => {
      const start = timeToMinutes(s.time);
      if (start == null) return false;
      const end = start + Math.max(0.5, Number(s.duration_hours) || 1) * 60;
      return rangesOverlap(startMinutes, requestedEnd, start, end);
    });
    if (venueClash) {
      throw httpError(409, 'That campus venue is already booked at this date and time. Pick another venue or time.');
    }
  }
}

/**
 * Computes bookable time slot chips for a tutor on a given date, flagging slots
 * occupied by the tutor or (when face_to_face + venueId) by the selected venue.
 */
export async function computeTutorSlots(
  dbClient,
  { tutorId, dateYmd, durationHours = 1, mode = 'online', venueId = null, excludeSessionId = null },
) {
  const { rows: allWindows } = await dbClient.query(
    `SELECT day_of_week, start_time, end_time FROM tutor_availability WHERE tutor_id = $1`,
    [tutorId],
  );
  const dow = dayOfWeekForYmd(dateYmd);
  const dayWindows = allWindows.filter((w) => Number(w.day_of_week) === dow);

  let candidateMinutes = DEFAULT_BOOKING_SLOT_MINUTES;
  if (allWindows.length > 0) {
    const set = new Set();
    for (const w of dayWindows) {
      const ws = pgTimeToMinutes(w.start_time);
      const we = pgTimeToMinutes(w.end_time);
      if (ws == null || we == null) continue;
      for (let m = ws; m + Math.round(durationHours * 60) <= we; m += 60) {
        set.add(m);
      }
    }
    candidateMinutes = [...set].sort((a, b) => a - b);
  }

  const tutorParams = [tutorId, dateYmd];
  let tutorExclude = '';
  if (excludeSessionId) {
    tutorParams.push(excludeSessionId);
    tutorExclude = ` AND id <> $${tutorParams.length}`;
  }
  const { rows: tutorSessions } = await dbClient.query(
    `SELECT time, COALESCE(duration_hours, 1) AS duration_hours
       FROM sessions
      WHERE tutor_id = $1 AND date = $2 AND status IN ('upcoming', 'in-progress')${tutorExclude}`,
    tutorParams,
  );

  let venueSessions = [];
  if (mode === 'face_to_face' && venueId && UUID_RE.test(String(venueId))) {
    const venueParams = [venueId, dateYmd];
    let venueExclude = '';
    if (excludeSessionId) {
      venueParams.push(excludeSessionId);
      venueExclude = ` AND id <> $${venueParams.length}`;
    }
    venueSessions = (await dbClient.query(
      `SELECT time, COALESCE(duration_hours, 1) AS duration_hours
         FROM sessions
        WHERE venue_id = $1 AND date = $2 AND mode = 'face_to_face'
          AND status IN ('upcoming', 'in-progress')${venueExclude}`,
      venueParams,
    )).rows;
  }

  const durMins = Math.max(30, Math.round(durationHours * 60));
  return candidateMinutes.map((start) => {
    const end = start + durMins;
    const label = minutesToTimeLabel(start);
    if (start < CAMPUS_OPEN_MIN || end > CAMPUS_CLOSE_MIN) {
      return { time: label, available: false, reason: 'outside_hours' };
    }
    const tutorBusy = tutorSessions.some((s) => {
      const sStart = timeToMinutes(s.time);
      if (sStart == null) return false;
      const sEnd = sStart + Math.max(0.5, Number(s.duration_hours) || 1) * 60;
      return rangesOverlap(start, end, sStart, sEnd);
    });
    if (tutorBusy) return { time: label, available: false, reason: 'tutor_busy' };

    const venueBusy = venueSessions.some((s) => {
      const sStart = timeToMinutes(s.time);
      if (sStart == null) return false;
      const sEnd = sStart + Math.max(0.5, Number(s.duration_hours) || 1) * 60;
      return rangesOverlap(start, end, sStart, sEnd);
    });
    if (venueBusy) return { time: label, available: false, reason: 'venue_busy' };

    return { time: label, available: true, reason: null };
  });
}
