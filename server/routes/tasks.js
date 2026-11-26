/** Classroom-style tutor tasks, student turn-ins, reviews, and image attachments. */
import crypto from 'node:crypto';
import express from 'express';
import { query, withTransaction } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { httpError } from '../middleware/errors.js';
import { audit, requestIp } from '../lib/audit.js';
import {
  MAX_TASK_IMAGES,
  validateGoogleFormUrl,
  validateTaskImage,
  uploadTaskImage,
} from '../lib/task-validation.js';
import { saveTaskImage, readTaskImage, deleteTaskImage } from '../lib/task-storage.js';
import { syncDueSoonNotifications } from './notifications.js';

const router = express.Router();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_TITLE = 200;
const MAX_DESC = 4000;
const MAX_FEEDBACK = 2000;

function parseUuid(value, label = 'id') {
  const id = String(value ?? '').trim();
  if (!UUID_RE.test(id)) throw httpError(400, `Invalid ${label}`);
  return id;
}

function parseDueAt(raw) {
  if (raw === undefined) return undefined;
  if (raw === null || String(raw).trim() === '') return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) throw httpError(400, 'Invalid due date');
  return d.toISOString();
}

function parseTitle(raw) {
  const title = String(raw ?? '').trim();
  if (!title) throw httpError(400, 'Task title is required');
  if (title.length > MAX_TITLE) throw httpError(400, `Task title must be ${MAX_TITLE} characters or fewer`);
  return title;
}

function parseDescription(raw) {
  const desc = String(raw ?? '').trim();
  if (desc.length > MAX_DESC) throw httpError(400, `Task description must be ${MAX_DESC} characters or fewer`);
  return desc;
}

async function assertAccreditedTutor(req) {
  if (req.user.role !== 'tutor') {
    throw httpError(403, 'Only accredited tutors can manage tasks');
  }
  const { rows } = await query(`SELECT is_verified FROM users WHERE id = $1`, [req.user.id]);
  if (!rows[0]?.is_verified) {
    throw httpError(403, 'Only accredited tutors can manage tasks');
  }
}

/** Learners sharing an active session, request, or referral with this tutor. */
async function listActiveTuteeIds(tutorId, runner = query) {
  const { rows } = await runner(
    `SELECT DISTINCT learner_id AS id FROM (
       SELECT learner_id FROM sessions
        WHERE tutor_id = $1 AND status IN ('upcoming', 'in-progress', 'completed')
       UNION
       SELECT learner_id FROM session_requests
        WHERE tutor_id = $1 AND status IN ('pending', 'accepted')
       UNION
       SELECT learner_id FROM referrals
        WHERE assigned_tutor_id = $1 AND status IN ('assigned', 'in-progress')
     ) rel
     JOIN users u ON u.id = rel.learner_id AND u.role = 'learner'`,
    [tutorId],
  );
  return new Set(rows.map((r) => r.id));
}

function formatAttachment(row) {
  return {
    id: row.id,
    task_id: row.task_id,
    assignment_id: row.assignment_id,
    file_name: row.file_name,
    mime_type: row.mime_type,
    size_bytes: row.size_bytes,
    created_at: row.created_at,
    url: `/api/tasks/attachments/${row.id}`,
  };
}

/** GET /tasks/tutees — active tutees this tutor may assign tasks to. */
router.get('/tasks/tutees', requireAuth, async (req, res, next) => {
  try {
    await assertAccreditedTutor(req);
    const { rows } = await query(
      `SELECT DISTINCT u.id, u.custom_id, u.name, u.program,
              COALESCE(ua.r2_url, CASE WHEN ua.user_id IS NOT NULL THEN '/api/users/' || u.id || '/avatar' ELSE u.avatar END) AS avatar
         FROM (
           SELECT learner_id FROM sessions
            WHERE tutor_id = $1 AND status IN ('upcoming', 'in-progress', 'completed')
           UNION
           SELECT learner_id FROM session_requests
            WHERE tutor_id = $1 AND status IN ('pending', 'accepted')
           UNION
           SELECT learner_id FROM referrals
            WHERE assigned_tutor_id = $1 AND status IN ('assigned', 'in-progress')
         ) rel
         JOIN users u ON u.id = rel.learner_id AND u.role = 'learner'
         LEFT JOIN user_avatars ua ON ua.user_id = u.id
        ORDER BY u.name ASC`,
      [req.user.id],
    );
    res.json({ tutees: rows });
  } catch (e) { next(e); }
});

