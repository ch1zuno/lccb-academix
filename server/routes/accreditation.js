/**
 * Tutor accreditation: apply → take exam → server-side grading → superadmin approve/reject.
 * Correct answers never leave the server (only graded scores).
 */
import express from 'express';
import { query } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { httpError } from '../middleware/errors.js';

const router = express.Router();

const APP_SQL = `
  SELECT a.id, a.application_code, a.exam_score, a.status, a.date_applied,
         u.name, u.custom_id, u.email, u.program, u.department,
         COALESCE((SELECT json_agg(json_build_object('code', s.code, 'name', s.name))
                   FROM application_subjects asx JOIN subjects s ON s.id = asx.subject_id
                   WHERE asx.application_id = a.id), '[]') AS subjects
  FROM tutor_applications a JOIN users u ON u.id = a.user_id`;

router.get('/accreditation/mine', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(`${APP_SQL} WHERE a.user_id = $1 ORDER BY a.created_at DESC`, [req.user.id]);
    res.json({ application: rows[0] ?? null });
  } catch (e) { next(e); }
});

/** POST /accreditation/apply  { subjectIds: [uuid] } — only learners apply */
router.post('/accreditation/apply', requireAuth, requireRole('learner'), async (req, res, next) => {
  try {
    const subjectIds = Array.isArray(req.body?.subjectIds) ? req.body.subjectIds : [];
    if (subjectIds.length === 0 || subjectIds.length > 6) {
      throw httpError(400, 'subjectIds must list 1–6 subject ids');
    }
    // only real subjects
    const known = await query(`SELECT count(*)::int AS n FROM subjects WHERE id = ANY($1::uuid[])`, [subjectIds]);
    if (known.rows[0].n !== subjectIds.length) throw httpError(400, 'Unknown subject in list');

    const existing = await query(
      `SELECT id, status FROM tutor_applications WHERE user_id = $1 AND status = 'pending'`, [req.user.id]);
    if (existing.rows[0]) throw httpError(409, 'You already have a pending application');

    const n = (await query(`SELECT count(*)::int AS n FROM tutor_applications`)).rows[0].n;
    const code = `APP-${String(n + 1).padStart(3, '0')}`;
    const { rows } = await query(
      `INSERT INTO tutor_applications (application_code, user_id, date_applied)
       VALUES ($1, $2, CURRENT_DATE) RETURNING id, application_code, status`,
      [code, req.user.id]);
    await query(
      `INSERT INTO application_subjects (application_id, subject_id)
       SELECT $1, uuid FROM (SELECT id AS uuid FROM subjects WHERE id = ANY($2::uuid[])) x`,
      [rows[0].id, subjectIds]);
    res.status(201).json({ application: rows[0] });
  } catch (e) { next(e); }
});

/** GET /accreditation/exam — questions WITHOUT answers for the caller's latest application */
router.get('/accreditation/exam', requireAuth, async (req, res, next) => {
  try {
    const app = (await query(
      `SELECT id, status FROM tutor_applications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [req.user.id])).rows[0];
    if (!app) throw httpError(404, 'No application — submit one first');
    if (app.status !== 'pending') throw httpError(409, `Application already ${app.status}`);
    const { rows } = await query(
      `SELECT question_number, question, options FROM exam_questions ORDER BY question_number`);
    res.json({ applicationId: app.id, questions: rows });
  } catch (e) { next(e); }
});

/**
 * POST /accreditation/exam { answers: {"question_number": selectedIndex} }
 * Grades server-side; stores score + per-question grade map. Status stays pending
 * until the superadmin approves/rejects.
 */
const PASS_MARK = 0.7;

router.post('/accreditation/exam', requireAuth, async (req, res, next) => {
  try {
    const answersRaw = req.body?.answers ?? {};
    if (typeof answersRaw !== 'object' || Array.isArray(answersRaw) || Object.keys(answersRaw).length === 0) {
      throw httpError(400, 'answers object required, e.g. {"1": 2}');
    }
    const app = (await query(
      `SELECT id, status, exam_score FROM tutor_applications WHERE user_id = $1 AND status = 'pending' ORDER BY created_at DESC LIMIT 1`,
      [req.user.id])).rows[0];
    if (!app) throw httpError(404, 'No pending application found');
    if (app.exam_score != null) throw httpError(409, 'Exam already submitted for this application');

    const { rows: qs } = await query(`SELECT question_number, answer FROM exam_questions ORDER BY question_number`);
    const grades = {};
    let correct = 0;
    for (const q of qs) {
      const picked = Number(answersRaw[String(q.question_number)] ?? answersRaw[q.question_number] ?? -1);
      const ok = picked === q.answer;
      grades[q.question_number] = ok;
      if (ok) correct += 1;
    }
    const score = Math.round((correct / qs.length) * 100);

    const { rows } = await query(
      `UPDATE tutor_applications SET exam_score = $1, grades = $2::jsonb
       WHERE id = $3 RETURNING id, exam_score, status`,
      [score, JSON.stringify(grades), app.id]);

    res.json({ ...rows[0], passed: score >= PASS_MARK * 100, correct, total: qs.length });
  } catch (e) { next(e); }
});

/** GET /accreditation/applications — superadmin roster */
router.get('/accreditation/applications', requireAuth, requireRole('superadmin'), async (_req, res, next) => {
  try {
    const { rows } = await query(`${APP_SQL} ORDER BY a.created_at DESC`);
    res.json({ applications: rows });
  } catch (e) { next(e); }
});

/** POST /accreditation/:id/approve — sets tutor status + certified_by_id */
router.post('/accreditation/:id/approve', requireAuth, requireRole('superadmin'), async (req, res, next) => {
  try {
    const { rows: app } = await query(
      `SELECT id, user_id, exam_score, status FROM tutor_applications WHERE id = $1`, [req.params.id]);
    if (!app[0]) throw httpError(404, 'Application not found');
    if (app[0].status !== 'pending') throw httpError(409, `Application already ${app[0].status}`);
    if (app[0].exam_score == null) throw httpError(409, 'Applicant has not completed the exam yet');

    await query('BEGIN');
    await query(`UPDATE tutor_applications SET status = 'approved' WHERE id = $1`, [req.params.id]);
    // tutor status + certifier (role is NOT changed — a learner becomes a *verified tutor candidate*)
    await query(
      `UPDATE users SET is_verified = true, certified_by_id = $1 WHERE id = $2`,
      [req.user.id, app[0].user_id]);
    await query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, 'Application approved', $2, 'success')`,
      [app[0].user_id, 'Your tutor accreditation was approved and verified.']);
    await query('COMMIT');
    res.json({ approved: true, applicationId: req.params.id });
  } catch (e) {
    await query('ROLLBACK').catch(() => {});
    next(e);
  }
});

router.post('/accreditation/:id/reject', requireAuth, requireRole('superadmin'), async (req, res, next) => {
  try {
    const { rows } = await query(
      `UPDATE tutor_applications SET status = 'rejected'
       WHERE id = $1 AND status = 'pending' RETURNING id, user_id`, [req.params.id]);
    if (!rows[0]) throw httpError(404, 'No pending application with that id');
    const reason = String(req.body?.reason ?? '').slice(0, 300) || 'Application rejected.';
    await query(
      `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, 'Application rejected', $2, 'warning')`,
      [rows[0].user_id, reason]).catch(() => {});
    res.json({ rejected: true, applicationId: req.params.id });
  } catch (e) { next(e); }
});

export default router;
