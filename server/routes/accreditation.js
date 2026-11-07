/**
 * Tutor accreditation: apply → take exam → server-side grading → superadmin approve/reject.
 * Correct answers never leave the server (only graded scores).
 */
import express from 'express';
import rateLimit from 'express-rate-limit';
import { query, withTransaction } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { httpError } from '../middleware/errors.js';
import { audit, requestIp } from '../lib/audit.js';
import {
  MAX_APPLICATION_FILES,
  uploadApplicationDocument,
  validateApplicationFile,
} from '../lib/application-files.js';

const router = express.Router();
const uploadLimiter = rateLimit({
  windowMs: 60_000,
  max: 30,
  message: { error: 'Slow down on file uploads' },
});
const EXAM_WINDOW_MINUTES = 30;

const APP_SQL = `
  SELECT a.id, a.application_code, a.exam_score, a.exam_started_at, a.exam_submitted_at,
         a.status, a.date_applied, a.achievements,
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
    if (!subjectIds.every((id) => UUID_RE.test(String(id)))) {
      throw httpError(400, 'Unknown subject in list');
    }
    const known = await query(`SELECT count(*)::int AS n FROM subjects WHERE id = ANY($1::uuid[])`, [subjectIds]);
    if (known.rows[0].n !== new Set(subjectIds).size) throw httpError(400, 'Unknown subject in list');

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

    const created = await withTransaction(async (client) => {
      const existing = await client.query(
        `SELECT id FROM tutor_applications WHERE user_id = $1 AND status = 'pending' FOR UPDATE`,
        [req.user.id],
      );
      if (existing.rows[0]) throw httpError(409, 'You already have a pending application');

      const n = (await client.query(
        `SELECT COALESCE(max(NULLIF(regexp_replace(application_code, '[^0-9]', '', 'g'), '')::int), 0) + 1 AS n
           FROM tutor_applications`,
      )).rows[0].n;
      const code = `APP-${String(n).padStart(3, '0')}`;
      const { rows } = await client.query(
        `INSERT INTO tutor_applications (application_code, user_id, date_applied, achievements)
         VALUES ($1, $2, CURRENT_DATE, $3::jsonb) RETURNING id, application_code, status`,
        [code, req.user.id, documents.length ? JSON.stringify(documents) : null]);
      await client.query(
        `INSERT INTO application_subjects (application_id, subject_id)
         SELECT $1, uuid FROM (SELECT DISTINCT id AS uuid FROM subjects WHERE id = ANY($2::uuid[])) x`,
        [rows[0].id, subjectIds]);
      await audit({
        actorId: req.user.id,
        actorRole: req.user.role,
        action: 'accreditation.apply',
        entity: 'tutor_application',
        entityId: rows[0].id,
        detail: { code, subjects: subjectIds.length, notes: documents.length },
        ip: requestIp(req),
      }, client);
      return rows[0];
    });

    res.status(201).json({ application: created });
  } catch (e) {
    // The partial unique index is the final guard against a double-submit race.
    if (e.code === '23505') {
      e.status = 409;
      e.message = 'You already have a pending application';
    }
    next(e);
  }
});

/** GET /accreditation/exam — questions WITHOUT answers; starts the 30-minute clock. */
router.get('/accreditation/exam', requireAuth, async (req, res, next) => {
  try {
    const app = (await query(
      `SELECT id, status, exam_score, exam_started_at
         FROM tutor_applications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [req.user.id])).rows[0];
    if (!app) throw httpError(404, 'No application — submit one first');
    if (app.status !== 'pending') throw httpError(409, `Application already ${app.status}`);
    if (app.exam_score != null) throw httpError(409, 'Exam already submitted for this application');
    if (app.exam_started_at) {
      const elapsed = Date.now() - new Date(app.exam_started_at).getTime();
      if (elapsed > EXAM_WINDOW_MINUTES * 60_000) {
        throw httpError(409, 'The 30-minute exam window has closed. Ask the superadmin to reset the attempt.');
      }
    }
    const started = await query(
      `UPDATE tutor_applications
          SET exam_started_at = COALESCE(exam_started_at, now())
        WHERE id = $1
        RETURNING exam_started_at`,
      [app.id],
    );
    const startedAt = started.rows[0].exam_started_at;
    const { rows } = await query(
      `SELECT question_number, question, options FROM exam_questions ORDER BY question_number`);
    res.json({
      applicationId: app.id,
      startedAt,
      expiresAt: new Date(new Date(startedAt).getTime() + EXAM_WINDOW_MINUTES * 60_000).toISOString(),
      windowMinutes: EXAM_WINDOW_MINUTES,
      questions: rows,
    });
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

    const result = await withTransaction(async (client) => {
      const app = (await client.query(
        `SELECT id, status, exam_score, exam_started_at
           FROM tutor_applications
          WHERE user_id = $1 AND status = 'pending'
          ORDER BY created_at DESC LIMIT 1
          FOR UPDATE`,
        [req.user.id],
      )).rows[0];
      if (!app) throw httpError(404, 'No pending application found');
      if (app.exam_score != null) throw httpError(409, 'Exam already submitted for this application');
      if (!app.exam_started_at) throw httpError(400, 'Open the exam first to start the 30-minute timer');
      const elapsed = Date.now() - new Date(app.exam_started_at).getTime();
      if (elapsed > EXAM_WINDOW_MINUTES * 60_000) {
        throw httpError(409, 'Exam time limit exceeded — the attempt is closed');
      }

      const { rows: qs } = await client.query(
        `SELECT question_number, answer FROM exam_questions ORDER BY question_number`);
      if (qs.length === 0) throw httpError(500, 'Exam question bank is empty');
      const grades = {};
      let correct = 0;
      for (const q of qs) {
        const picked = Number(answersRaw[String(q.question_number)] ?? answersRaw[q.question_number] ?? -1);
        const ok = picked === q.answer;
        grades[q.question_number] = ok;
        if (ok) correct += 1;
      }
      const score = Math.round((correct / qs.length) * 100);

      const { rows } = await client.query(
        `UPDATE tutor_applications
            SET exam_score = $1, grades = $2::jsonb, exam_submitted_at = now()
          WHERE id = $3
          RETURNING id, exam_score, status, exam_submitted_at`,
        [score, JSON.stringify(grades), app.id]);
      await audit({
        actorId: req.user.id,
        actorRole: req.user.role,
        action: 'accreditation.exam_submit',
        entity: 'tutor_application',
        entityId: app.id,
        detail: { score, correct, total: qs.length },
        ip: requestIp(req),
      }, client);
      return { ...rows[0], passed: score >= PASS_MARK * 100, correct, total: qs.length };
    });

    res.json(result);
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
 * POST /accreditation/:id/reset-exam — superadmin operation.
 * A frozen browser or an expired 30-minute window must not strand a pending
 * applicant forever. Clears only the exam attempt, never the application or
 * its files.
 */