/** GET /tasks/attachments/:attachmentId — authorized image stream. */
router.get('/tasks/attachments/:attachmentId', requireAuth, async (req, res, next) => {
  try {
    const attachmentId = parseUuid(req.params.attachmentId, 'attachment id');
    const { rows } = await query(
      `SELECT att.id, att.task_id, att.assignment_id, att.file_name, att.mime_type,
              att.size_bytes, att.storage_driver, att.storage_key,
              t.tutor_id,
              ta.learner_id AS submission_owner_id,
              EXISTS(SELECT 1 FROM task_assignments x WHERE x.task_id = t.id AND x.learner_id = $2) AS is_assigned
         FROM task_attachments att
         JOIN tasks t ON t.id = att.task_id
         LEFT JOIN task_assignments ta ON ta.id = att.assignment_id
        WHERE att.id = $1`,
      [attachmentId, req.user.id],
    );
    const att = rows[0];
    if (!att) throw httpError(404, 'Attachment not found');

    const isTutorOwner = att.tutor_id === req.user.id;
    const canLearnerRead = att.assignment_id
      ? att.submission_owner_id === req.user.id
      : att.is_assigned;
    if (!isTutorOwner && !canLearnerRead) {
      throw httpError(403, 'You do not have access to this attachment');
    }

    const { buffer, stream } = await readTaskImage({ driver: att.storage_driver, key: att.storage_key });
    res.set('Content-Type', att.mime_type);
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Cache-Control', 'private, max-age=300');
    const safeName = String(att.file_name || 'attachment')
      .replace(/["\\\r\n]/g, '')
      .replace(/[^\x20-\x7e]/g, '_');
    res.set('Content-Disposition', `inline; filename="${safeName || 'attachment'}"`);
    if (buffer) {
      res.set('Content-Length', String(buffer.length));
      return res.send(buffer);
    }
    stream.pipe(res);
  } catch (e) {
    if (e?.code === 'ENOENT' || e?.name === 'NoSuchKey') {
      return next(httpError(404, 'Attachment file is unavailable'));
    }
    next(e);
  }
});

/** GET /tasks — tutor's created tasks or learner's assigned tasks. */
router.get('/tasks', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role === 'tutor') {
      await assertAccreditedTutor(req);
      const { rows } = await query(
        `SELECT t.id, t.tutor_id, t.title, t.description, t.due_at, t.form_url, t.created_at, t.updated_at,
                COUNT(ta.id)::int AS assigned_count,
                COUNT(ta.id) FILTER (WHERE ta.status IN ('submitted', 'reviewed'))::int AS submitted_count,
                COUNT(ta.id) FILTER (WHERE ta.status = 'assigned')::int AS missing_count,
                COUNT(ta.id) FILTER (WHERE ta.is_late = true)::int AS late_count,
                COUNT(ta.id) FILTER (WHERE ta.status = 'reviewed')::int AS reviewed_count,
                (SELECT COUNT(*)::int FROM task_attachments att WHERE att.task_id = t.id AND att.assignment_id IS NULL) AS attachment_count
           FROM tasks t
           LEFT JOIN task_assignments ta ON ta.task_id = t.id
          WHERE t.tutor_id = $1
          GROUP BY t.id
          ORDER BY t.created_at DESC`,
        [req.user.id],
      );
      return res.json({ tasks: rows });
    }

    if (req.user.role === 'learner') {
      await syncDueSoonNotifications(req.user.id);
      const { rows } = await query(
        `SELECT t.id, t.tutor_id, t.title, t.description, t.due_at, t.form_url, t.created_at, t.updated_at,
                u.name AS tutor_name, u.custom_id AS tutor_custom_id,
                ta.id AS assignment_id, ta.status, ta.submission_text, ta.form_completed,
                ta.submitted_at, ta.is_late, ta.reviewed_at, ta.feedback,
                (ta.status = 'assigned' AND t.due_at IS NOT NULL AND t.due_at < CURRENT_TIMESTAMP) AS is_overdue,
                (SELECT COUNT(*)::int FROM task_attachments att WHERE att.task_id = t.id AND att.assignment_id IS NULL) AS attachment_count,
                (SELECT COUNT(*)::int FROM task_attachments att WHERE att.assignment_id = ta.id) AS submission_attachment_count
           FROM task_assignments ta
           JOIN tasks t ON t.id = ta.task_id
           JOIN users u ON u.id = t.tutor_id
          WHERE ta.learner_id = $1
          ORDER BY
            CASE
              WHEN ta.status = 'assigned' AND t.due_at IS NOT NULL AND t.due_at < CURRENT_TIMESTAMP THEN 0
              WHEN ta.status = 'assigned' THEN 1
              WHEN ta.status = 'submitted' THEN 2
              ELSE 3
            END,
            t.due_at ASC NULLS LAST,
            t.created_at DESC`,
        [req.user.id],
      );
      return res.json({ tasks: rows });
    }

    throw httpError(403, 'Tasks are only available to accredited tutors and students');
  } catch (e) { next(e); }
});

