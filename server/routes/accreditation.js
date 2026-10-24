/**
 * Tutor accreditation: apply → take exam → server-side grading → superadmin approve/reject.
 * Correct answers never leave the server (only graded scores).
 */
import express from 'express';
import { query } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { httpError } from '../middleware/errors.js';
import {
  MAX_APPLICATION_FILES,
  uploadApplicationDocument,
  validateApplicationFile,
} from '../lib/application-files.js';

const router = express.Router();

const APP_SQL = `
  SELECT a.id, a.application_code, a.exam_score, a.status, a.date_applied, a.achievements,
         u.name, u.custom_id, u.email, u.program, u.department,
         COALESCE((SELECT json_agg(json_build_object('code', s.code, 'name', s.name))
                   FROM application_subjects asx JOIN subjects s ON s.id = asx.subject_id
                   WHERE asx.application_id = a.id), '[]') AS subjects,
         (SELECT count(*)::int FROM application_documents d WHERE d.application_id = a.id) AS document_count
  FROM tutor_applications a JOIN users u ON u.id = a.user_id`;

const DOCUMENT_META_SQL = `
  SELECT id, application_id, file_name, mime_type, size_bytes, created_at
  FROM application_documents`;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Load an application the caller may see: its owner or a superadmin. */
async function readableApplication(req, id) {
  if (!UUID_RE.test(String(id))) throw httpError(404, 'Application not found');
  const { rows } = await query(
    `SELECT id, user_id, status FROM tutor_applications WHERE id = $1`, [id]);
  const app = rows[0];
  if (!app) throw httpError(404, 'Application not found');
  if (req.user.role !== 'superadmin' && app.user_id !== req.user.id) {
    throw httpError(403, 'Not your application');
  }
  return app;
}

router.get('/accreditation/mine', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(`${APP_SQL} WHERE a.user_id = $1 ORDER BY a.created_at DESC`, [req.user.id]);
    res.json({ application: rows[0] ?? null });
  } catch (e) { next(e); }
});

/** POST /accreditation/apply  { subjectIds: [uuid], achievements?: [{title, detail?, link?}] }
 *  — only learners apply. Achievements are academic-record notes (text/links);
 *  real files are added afterwards through the document endpoints. */
