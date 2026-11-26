import { query, withTransaction } from '../db.js';
import { config } from '../config.js';
import { publishRoomEvent, getRoomPresenceStats, clearRoomPresence } from './realtimeEvents.js';
import { settleSessionRow } from './sessionSettlement.js';

export const MANILA_TZ = 'Asia/Manila';
const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
const LIFECYCLE_LOCK_KEY = 42088022;

/** YYYY-MM-DD in Asia/Manila (UTC+8, no DST). */
export function manilaTodayYmd(now = new Date()) {
  const shifted = new Date(now.getTime() + MANILA_OFFSET_MS);
  const pad = (n) => String(n).padStart(2, '0');
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}

/** Minutes since midnight in Asia/Manila (0..1439). */
export function manilaNowMinutes(now = new Date()) {
  const shifted = new Date(now.getTime() + MANILA_OFFSET_MS);
  return shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
}

/**
 * Exact UTC Date representing the end of `dateYmd` in Asia/Manila
 * (i.e. 00:00:00+08:00 of the following calendar day).
 */
export function manilaEndOfDayDate(dateYmd) {
  const startUtcMs = Date.parse(`${String(dateYmd).slice(0, 10)}T00:00:00+08:00`);
  if (Number.isNaN(startUtcMs)) return new Date(Date.now() + 86_400_000);
  return new Date(startUtcMs + 86_400_000);
}

/**
 * Compute explicit cutoff timestamp (`timestamptz`) for a session in Asia/Manila.
 *
 * Edge case: a "Now" session started after 22:00 Asia/Manila gets a grace window
 * of `started_at + durationHours + 15m` capped at 02:00+08 the next day so a
 * legitimate 11:45 PM instant session is not cut off at midnight.
 * Unstarted `upcoming` Now sessions get at least 30 minutes from creation.
 */
export function computeSessionCutoff({
  date,
  isNow = false,
  startedAt = null,
  createdAt = null,
  durationHours = 1,
}) {
  const dateYmd = date instanceof Date
    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    : String(date).slice(0, 10);
  const eod = manilaEndOfDayDate(dateYmd);
  if (!isNow) return eod;

  const hours = Math.max(0.5, Number(durationHours) || 1);
  if (startedAt) {
    const startDate = startedAt instanceof Date ? startedAt : new Date(startedAt);
    const startMins = manilaNowMinutes(startDate);
    // Late-night Now session started at or after 22:00 Manila time -> grace up to 02:00 next day
    if (startMins >= 22 * 60) {
      const graceEnd = new Date(startDate.getTime() + Math.round(hours * 60 + 15) * 60_000);
      const nextDay2am = new Date(eod.getTime() + 2 * 60 * 60 * 1000);
      return new Date(Math.max(eod.getTime(), Math.min(graceEnd.getTime(), nextDay2am.getTime())));
    }
    return eod;
  }

  // Unstarted upcoming Now session near midnight gets a 30-min check-in window
  const base = createdAt ? new Date(createdAt) : new Date();
  const minWindow = new Date(base.getTime() + 30 * 60_000);
  return minWindow.getTime() > eod.getTime() ? minWindow : eod;
}

/**
 * Idempotent, transactional sweep of all overdue requests and sessions.
 * Uses a transaction-scoped advisory lock so concurrent sweeps never collide.
 */