/** POST /tasks — tutor assigns a task to one or several active tutees. */
router.post('/tasks', requireAuth, async (req, res, next) => {
  try {
    await assertAccreditedTutor(req);
    const title = parseTitle(req.body?.title);
    const description = parseDescription(req.body?.description);
    const dueAt = parseDueAt(req.body?.dueAt) ?? null;
    const formUrl = validateGoogleFormUrl(req.body?.formUrl);

    const rawIds = Array.isArray(req.body?.learnerIds)
      ? req.body.learnerIds
      : (req.body?.learnerId ? [req.body.learnerId] : []);
    const learnerIds = [...new Set(rawIds.map((id) => parseUuid(id, 'learnerId')))];
    if (learnerIds.length === 0) {
      throw httpError(400, 'Select at least one tutee to assign this task to');
    }

    const activeSet = await listActiveTuteeIds(req.user.id);
    const unauthorized = learnerIds.filter((id) => !activeSet.has(id));
    if (unauthorized.length > 0) {
      throw httpError(403, 'You can only assign tasks to students you have an active tutoring relationship with');
    }

    const result = await withTransaction(async (client) => {
      const { rows: [task] } = await client.query(
        `INSERT INTO tasks (tutor_id, title, description, due_at, form_url)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [req.user.id, title, description, dueAt, formUrl],
      );

      for (const learnerId of learnerIds) {
        await client.query(
          `INSERT INTO task_assignments (task_id, learner_id) VALUES ($1, $2)`,
          [task.id, learnerId],
        );
        await client.query(
          `INSERT INTO notifications (user_id, title, message, type, priority, entity_type, entity_id)
           VALUES ($1, 'New task assigned', $2, 'warning', 'high', 'task', $3)`,
          [learnerId, `${req.user.name} assigned "${title}".`, task.id],
        );
      }

      await audit({
        actorId: req.user.id,
        actorRole: req.user.role,
        action: 'task.create',
        entity: 'task',
        entityId: task.id,
        detail: { title, learnerCount: learnerIds.length, hasForm: Boolean(formUrl), dueAt },
        ip: requestIp(req),
      }, client);

      return task;
    });

    res.status(201).json({ task: result, assignedCount: learnerIds.length });
  } catch (e) { next(e); }
});

/** GET /tasks/:id — task detail, attachments, and submissions (tutor) or own assignment (learner). */
router.get('/tasks/:id', requireAuth, async (req, res, next) => {
  try {
    const taskId = parseUuid(req.params.id, 'task id');
    const { rows: [task] } = await query(
      `SELECT t.*, u.name AS tutor_name, u.custom_id AS tutor_custom_id
         FROM tasks t
         JOIN users u ON u.id = t.tutor_id
        WHERE t.id = $1`,
      [taskId],
    );
    if (!task) throw httpError(404, 'Task not found');

    const isTutorOwner = req.user.role === 'tutor' && task.tutor_id === req.user.id;

    if (isTutorOwner) {
      const [taskAtts, subRows, subAtts] = await Promise.all([
        query(
          `SELECT * FROM task_attachments WHERE task_id = $1 AND assignment_id IS NULL ORDER BY created_at ASC`,
          [taskId],
        ),
        query(
          `SELECT ta.*, u.name AS learner_name, u.custom_id AS learner_custom_id, u.program AS learner_program,
                  COALESCE(ua.r2_url, CASE WHEN ua.user_id IS NOT NULL THEN '/api/users/' || u.id || '/avatar' ELSE u.avatar END) AS learner_avatar
             FROM task_assignments ta
             JOIN users u ON u.id = ta.learner_id
             LEFT JOIN user_avatars ua ON ua.user_id = u.id
            WHERE ta.task_id = $1
            ORDER BY
              CASE ta.status WHEN 'submitted' THEN 0 WHEN 'assigned' THEN 1 ELSE 2 END,
              ta.submitted_at DESC NULLS LAST,
              u.name ASC`,
          [taskId],
        ),
        query(
          `SELECT * FROM task_attachments WHERE task_id = $1 AND assignment_id IS NOT NULL ORDER BY created_at ASC`,
          [taskId],
        ),
      ]);

      const attByAssignment = new Map();
      for (const att of subAtts.rows) {
        if (!attByAssignment.has(att.assignment_id)) attByAssignment.set(att.assignment_id, []);
        attByAssignment.get(att.assignment_id).push(formatAttachment(att));
      }

      const now = Date.now();
      const dueMs = task.due_at ? new Date(task.due_at).getTime() : null;
      const submissions = subRows.rows.map((row) => ({
        ...row,
        is_overdue: row.status === 'assigned' && dueMs !== null && dueMs < now,
        display_status: row.status === 'reviewed'
          ? 'reviewed'
          : row.status === 'submitted'
            ? (row.is_late ? 'late' : 'submitted')
            : 'missing',
        attachments: attByAssignment.get(row.id) || [],
      }));

      return res.json({
        task,
        attachments: taskAtts.rows.map(formatAttachment),
        submissions,
      });
    }

    if (req.user.role === 'learner') {
      const { rows: [assignment] } = await query(
        `SELECT * FROM task_assignments WHERE task_id = $1 AND learner_id = $2`,
        [taskId, req.user.id],
      );
      if (!assignment) throw httpError(403, 'You are not assigned to this task');

      await syncDueSoonNotifications(req.user.id);

      const [taskAtts, subAtts] = await Promise.all([
        query(
          `SELECT * FROM task_attachments WHERE task_id = $1 AND assignment_id IS NULL ORDER BY created_at ASC`,
          [taskId],
        ),
        query(
          `SELECT * FROM task_attachments WHERE assignment_id = $1 ORDER BY created_at ASC`,
          [assignment.id],
        ),
      ]);

      const dueMs = task.due_at ? new Date(task.due_at).getTime() : null;
      return res.json({
        task,
        attachments: taskAtts.rows.map(formatAttachment),
        assignment: {
          ...assignment,
          is_overdue: assignment.status === 'assigned' && dueMs !== null && dueMs < Date.now(),
          attachments: subAtts.rows.map(formatAttachment),
        },
      });
    }

    throw httpError(403, 'You do not have access to this task');
  } catch (e) { next(e); }
});

/** PATCH /tasks/:id — tutor edits task details and notifies assigned students. */
router.patch('/tasks/:id', requireAuth, async (req, res, next) => {
  try {
    await assertAccreditedTutor(req);
    const taskId = parseUuid(req.params.id, 'task id');

    const { rows: [existing] } = await query(`SELECT * FROM tasks WHERE id = $1`, [taskId]);
    if (!existing) throw httpError(404, 'Task not found');
    if (existing.tutor_id !== req.user.id) throw httpError(403, 'Only the task creator can edit this task');

    const title = req.body?.title !== undefined ? parseTitle(req.body.title) : existing.title;
    const description = req.body?.description !== undefined ? parseDescription(req.body.description) : existing.description;
    const dueAt = req.body?.dueAt !== undefined ? parseDueAt(req.body.dueAt) : existing.due_at;
    const formUrl = req.body?.formUrl !== undefined ? validateGoogleFormUrl(req.body.formUrl) : existing.form_url;

    const addIds = Array.isArray(req.body?.addLearnerIds)
      ? [...new Set(req.body.addLearnerIds.map((id) => parseUuid(id, 'learnerId')))]
      : [];
    if (addIds.length > 0) {
      const activeSet = await listActiveTuteeIds(req.user.id);
      if (addIds.some((id) => !activeSet.has(id))) {
        throw httpError(403, 'You can only assign tasks to students you have an active tutoring relationship with');
      }
    }

    const updated = await withTransaction(async (client) => {
      const { rows: [task] } = await client.query(
        `UPDATE tasks
            SET title = $1, description = $2, due_at = $3, form_url = $4
          WHERE id = $5
          RETURNING *`,
        [title, description, dueAt, formUrl, taskId],
      );

      if (req.body?.dueAt !== undefined) {
        await client.query(
          `UPDATE task_assignments
              SET due_soon_notified_at = NULL
            WHERE task_id = $1 AND status = 'assigned'`,
          [taskId],
        );
      }

      const { rows: currentAssignees } = await client.query(
        `SELECT learner_id FROM task_assignments WHERE task_id = $1`,
        [taskId],
      );
      const existingSet = new Set(currentAssignees.map((r) => r.learner_id));

      for (const learnerId of existingSet) {
        await client.query(
          `INSERT INTO notifications (user_id, title, message, type, priority, entity_type, entity_id)
           VALUES ($1, 'Task updated', $2, 'info', 'high', 'task', $3)`,
          [learnerId, `${req.user.name} updated "${title}".`, taskId],
        );
      }

      for (const learnerId of addIds) {
        if (existingSet.has(learnerId)) continue;
        await client.query(
          `INSERT INTO task_assignments (task_id, learner_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [taskId, learnerId],
        );
        await client.query(
          `INSERT INTO notifications (user_id, title, message, type, priority, entity_type, entity_id)
           VALUES ($1, 'New task assigned', $2, 'warning', 'high', 'task', $3)`,
          [learnerId, `${req.user.name} assigned "${title}".`, taskId],
        );
      }

      await audit({
        actorId: req.user.id,
        actorRole: req.user.role,
        action: 'task.update',
        entity: 'task',
        entityId: taskId,
        detail: { title, dueAt, hasForm: Boolean(formUrl), addedLearners: addIds.length },
        ip: requestIp(req),
      }, client);

      return task;
    });

    res.json({ task: updated });
  } catch (e) { next(e); }
});

