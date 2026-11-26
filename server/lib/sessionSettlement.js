import { config } from '../config.js';
import { audit } from './audit.js';
import {
  awardWithinCap,
  SESSION_POINTS_EARNED_SQL,
  WEEKLY_LEARNER_SESSION_CAP,
  WEEKLY_TUTOR_SESSION_CAP,
} from './points.js';

/**
 * Single transactional settlement helper for ending or auto-closing a session.
 * Caller MUST hold `SELECT ... FROM sessions WHERE id = $1 FOR UPDATE`.
 *
 * Enforces:
 *  - Idempotency via `points_posted` (never double-posts points or referral hours)
 *  - Server-measured duration & optional realtime presence overlap vs `config.minSessionPointsSeconds`
 *  - Unchanged +50 tutor / +25 learner values and 500/250 rolling weekly caps
 *  - Below-minimum sessions still finish cleanly, post 0 points/hours, and set `needs_faculty_review = true`
 */
export async function settleSessionRow(
  client,
  session,
  {
    targetStatus = 'completed', // 'completed' | 'auto-closed'
    endedBy = 'tutor', // 'tutor' | 'system' | 'participant'
    endedReason = 'tutor_ended',
    endedAt = null, // Date | null (defaults to NOW())
    notes = undefined,
    rating = undefined,
    presenceStats = null, // { sawAnyPresence, bothPresentSeconds } | null
    actorId = null,
    actorRole = 'system',
    ip = null,
    auditAction = 'session.end',
  } = {},
) {
  const endDate = endedAt instanceof Date ? endedAt : new Date();
  const startedMs = session.started_at ? new Date(session.started_at).getTime() : null;
  const actualDuration = startedMs != null
    ? Math.max(0, Math.round((endDate.getTime() - startedMs) / 1000))
    : 0;

  const minSeconds = config.minSessionPointsSeconds;
  const bothPresentSeconds = presenceStats?.sawAnyPresence
    ? Math.max(0, Number(presenceStats.bothPresentSeconds) || 0)
    : Number(session.both_present_seconds) || 0;

  // Presence guard applies when realtime presence samples exist for an Online call;
  // wall-clock elapsed duration is always enforced as the hard floor.
  const presenceMet = !presenceStats?.sawAnyPresence
    || session.mode !== 'online'
    || bothPresentSeconds >= Math.floor(minSeconds * 0.5);
  const meetsMinDuration = actualDuration >= minSeconds && presenceMet;

  const canPostPoints = !session.points_posted && meetsMinDuration;
  const needsFacultyReview = !session.points_posted && !meetsMinDuration;

  const effectiveReason = !meetsMinDuration && endedReason === 'tutor_ended'
    ? 'ended_below_min_duration'
    : endedReason;

  const { rows: [updatedSession] } = await client.query(
    `UPDATE sessions
        SET status = $1::session_status,
            ended_at = COALESCE($2::timestamptz, CURRENT_TIMESTAMP),
            actual_duration_seconds = $3,
            ended_by = $4,
            ended_reason = $5,
            needs_faculty_review = $6,
            points_posted = CASE WHEN $7 THEN true ELSE points_posted END,
            both_present_seconds = GREATEST(both_present_seconds, $8),
            notes = CASE WHEN $9::boolean THEN $10 ELSE notes END,
            rating = CASE WHEN $11::boolean THEN $12 ELSE rating END
      WHERE id = $13
      RETURNING *`,
    [
      targetStatus,
      endedAt ? endDate.toISOString() : null,
      actualDuration,
      endedBy,
      effectiveReason,
      needsFacultyReview,
      canPostPoints,
      bothPresentSeconds,
      notes !== undefined,
      notes ?? null,
      rating !== undefined,
      rating ?? null,
      session.id,
    ],
  );

  let referralResolved = null;
  let pointsToAward = 0;
  let learnerPoints = 0;
  const unlocks = [];

  if (canPostPoints) {
    if (session.referral_id) {
      const durationHours = Number(session.duration_hours) || 1;
      const { rows: dec } = await client.query(
        `UPDATE referrals
            SET hours_remaining = GREATEST(COALESCE(hours_remaining, hours_required) - $2, 0)
          WHERE id = $1
          RETURNING id, status, hours_remaining, hours_required`,
        [session.referral_id, durationHours],
      );
      const ref = dec[0];
      if (ref && ref.hours_remaining <= 0 && ref.status !== 'resolved') {
        const { rows: resolved } = await client.query(
          `UPDATE referrals SET status = 'resolved' WHERE id = $1 RETURNING id, status`,
          [ref.id],
        );
        referralResolved = resolved[0]?.status ?? null;
        await client.query(
          `INSERT INTO notifications (user_id, title, message, type)
           SELECT learner_id, 'Referral complete', $2, 'success' FROM referrals WHERE id = $1`,
          [ref.id, 'All mandatory hours completed — your referral is resolved.'],
        );
      }
    }

    const tutorEarned = (await client.query(SESSION_POINTS_EARNED_SQL, [session.tutor_id])).rows[0].earned;
    const learnerEarned = (await client.query(SESSION_POINTS_EARNED_SQL, [session.learner_id])).rows[0].earned;
    pointsToAward = awardWithinCap(50, tutorEarned, WEEKLY_TUTOR_SESSION_CAP);
    learnerPoints = awardWithinCap(25, learnerEarned, WEEKLY_LEARNER_SESSION_CAP);

    if (pointsToAward > 0) {
      await client.query(
        `INSERT INTO points_ledger (user_id, amount, description)
         VALUES ($1, $2, $3)`,
        [
          session.tutor_id,
          pointsToAward,
          `Session wrap-up — ${session.id.slice(0, 8)}${rating != null ? ` (${rating}★)` : ''}`,
        ],
      );
    }

    if (learnerPoints > 0) {
      await client.query(
        `INSERT INTO points_ledger (user_id, amount, description)
         VALUES ($1, $2, $3)`,
        [session.learner_id, learnerPoints, `Attendance credit — ${session.id.slice(0, 8)}`],
      );
    }

    const { rows: completedCount } = await client.query(
      `SELECT count(*)::int AS n FROM sessions WHERE tutor_id = $1 AND status IN ('completed', 'auto-closed') AND points_posted = true`,
      [session.tutor_id],
    );
    const totalDone = completedCount[0].n;
    const pushBadge = async (code) => {
      const { rows: b } = await client.query(
        `INSERT INTO user_badges (user_id, badge_id)
         SELECT $1, id FROM badges WHERE badge_code = $2
         ON CONFLICT (user_id, badge_id) DO NOTHING
         RETURNING (SELECT name FROM badges WHERE badge_code = $2) AS name`,
        [session.tutor_id, code],
      );
      if (b[0]) unlocks.push(b[0].name);
    };
    if (totalDone >= 1) await pushBadge('BG-001');
    if (totalDone >= 10) await pushBadge('BG-003');
  }

  // Notifications
  const code = session.session_code || session.id.slice(0, 8);
  if (endedBy === 'system') {
    const ptsMsg = canPostPoints
      ? ` ${pointsToAward > 0 ? `+${pointsToAward} tutor pts` : '0 tutor pts'} / ${learnerPoints > 0 ? `+${learnerPoints} learner pts` : '0 learner pts'} posted.`
      : ' Duration was below the minimum threshold, so no points were posted and it was flagged for faculty review.';
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, 'Session auto-closed', $2, 'warning')`,
      [session.learner_id, `Session ${code} was automatically closed at the day cutoff.${ptsMsg}`],
    );
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, 'Session auto-closed', $2, 'warning')`,
      [session.tutor_id, `Session ${code} was automatically closed at the day cutoff.${ptsMsg}`],
    );
  } else if (needsFacultyReview) {
    const shortMsg = `Session ${code} ended below the minimum duration (${actualDuration}s < ${minSeconds}s). No points or hours were posted and it was flagged for faculty review.`;
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, 'Session ended — flagged for review', $2, 'warning')`,
      [session.learner_id, shortMsg],
    );
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, 'Session ended — flagged for review', $2, 'warning')`,
      [session.tutor_id, shortMsg],
    );
  } else if (endedBy === 'tutor' && session.mode === 'online') {
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, 'Your tutor ended this session', $2, 'info')`,
      [
        session.learner_id,
        `Session ${code} has ended${learnerPoints ? ` (+${learnerPoints} attendance points)` : ''}. Submit your rating in the wrap-up screen.`,
      ],
    );
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, 'Session ended', $2, 'success')`,
      [session.tutor_id, `Session ${code} ended — ${pointsToAward} points posted.`],
    );
  } else {
    const ratingText = rating != null ? `rated ${rating}/5` : 'completed';
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, 'Session wrapped up', $2, 'success')`,
      [session.learner_id, `Your session was ${ratingText}${learnerPoints ? ` and earned ${learnerPoints} attendance points` : ''}.`],
    );
    await client.query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, 'Session wrapped up', $2, 'success')`,
      [session.tutor_id, `${pointsToAward} points posted for session ${session.id.slice(0, 8)}.`],
    );
  }

  await audit({
    actorId,
    actorRole,
    action: auditAction,
    entity: 'session',
    entityId: session.id,
    detail: {
      status: targetStatus,
      endedBy,
      endedReason: effectiveReason,
      durationSeconds: actualDuration,
      bothPresentSeconds,
      minSeconds,
      meetsMinDuration,
      needsFacultyReview,
      tutorPoints: pointsToAward,
      learnerPoints,
      referralResolved,
      capped: canPostPoints && (pointsToAward < 50 || learnerPoints < 25),
    },
    ip,
  }, client);

  const tutorBalance = (await client.query(
    `SELECT COALESCE(SUM(amount), 0)::int AS balance FROM points_ledger WHERE user_id = $1`,
    [session.tutor_id],
  )).rows[0].balance;

  return {
    session: updatedSession,
    actualDurationSeconds: actualDuration,
    bothPresentSeconds,
    meetsMinDuration,
    needsFacultyReview,
    pointsPosted: Boolean(updatedSession.points_posted),
    tutorBalance,
    referralResolved,
    points: pointsToAward,
    learnerPoints,
    capped: canPostPoints && (pointsToAward < 50 || learnerPoints < 25),
    badges: unlocks,
  };
}