export async function sweepStaleSessionsAndRequests({ now = new Date() } = {}) {
  const nowIso = now.toISOString();

  // Fast read-only pre-check using partial indexes: avoids opening a write
  // transaction or holding a pooled connection when nothing is overdue.
  const { rows: [probe] } = await query(
    `SELECT (
       EXISTS (
         SELECT 1 FROM session_requests sr
          WHERE sr.status IN ('pending', 'counter_proposed')
            AND COALESCE(sr.expires_at, ((COALESCE(sr.proposed_date, sr.preferred_date) + 1)::timestamp AT TIME ZONE 'Asia/Manila')) <= $1::timestamptz
       )
       OR EXISTS (
         SELECT 1 FROM sessions s
          WHERE s.status IN ('upcoming', 'in-progress')
            AND COALESCE(s.cutoff_at, ((s.date + 1)::timestamp AT TIME ZONE 'Asia/Manila')) <= $1::timestamptz
       )
     ) AS has_stale`,
    [nowIso],
  );
  if (!probe?.has_stale) {
    return { skipped: false, expiredRequests: 0, missedSessions: 0, autoClosedSessions: 0 };
  }

  const broadcastQueue = [];

  const counts = await withTransaction(async (client) => {
    const { rows: [lock] } = await client.query(
      `SELECT pg_try_advisory_xact_lock($1) AS acquired`,
      [LIFECYCLE_LOCK_KEY],
    );
    if (!lock?.acquired) {
      return { skipped: true, expiredRequests: 0, missedSessions: 0, autoClosedSessions: 0 };
    }

    // 1. Expire unanswered session_requests (both Now 5-min TTL and past-day scheduled)
    const { rows: expiredReqs } = await client.query(
      `UPDATE session_requests sr
          SET status = 'expired'
        WHERE sr.status IN ('pending', 'counter_proposed')
          AND COALESCE(sr.expires_at, ((COALESCE(sr.proposed_date, sr.preferred_date) + 1)::timestamp AT TIME ZONE 'Asia/Manila')) <= $1::timestamptz
        RETURNING sr.id, sr.learner_id, sr.tutor_id, sr.subject_id, sr.is_now, sr.mode, sr.preferred_date, sr.preferred_time`,
      [nowIso],
    );

    for (const r of expiredReqs) {
      const msg = r.is_now
        ? 'Your instant "Now" request timed out before the tutor responded. Pick a scheduled time slot instead.'
        : `Your session request for ${String(r.preferred_date).slice(0, 10)} at ${r.preferred_time} expired without confirmation. Pick another time slot to rebook.`;
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES ($1, $2, $3, 'warning')`,
        [r.learner_id, r.is_now ? 'Instant request expired' : 'Session request expired', msg],
      );
    }

    // 2. Mark overdue unstarted `upcoming` sessions as `missed` (0 points)
    const { rows: missedSessions } = await client.query(
      `UPDATE sessions
          SET status = 'missed',
              ended_by = 'system',
              ended_reason = 'date_cutoff_missed',
              ended_at = COALESCE(ended_at, $1::timestamptz)
        WHERE status = 'upcoming'
          AND COALESCE(cutoff_at, ((date + 1)::timestamp AT TIME ZONE 'Asia/Manila')) <= $1::timestamptz
        RETURNING id, session_code, tutor_id, learner_id, date, time`,
      [nowIso],
    );

    for (const s of missedSessions) {
      const code = s.session_code || s.id.slice(0, 8);
      const msg = `Session ${code} (${String(s.date).slice(0, 10)} ${s.time}) was marked missed because check-in was never completed before the end of the day. No points were awarded.`;
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, 'Session missed', $2, 'warning')`,
        [s.learner_id, msg],
      );
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, 'Session missed', $2, 'warning')`,
        [s.tutor_id, msg],
      );
    }

    // 3. Auto-close overdue `in-progress` sessions (apply minimum-duration settlement rule)
    const { rows: staleActive } = await client.query(
      `SELECT *
         FROM sessions
        WHERE status = 'in-progress'
          AND COALESCE(cutoff_at, ((date + 1)::timestamp AT TIME ZONE 'Asia/Manila')) <= $1::timestamptz
        FOR UPDATE SKIP LOCKED`,
      [nowIso],
    );

    for (const sess of staleActive) {
      const presenceStats = getRoomPresenceStats(sess.id);
      const settled = await settleSessionRow(client, sess, {
        targetStatus: 'auto-closed',
        endedBy: 'system',
        endedReason: 'date_cutoff_auto_closed',
        endedAt: now,
        presenceStats,
        actorId: null,
        actorRole: 'system',
        auditAction: 'session.auto_close',
      });
      broadcastQueue.push({
        keys: [sess.id, sess.session_code].filter(Boolean),
        event: {
          type: 'session.auto_closed',
          sessionId: sess.id,
          endedBy: 'system',
          reason: 'date_cutoff_auto_closed',
          actualDurationSeconds: settled.actualDurationSeconds,
          pointsPosted: settled.pointsPosted,
          needsFacultyReview: settled.needsFacultyReview,
        },
      });
      clearRoomPresence(sess.id);
    }

    return {
      skipped: false,
      expiredRequests: expiredReqs.length,
      missedSessions: missedSessions.length,
      autoClosedSessions: staleActive.length,
    };
  });

  // Publish realtime close events AFTER commit
  for (const item of broadcastQueue) {
    await publishRoomEvent(item.keys, item.event).catch(() => {});
  }

  return counts;
}

// Coalesced lazy read guard: keeps every read fresh without hammering Postgres on burst requests.
let lastSweepAt = 0;
let inflightSweep = null;
const LAZY_THROTTLE_MS = 3000;

export async function ensureFreshLifecycle({ force = false } = {}) {
  const now = Date.now();
  if (!force && now - lastSweepAt < LAZY_THROTTLE_MS) {
    return null;
  }
  if (inflightSweep) return inflightSweep;

  inflightSweep = sweepStaleSessionsAndRequests()
    .then((res) => {
      lastSweepAt = Date.now();
      return res;
    })
    .catch((err) => {
      console.error('[lifecycle] sweep error:', err.message);
      return null;
    })
    .finally(() => {
      inflightSweep = null;
    });

  return inflightSweep;
}

let schedulerTimer = null;

export function startLifecycleScheduler() {
  if (schedulerTimer) return schedulerTimer;
  // Run once on boot, then periodically
  ensureFreshLifecycle({ force: true }).catch(() => {});
  schedulerTimer = setInterval(() => {
    sweepStaleSessionsAndRequests().catch((err) => {
      console.error('[lifecycle] scheduled sweep error:', err.message);
    });
  }, config.lifecycleSweepIntervalMs);
  schedulerTimer.unref?.();
  return schedulerTimer;
}

export function stopLifecycleScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
}