/** DELETE /tasks/:id — tutor deletes task, cascading assignments and cleaning stored images. */
router.delete('/tasks/:id', requireAuth, async (req, res, next) => {
  try {
    await assertAccreditedTutor(req);
    const taskId = parseUuid(req.params.id, 'task id');

    const { rows: [existing] } = await query(`SELECT id, tutor_id, title FROM tasks WHERE id = $1`, [taskId]);
    if (!existing) throw httpError(404, 'Task not found');
    if (existing.tutor_id !== req.user.id) throw httpError(403, 'Only the task creator can delete this task');

    const files = await withTransaction(async (client) => {
      const { rows: atts } = await client.query(
        `SELECT storage_driver, storage_key FROM task_attachments WHERE task_id = $1`,
        [taskId],
      );
      await client.query(`DELETE FROM tasks WHERE id = $1`, [taskId]);
      await audit({
        actorId: req.user.id,
        actorRole: req.user.role,
        action: 'task.delete',
        entity: 'task',
        entityId: taskId,
        detail: { title: existing.title },
        ip: requestIp(req),
      }, client);
      return atts;
    });

    await Promise.all(
      files.map((f) => deleteTaskImage({ driver: f.storage_driver, key: f.storage_key })),
    );

    res.json({ deleted: true, id: taskId });
  } catch (e) { next(e); }
});

