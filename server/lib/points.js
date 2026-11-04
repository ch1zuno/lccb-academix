/**
 * Session-points guardrails.
 *
 * A wrapped-up session still completes its academic record even when a weekly
 * cap is reached; only the ledger credit is reduced. The cap is on *session
 * points earned in the last 7 days*, not on the lifetime balance, so redeemed
 * points never reduce what a user can earn next week.
 */
export const WEEKLY_TUTOR_SESSION_CAP = 500;
export const WEEKLY_LEARNER_SESSION_CAP = 250;

export function awardWithinCap(requested, alreadyEarned, cap) {
  const want = Math.max(0, Math.floor(Number(requested) || 0));
  const earned = Math.max(0, Math.floor(Number(alreadyEarned) || 0));
  const limit = Math.max(0, Math.floor(Number(cap) || 0));
  return Math.max(0, Math.min(want, limit - earned));
}

/** Shared SQL fragment: points earned from sessions in the rolling week. */
export const SESSION_POINTS_EARNED_SQL = `
  SELECT COALESCE(SUM(amount), 0)::int AS earned
  FROM points_ledger
  WHERE user_id = $1
    AND amount > 0
    AND created_at >= now() - interval '7 days'
    AND (description LIKE 'Session wrap-up%' OR description LIKE 'Attendance credit%')
`;
