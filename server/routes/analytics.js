/** Superadmin analytics: SQL aggregates/CTEs only, one endpoint. */
import express from 'express';
import { query } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { httpError } from '../middleware/errors.js';

const router = express.Router();

/**
 * GET /analytics
 * { activeTutors, totalLearners, monthlySessions(prev30d), monthlySessionsPrev,
 *   recoveryRate(% referrals resolved), resolvedReferrals, totalReferrals,
 *   pointsIssued, avgRating, byDept: [{department, learners, tutors, referrals, completed}]}
 */
router.get('/analytics', requireAuth, requireRole('superadmin'), async (_req, res, next) => {
  try {
    const overview = await query(`
      WITH tutor_stats AS (
        SELECT count(*)::int AS active_tutors
        FROM users u
        WHERE u.role = 'tutor' AND u.is_verified
      ),
      learner_stats AS (
        SELECT count(*)::int AS total_learners FROM users WHERE role = 'learner'
      ),
      session_stats AS (
        SELECT
          count(*) FILTER (WHERE s.updated_at >= now() - interval '30 days')::int AS monthly,
          count(*) FILTER (
            WHERE s.updated_at >= now() - interval '60 days'
              AND s.updated_at <  now() - interval '30 days')::int AS monthly_prev,
          COALESCE(avg(rating), 0) AS avg_rating
        FROM sessions s
        WHERE s.status = 'completed'
      ),
      ref_stats AS (
        SELECT
          count(*)::int AS total,
          count(*) FILTER (WHERE status = 'resolved')::int AS resolved
        FROM referrals
      ),
      ledger_stats AS (
        SELECT COALESCE(SUM(amount) FILTER (WHERE amount > 0), 0)::int AS issued
        FROM points_ledger
      )
      SELECT
        t.active_tutors, l.total_learners, s.monthly, s.monthly_prev,
        round(s.avg_rating::numeric, 1) AS avg_rating,
        r.total, r.resolved,
        round((r.resolved::numeric / GREATEST(r.total, 1)) * 100) AS recovery_rate,
        lg.issued
      FROM tutor_stats t, learner_stats l, session_stats s, ref_stats r, ledger_stats lg`);
    const o = overview.rows[0];

    const byDept = await query(`
      WITH dept_list AS (
        SELECT DISTINCT COALESCE(department, split_part(COALESCE(program, ''), ' ', 1)) AS department
        FROM users
        WHERE COALESCE(department, split_part(COALESCE(program, ''), ' ', 1)) IN ('BSIT','BSBA','BSA','BSED')
      )
      SELECT d.department,
             (SELECT count(*) FROM users u WHERE u.role = 'learner'
               AND split_part(COALESCE(u.program,''), ' ', 1) = d.department)::int AS learners,
             (SELECT count(*) FROM users u WHERE u.role = 'tutor' AND u.is_verified
               AND split_part(COALESCE(u.program,''), ' ', 1) = d.department)::int AS tutors,
             (SELECT count(*) FROM referrals r JOIN users rl ON rl.id = r.learner_id
               WHERE split_part(COALESCE(rl.program,''), ' ', 1) = d.department)::int AS referrals,
             (SELECT count(*) FROM sessions s JOIN users sl ON sl.id = s.learner_id
               WHERE split_part(COALESCE(sl.program,''), ' ', 1) = d.department AND s.status = 'completed')::int AS completed
      FROM dept_list d
      ORDER BY learners DESC, tutors DESC`);

    const trends = await query(`
      WITH weeks AS (
        SELECT generate_series(now()::date - interval '5 weeks', now()::date, interval '1 week')::date AS wk
      )
      SELECT w.wk AS week,
             (SELECT count(*) FROM sessions s
              WHERE s.status='completed'
                AND s.updated_at >= w.wk AND s.updated_at < w.wk + interval '7 days')::int AS sessions
      FROM weeks w ORDER BY w.wk`);

    res.json({
      activeTutors: o.active_tutors,
      totalLearners: o.total_learners,
      monthlySessions: o.monthly,
      monthlyPrev: o.monthly_prev,
      avgRating: o.avg_rating,
      totalReferrals: o.total,
      resolvedReferrals: o.resolved,
      recoveryRate: o.recovery_rate,
      pointsIssued: o.issued,
      byDept: byDept.rows,
      trends: trends.rows,
    });
  } catch (e) { next(e); }
});

export default router;