/** POST /tasks/:id/attachments — tutor attaches an image to a task (max 4, 4 MB). */
router.post('/tasks/:id/attachments', requireAuth, uploadTaskImage, async (req, res, next) => {
  try {
    await assertAccreditedTutor(req);
    const taskId = parseUuid(req.params.id, 'task id');

    const { rows: [task] } = await query(`SELECT id, tutor_id FROM tasks WHERE id = $1`, [taskId]);
    if (!task) throw httpError(404, 'Task not found');
    if (task.tutor_id !== req.user.id) throw httpError(403, 'Only the task creator can add task images');

    const { rows: [{ count }] } = await query(
      `SELECT COUNT(*)::int AS count FROM task_attachments WHERE task_id = $1 AND assignment_id IS NULL`,
      [taskId],
    );
    if (count >= MAX_TASK_IMAGES) {
      throw httpError(400, `A task can have at most ${MAX_TASK_IMAGES} image attachments`);
    }

    const validated = validateTaskImage(req.file);
    const key = `${taskId}/prompt/${crypto.randomUUID()}.${validated.ext}`;
    const stored = await saveTaskImage({ key, buffer: req.file.buffer, mimeType: validated.mimeType });

    try {
      const { rows: [att] } = await query(
        `INSERT INTO task_attachments (task_id, assignment_id, uploaded_by, file_name, mime_type, size_bytes, storage_driver, storage_key)
         VALUES ($1, NULL, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [taskId, req.user.id, validated.fileName, validated.mimeType, validated.sizeBytes, stored.driver, stored.key],
      );
      res.status(201).json({ attachment: formatAttachment(att) });
    } catch (err) {
      await deleteTaskImage(stored);
      throw err;
    }
  } catch (e) { next(e); }
});

/** POST /tasks/:id/submission/attachments — learner attaches an image to their submission (max 4, 4 MB). */
router.post('/tasks/:id/submission/attachments', requireAuth, uploadTaskImage, async (req, res, next) => {
  try {
    if (req.user.role !== 'learner') throw httpError(403, 'Only assigned students can attach submission images');
    const taskId = parseUuid(req.params.id, 'task id');

    const { rows: [assignment] } = await query(
      `SELECT id, status FROM task_assignments WHERE task_id = $1 AND learner_id = $2`,
      [taskId, req.user.id],
    );
    if (!assignment) throw httpError(403, 'You are not assigned to this task');
    if (assignment.status === 'reviewed') {
      throw httpError(409, 'This submission has already been reviewed and is locked');
    }
    if (assignment.status !== 'assigned') {
      throw httpError(409, 'Unsubmit first to add or change submission attachments');
    }

    const { rows: [{ count }] } = await query(
      `SELECT COUNT(*)::int AS count FROM task_attachments WHERE assignment_id = $1`,
      [assignment.id],
    );
    if (count >= MAX_TASK_IMAGES) {
      throw httpError(400, `A submission can have at most ${MAX_TASK_IMAGES} image attachments`);
    }

    const validated = validateTaskImage(req.file);
    const key = `${taskId}/submissions/${assignment.id}/${crypto.randomUUID()}.${validated.ext}`;
    const stored = await saveTaskImage({ key, buffer: req.file.buffer, mimeType: validated.mimeType });

    try {
      const { rows: [att] } = await query(
        `INSERT INTO task_attachments (task_id, assignment_id, uploaded_by, file_name, mime_type, size_bytes, storage_driver, storage_key)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [taskId, assignment.id, req.user.id, validated.fileName, validated.mimeType, validated.sizeBytes, stored.driver, stored.key],
      );
      res.status(201).json({ attachment: formatAttachment(att) });
    } catch (err) {
      await deleteTaskImage(stored);
      throw err;
    }
  } catch (e) { next(e); }
});

