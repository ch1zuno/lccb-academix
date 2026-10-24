import express from 'express';
import { query } from '../db.js';

const router = express.Router();

/**
 * GET /public/overview
 * Anonymous, read-only numbers for the landing page: the ledger totals,
 * per-subject tutor/session counts, the current tutor honor roll and the
 * cheapest rewards. No names of learners, no contact details.
 */
// 60s micro-cache: the landing fetches this on every visit and the aggregates
// are the slowest part of a cold serverless first paint. Each warm instance
// keeps its own copy — fine for anonymous counters.
let overviewCache = { at: 0, data: null };
const OVERVIEW_TTL_MS = 60_000;

router.get('/public/overview', async (_req, res, next) => {
  try {
    res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
    if (overviewCache.data && Date.now() - overviewCache.at < OVERVIEW_TTL_MS) {
      return res.json(overviewCache.data);
    }
    const [totalsResult, subjectsResult, tutorsResult, rewardsResult] = await Promise.all([
      query(`
        SELECT
          (SELECT count(*)::int FROM users WHERE role = 'tutor' AND is_verified) AS tutors,
          (SELECT count(*)::int FROM users WHERE role = 'learner') AS learners,
          (SELECT count(*)::int FROM sessions WHERE status = 'completed') AS sessions,
          (SELECT COALESCE(sum(duration_hours), 0) FROM sessions WHERE status = 'completed') AS hours,
          (SELECT COALESCE(sum(amount), 0)::int FROM points_ledger WHERE amount > 0) AS points_issued
      `),
      query(`
        SELECT s.code, s.name, s.department,
               (SELECT count(DISTINCT us.user_id)::int
                  FROM user_subjects us
                  JOIN users u ON u.id = us.user_id
                 WHERE us.subject_id = s.id
                   AND u.role = 'tutor' AND u.is_verified AND u.is_available) AS tutors,
               (SELECT count(*)::int FROM sessions ss
                 WHERE ss.subject_id = s.id AND ss.status = 'completed') AS sessions
          FROM subjects s
         ORDER BY s.code
      `),
      query(`
        SELECT u.name, u.program,
               (SELECT count(*)::int FROM sessions ss
                 WHERE ss.tutor_id = u.id AND ss.status = 'completed') AS sessions,
               (SELECT round(avg(ss.rating), 1) FROM sessions ss
                 WHERE ss.tutor_id = u.id AND ss.status = 'completed' AND ss.rating IS NOT NULL) AS rating,
               COALESCE((SELECT sum(l.amount)::int FROM points_ledger l WHERE l.user_id = u.id), 0) AS points
          FROM users u
         WHERE u.role = 'tutor' AND u.is_verified
         ORDER BY points DESC, sessions DESC, u.name
         LIMIT 6
      `),
      query(`
        SELECT name, cost, category
          FROM rewards
         WHERE stock > 0
         ORDER BY cost ASC
         LIMIT 4
      `),
    ]);

    const totals = totalsResult.rows[0] ?? {};
    totals.hours = Number(totals.hours ?? 0);

    const payload = {
      totals,
      subjects: subjectsResult.rows,
      tutors: tutorsResult.rows,
      rewards: rewardsResult.rows,
    };
    overviewCache = { at: Date.now(), data: payload };
    res.json(payload);
  } catch (e) {
    next(e);
  }
});

export default router;