router.post('/accreditation/apply', requireAuth, requireRole('learner'), async (req, res, next) => {
  try {
    const subjectIds = Array.isArray(req.body?.subjectIds) ? req.body.subjectIds : [];
    if (subjectIds.length === 0 || subjectIds.length > 6) {
      throw httpError(400, 'subjectIds must list 1–6 subject ids');
    }
    // only real subjects
    const known = await query(`SELECT count(*)::int AS n FROM subjects WHERE id = ANY($1::uuid[])`, [subjectIds]);
    if (known.rows[0].n !== subjectIds.length) throw httpError(400, 'Unknown subject in list');

    // achievement notes: max 8; title required, link must be a real URL
    const rawDocs = Array.isArray(req.body?.achievements) ? req.body.achievements : [];
    if (rawDocs.length > 8) throw httpError(400, 'Up to 8 achievement notes allowed');
    const badDoc = rawDocs.some(
      (d) => !String(d?.title ?? '').trim() && (String(d?.detail ?? '').trim() || String(d?.link ?? '').trim()));
    if (badDoc) throw httpError(400, 'Every achievement note needs a title');
    const documents = rawDocs
      .map((d) => ({
        title: String(d?.title ?? '').trim().slice(0, 120),
        detail: String(d?.detail ?? '').trim().slice(0, 300),
        link: String(d?.link ?? '').trim().slice(0, 400),
      }))
      .filter((d) => d.title);
    for (const d of documents) {
      if (d.link && !/^https?:\/\//i.test(d.link)) throw httpError(400, 'Achievement links must start with http:// or https://');
    }

    const existing = await query(
      `SELECT id, status FROM tutor_applications WHERE user_id = $1 AND status = 'pending'`, [req.user.id]);
    if (existing.rows[0]) throw httpError(409, 'You already have a pending application');

    const n = (await query(`SELECT count(*)::int AS n FROM tutor_applications`)).rows[0].n;
    const code = `APP-${String(n + 1).padStart(3, '0')}`;
    const { rows } = await query(
      `INSERT INTO tutor_applications (application_code, user_id, date_applied, achievements)
       VALUES ($1, $2, CURRENT_DATE, $3::jsonb) RETURNING id, application_code, status`,
      [code, req.user.id, documents.length ? JSON.stringify(documents) : null]);
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

/**
 * POST /accreditation/:id/documents — attach one file (multipart field "document").
 * Owner only, pending only, max 5 files, 4 MB each. One file per request keeps
 * every call under Vercel's 4.5 MB body limit.
 */
router.post(
  '/accreditation/:id/documents',
  requireAuth,
  requireRole('learner'),
  uploadApplicationDocument,
  async (req, res, next) => {
    try {
      const app = await readableApplication(req, req.params.id);
      if (app.status !== 'pending') throw httpError(409, `Application already ${app.status}`);
      const count = (await query(
        `SELECT count(*)::int AS n FROM application_documents WHERE application_id = $1`, [app.id])).rows[0].n;
      if (count >= MAX_APPLICATION_FILES) {
        throw httpError(409, `Up to ${MAX_APPLICATION_FILES} files per application`);
      }
      const file = validateApplicationFile(req.file);
      const { rows } = await query(
        `INSERT INTO application_documents (application_id, file_name, mime_type, size_bytes, data)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, application_id, file_name, mime_type, size_bytes, created_at`,
        [app.id, file.fileName, file.mimeType, file.sizeBytes, file.data]);
      res.status(201).json({ document: rows[0] });
    } catch (e) { next(e); }
  },
);

/** GET /accreditation/:id/documents — metadata only (never the bytes). */
router.get('/accreditation/:id/documents', requireAuth, async (req, res, next) => {
  try {
    const app = await readableApplication(req, req.params.id);
    const { rows } = await query(
      `${DOCUMENT_META_SQL} WHERE application_id = $1 ORDER BY created_at, id`, [app.id]);
    res.json({ documents: rows });
  } catch (e) { next(e); }
});

/** GET /accreditation/documents/:id — stream one file to its owner or a superadmin. */
router.get('/accreditation/documents/:id', requireAuth, async (req, res, next) => {
  try {
    if (!UUID_RE.test(String(req.params.id))) throw httpError(404, 'Document not found');
    const { rows } = await query(
      `SELECT d.file_name, d.mime_type, d.size_bytes, d.data, a.user_id
       FROM application_documents d JOIN tutor_applications a ON a.id = d.application_id
       WHERE d.id = $1`, [req.params.id]);
    const doc = rows[0];
    if (!doc) throw httpError(404, 'Document not found');
    if (req.user.role !== 'superadmin' && doc.user_id !== req.user.id) {
      throw httpError(403, 'Not your document');
    }
    const disposition = req.query.download ? 'attachment' : 'inline';
    const safeName = String(doc.file_name)
      .replace(/["\\\r\n]/g, '')
      .replace(/[^\x20-\x7e]/g, '_');
    res.set({
      'Content-Type': doc.mime_type,
      'Content-Length': String(doc.size_bytes),
      'Content-Disposition': `${disposition}; filename="${safeName || 'supporting-document'}"`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    res.send(doc.data);
  } catch (e) { next(e); }
});

/**
 * DELETE /accreditation/documents/:id — the applicant may withdraw one of their
 * own files while the application is still pending. Approved/rejected files are
 * the review record and stay locked.
 */
router.delete('/accreditation/documents/:id', requireAuth, requireRole('learner'), async (req, res, next) => {
  try {
    if (!UUID_RE.test(String(req.params.id))) throw httpError(404, 'Document not found');
    const { rows } = await query(
      `SELECT d.id, a.user_id, a.status
       FROM application_documents d JOIN tutor_applications a ON a.id = d.application_id
       WHERE d.id = $1`, [req.params.id]);
    const doc = rows[0];
    if (!doc) throw httpError(404, 'Document not found');
    if (doc.user_id !== req.user.id) throw httpError(403, 'Not your document');
    if (doc.status !== 'pending') throw httpError(409, 'Documents are locked once the application is decided');
    await query(`DELETE FROM application_documents WHERE id = $1`, [doc.id]);
    res.json({ removed: true });
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
    const documentCount = (await query(
      `SELECT count(*)::int AS n FROM application_documents WHERE application_id = $1`, [req.params.id])).rows[0].n;
    if (documentCount === 0) {
      throw httpError(409, 'Attach at least one supporting document before approving');
    }

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