/** DELETE /tasks/:id/attachments/:attachmentId — remove task image (tutor) or draft submission image (learner). */
router.delete('/tasks/:id/attachments/:attachmentId', requireAuth, async (req, res, next) => {
  try {
    const taskId = parseUuid(req.params.id, 'task id');
    const attachmentId = parseUuid(req.params.attachmentId, 'attachment id');

    const { rows: [att] } = await query(
      `SELECT att.*, t.tutor_id, ta.learner_id AS submission_owner_id, ta.status AS submission_status
         FROM task_attachments att
         JOIN tasks t ON t.id = att.task_id
         LEFT JOIN task_assignments ta ON ta.id = att.assignment_id
        WHERE att.id = $1 AND att.task_id = $2`,
      [attachmentId, taskId],
    );
    if (!att) throw httpError(404, 'Attachment not found');

    if (att.assignment_id === null) {
      if (req.user.role !== 'tutor' || att.tutor_id !== req.user.id) {
        throw httpError(403, 'Only the task creator can remove task images');
      }
    } else {
      if (req.user.role !== 'learner' || att.submission_owner_id !== req.user.id) {
        throw httpError(403, 'You can only remove your own submission images');
      }
      if (att.submission_status !== 'assigned') {
        throw httpError(409, 'Unsubmit first before removing submission attachments');
      }
    }

    await query(`DELETE FROM task_attachments WHERE id = $1`, [attachmentId]);
    await deleteTaskImage({ driver: att.storage_driver, key: att.storage_key });
    res.json({ deleted: true, id: attachmentId });
  } catch (e) { next(e); }
});