router.post('/accreditation/:id/reset-exam', requireAuth, requireRole('superadmin'), async (req, res, next) => {
  try {
    const reset = await withTransaction(async (client) => {
      const app = (await client.query(
        `SELECT id, user_id, status FROM tutor_applications WHERE id = $1 FOR UPDATE`,
        [req.params.id],
      )).rows[0];
      if (!app) throw httpError(404, 'Application not found');
      if (app.status !== 'pending') throw httpError(409, `Application already ${app.status}`);
      await client.query(
        `UPDATE tutor_applications
            SET exam_score = NULL, grades = NULL, exam_started_at = NULL, exam_submitted_at = NULL
          WHERE id = $1`,
        [app.id],
      );
      await audit({
        actorId: req.user.id,
        actorRole: req.user.role,
        action: 'accreditation.exam_reset',
        entity: 'tutor_application',
        entityId: app.id,
        detail: { applicantId: app.user_id },
        ip: requestIp(req),
      }, client);
      return app;
    });
    res.json({ reset: true, applicationId: reset.id });
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
  uploadLimiter,
  uploadApplicationDocument,
  async (req, res, next) => {
    try {
      if (!UUID_RE.test(String(req.params.id))) throw httpError(404, 'Application not found');
      const file = validateApplicationFile(req.file);
      const created = await withTransaction(async (client) => {
        const app = (await client.query(
          `SELECT id, user_id, status FROM tutor_applications WHERE id = $1 FOR UPDATE`,
          [req.params.id],
        )).rows[0];
        if (!app) throw httpError(404, 'Application not found');
        if (app.user_id !== req.user.id) throw httpError(403, 'Not your application');
        if (app.status !== 'pending') throw httpError(409, `Application already ${app.status}`);
        const count = (await client.query(
          `SELECT count(*)::int AS n FROM application_documents WHERE application_id = $1`, [app.id])).rows[0].n;
        if (count >= MAX_APPLICATION_FILES) {
          throw httpError(409, `Up to ${MAX_APPLICATION_FILES} files per application`);
        }
        const { rows } = await client.query(
          `INSERT INTO application_documents (application_id, file_name, mime_type, size_bytes, data)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, application_id, file_name, mime_type, size_bytes, created_at`,
          [app.id, file.fileName, file.mimeType, file.sizeBytes, file.data]);
        await audit({
          actorId: req.user.id,
          actorRole: req.user.role,
          action: 'accreditation.document_upload',
          entity: 'application_document',
          entityId: rows[0].id,
          detail: { applicationId: app.id, fileName: file.fileName, sizeBytes: file.sizeBytes },
          ip: requestIp(req),
        }, client);
        return rows[0];
      });
      res.status(201).json({ document: created });
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
    await audit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'accreditation.document_delete',
      entity: 'application_document',
      entityId: doc.id,
      ip: requestIp(req),
    });
    res.json({ removed: true });
  } catch (e) { next(e); }
});