/** POST /tasks/:id/submit — student turns in text, images, and/or Google Form completion. */
router.post('/tasks/:id/submit', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'learner') throw httpError(403, 'Only assigned students can turn in tasks');
    const taskId = parseUuid(req.params.id, 'task id');

    const { rows: [row] } = await query(
      `SELECT ta.*, t.due_at, t.form_url, t.title
         FROM task_assignments ta
         JOIN tasks t ON t.id = ta.task_id
        WHERE ta.task_id = $1 AND ta.learner_id = $2`,
      [taskId, req.user.id],
    );
    if (!row) throw httpError(403, 'You are not assigned to this task');
    if (row.status === 'reviewed') {
      throw httpError(409, 'This submission has already been reviewed by your tutor');
    }

    const text = req.body?.text !== undefined ? String(req.body.text ?? '').trim() : (row.submission_text || '');
    if (text.length > MAX_DESC) {
      throw httpError(400, `Submission note must be ${MAX_DESC} characters or fewer`);
    }
    const formCompleted = row.form_url ? Boolean(req.body?.formCompleted) : false;

    const { rows: [{ count: imageCount }] } = await query(
      `SELECT COUNT(*)::int AS count FROM task_attachments WHERE assignment_id = $1`,
      [row.id],
    );
    if (!text && imageCount === 0 && !formCompleted) {
      throw httpError(400, row.form_url
        ? 'Add a note, attach an image, or confirm you completed the Google Form before turning in.'
        : 'Add a note or attach at least one image before turning in.');
    }

    const isLate = Boolean(row.due_at && new Date(row.due_at).getTime() < Date.now());
    const { rows: [updated] } = await query(
      `UPDATE task_assignments
          SET status = 'submitted',
              submission_text = $1,
              form_completed = $2,
              submitted_at = CURRENT_TIMESTAMP,
              is_late = $3
        WHERE id = $4
        RETURNING *`,
      [text || null, formCompleted, isLate, row.id],
    );

    await audit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'task.submit',
      entity: 'task',
      entityId: taskId,
      detail: { isLate, formCompleted, imageCount },
      ip: requestIp(req),
    });

    res.json({ assignment: updated });
  } catch (e) { next(e); }
});

/** POST /tasks/:id/unsubmit — student reopens their submission before tutor review. */
router.post('/tasks/:id/unsubmit', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role !== 'learner') throw httpError(403, 'Only assigned students can unsubmit tasks');
    const taskId = parseUuid(req.params.id, 'task id');

    const { rows: [row] } = await query(
      `SELECT * FROM task_assignments WHERE task_id = $1 AND learner_id = $2`,
      [taskId, req.user.id],
    );
    if (!row) throw httpError(403, 'You are not assigned to this task');
    if (row.status === 'reviewed') {
      throw httpError(409, 'Cannot unsubmit after the tutor has marked your work reviewed');
    }
    if (row.status !== 'submitted') {
      throw httpError(409, 'Task is not currently turned in');
    }

    const { rows: [updated] } = await query(
      `UPDATE task_assignments
          SET status = 'assigned',
              submitted_at = NULL,
              is_late = false
        WHERE id = $1
        RETURNING *`,
      [row.id],
    );

    await audit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'task.unsubmit',
      entity: 'task',
      entityId: taskId,
      ip: requestIp(req),
    });

    res.json({ assignment: updated });
  } catch (e) { next(e); }
});

/** POST /tasks/:id/submissions/:learnerId/review — tutor marks submission reviewed + feedback (no points_ledger change). */
router.post('/tasks/:id/submissions/:learnerId/review', requireAuth, async (req, res, next) => {
  try {
    await assertAccreditedTutor(req);
    const taskId = parseUuid(req.params.id, 'task id');
    const learnerId = parseUuid(req.params.learnerId, 'learner id');

    const feedback = String(req.body?.feedback ?? '').trim();
    if (feedback.length > MAX_FEEDBACK) {
      throw httpError(400, `Feedback must be ${MAX_FEEDBACK} characters or fewer`);
    }

    const { rows: [task] } = await query(`SELECT id, tutor_id, title FROM tasks WHERE id = $1`, [taskId]);
    if (!task) throw httpError(404, 'Task not found');
    if (task.tutor_id !== req.user.id) throw httpError(403, 'Only the task creator can review submissions');

    const reviewed = await withTransaction(async (client) => {
      const { rows: [existing] } = await client.query(
        `SELECT * FROM task_assignments WHERE task_id = $1 AND learner_id = $2 FOR UPDATE`,
        [taskId, learnerId],
      );
      if (!existing) throw httpError(404, 'Student is not assigned to this task');
      if (existing.status === 'assigned') {
        throw httpError(409, 'Cannot review a submission before the student turns it in');
      }

      const { rows: [updated] } = await client.query(
        `UPDATE task_assignments
            SET status = 'reviewed',
                reviewed_at = CURRENT_TIMESTAMP,
                feedback = $1
          WHERE id = $2
          RETURNING *`,
        [feedback || null, existing.id],
      );

      const preview = feedback ? ` Feedback: ${feedback.slice(0, 120)}` : '';
      await client.query(
        `INSERT INTO notifications (user_id, title, message, type, priority, entity_type, entity_id)
         VALUES ($1, 'Task feedback returned', $2, 'success', 'high', 'task', $3)`,
        [learnerId, `${req.user.name} reviewed "${task.title}".${preview}`, taskId],
      );

      await audit({
        actorId: req.user.id,
        actorRole: req.user.role,
        action: 'task.review',
        entity: 'task',
        entityId: taskId,
        detail: { learnerId, hasFeedback: Boolean(feedback) },
        ip: requestIp(req),
      }, client);

      return updated;
    });

    res.json({ submission: reviewed });
  } catch (e) { next(e); }
});

export default router;