/** POST /accreditation/:id/approve — sets tutor status + certified_by_id */
router.post('/accreditation/:id/approve', requireAuth, requireRole('superadmin'), async (req, res, next) => {
  try {
    const approved = await withTransaction(async (client) => {
      const app = (await client.query(
        `SELECT id, user_id, exam_score, status FROM tutor_applications WHERE id = $1 FOR UPDATE`,
        [req.params.id],
      )).rows[0];
      if (!app) throw httpError(404, 'Application not found');
      if (app.status !== 'pending') throw httpError(409, `Application already ${app.status}`);
      if (app.exam_score == null) throw httpError(409, 'Applicant has not completed the exam yet');
      const documentCount = (await client.query(
        `SELECT count(*)::int AS n FROM application_documents WHERE application_id = $1`, [req.params.id])).rows[0].n;
      if (documentCount === 0) {
        throw httpError(409, 'Attach at least one supporting document before approving');
      }

      await client.query(`UPDATE tutor_applications SET status = 'approved' WHERE id = $1`, [req.params.id]);
      // Grant tutor role + verified status + certifier so the applicant appears
      // in /tutors, can accept session requests, and can stage check-in tokens.
      await client.query(
        `UPDATE users SET role = 'tutor', is_verified = true, certified_by_id = $1 WHERE id = $2`,
        [req.user.id, app.user_id]);
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, 'Application approved', $2, 'success')`,
        [app.user_id, 'Your tutor accreditation was approved and verified.']);
      await audit({
        actorId: req.user.id,
        actorRole: req.user.role,
        action: 'accreditation.approve',
        entity: 'tutor_application',
        entityId: req.params.id,
        detail: { applicantId: app.user_id, examScore: app.exam_score, documents: documentCount },
        ip: requestIp(req),
      }, client);
      return app;
    });
    res.json({ approved: true, applicationId: req.params.id, applicantId: approved.user_id });
  } catch (e) { next(e); }
});

router.post('/accreditation/:id/reject', requireAuth, requireRole('superadmin'), async (req, res, next) => {
  try {
    const reason = String(req.body?.reason ?? '').slice(0, 300) || 'Application rejected.';
    const rejected = await withTransaction(async (client) => {
      const { rows } = await client.query(
        `UPDATE tutor_applications SET status = 'rejected'
         WHERE id = $1 AND status = 'pending' RETURNING id, user_id`, [req.params.id]);
      if (!rows[0]) throw httpError(404, 'No pending application with that id');
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, 'Application rejected', $2, 'warning')`,
        [rows[0].user_id, reason]);
      await audit({
        actorId: req.user.id,
        actorRole: req.user.role,
        action: 'accreditation.reject',
        entity: 'tutor_application',
        entityId: req.params.id,
        detail: { applicantId: rows[0].user_id, reason },
        ip: requestIp(req),
      }, client);
      return rows[0];
    });
    res.json({ rejected: true, applicationId: req.params.id, applicantId: rejected.user_id });
  } catch (e) { next(e); }
});

export default router;
