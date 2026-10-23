import express from 'express';
import { query } from '../db.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { httpError } from '../middleware/errors.js';

const router = express.Router();

const SELECT_SQL = `
  SELECT
    r.id, r.referral_code, r.topic, r.urgency, r.status, r.notes,
    r.hours_required, r.hours_remaining, r.date,
    r.hours_required - COALESCE(r.hours_remaining, 0) AS hours_completed,
    c.name AS learner, c.custom_id AS learner_code, c.id AS learner_id,
    f.name AS faculty, f.id AS faculty_id,
    t.name AS assigned_tutor, t.id AS tutor_id,
    s.code AS subject_code, s.name AS subject, s.department
  FROM referrals r
  JOIN users c ON c.id = r.learner_id
  JOIN users f ON f.id = r.faculty_id
  LEFT JOIN users t ON t.id = r.assigned_tutor_id
  JOIN subjects s ON s.id = r.subject_id`;

/** Role-scoped visibility: learners see their own, faculty theirs, tutors theirs, superadmin all. */
function whereFor(user) {
  switch (user.role) {
    case 'superadmin': return { sql: '', params: [] };
    case 'faculty': return { sql: 'WHERE r.faculty_id = $1', params: [user.id] };
    case 'learner': return { sql: 'WHERE r.learner_id = $1', params: [user.id] };
    case 'tutor': return { sql: 'WHERE r.assigned_tutor_id = $1', params: [user.id] };
    default: throw httpError(403, 'Unknown role');
  }
}

const isValidUrgency = (u) => ['low', 'medium', 'high'].includes(u);
const reorder = (row) => ({ ...row, hoursRequired: row.hours_required, hoursRemaining: row.hours_remaining, referralCode: row.referral_code });

/** DELETE /referrals/:id — superadmin only, and ONLY rejected referrals.
 * Sessions linked through referral_id lose the link but stay (ON DELETE SET NULL);
 * everything else about the ledger is untouched. */
router.delete('/referrals/:id', requireAuth, requireRole('superadmin'), async (req, res, next) => {
  try {
    const { rows } = await query(
      `DELETE FROM referrals WHERE id = $1 AND status = 'rejected' RETURNING id, referral_code`,
      [req.params.id],
    );
    if (!rows[0]) {
      const found = await query(`SELECT id FROM referrals WHERE id = $1`, [req.params.id]);
      if (!found.rows[0]) throw httpError(404, 'Referral not found');
      throw httpError(409, 'Only rejected referrals can be removed');
    }
    res.json({ removed: true, referral: rows[0] });
  } catch (e) { next(e); }
});

router.get('/referrals', requireAuth, async (req, res, next) => {
  try {
    const { sql, params } = whereFor(req.user);
    const { rows } = await query(`${SELECT_SQL} ${sql} ORDER BY r.created_at DESC`, params);
    res.json({ referrals: rows.map(reorder) });
  } catch (e) { next(e); }
});

// GET /referrals/next-code — unique code preview for the create form
router.get('/referrals/next-code', requireAuth, requireRole('faculty'), async (_req, res, next) => {
  try { const n = await nextReferralNumber(); res.json({ code: `REF-${String(n).padStart(3, '0')}` }); }
  catch (e) { next(e); }
});

// GET /referrals/search-students?q= — learners matching name or custom_id for the form
router.get('/referrals/search-students', requireAuth, requireRole('faculty'), async (req, res, next) => {
  try {
    const q = `%${(req.query.q || '').trim()}%`;
    if (q === '%%') return res.json({ students: [] });
    const { rows } = await query(
      `SELECT id, custom_id, name, program FROM users
       WHERE role = 'learner' AND (name ILIKE $1 OR custom_id ILIKE $1) LIMIT 8`, [q]);
    res.json({ students: rows });
  } catch (e) { next(e); }
});

/** POST /referrals — faculty only; creates a flagged referral. */
router.post('/referrals', requireAuth, requireRole('faculty', 'superadmin'), async (req, res, next) => {
  try {
    const { learnerId, subjectId, topic, urgency = 'medium', notes = null, hoursRequired } = req.body ?? {};
    const hours = Number(hoursRequired);
    if (!learnerId || !subjectId || !topic || !Number.isFinite(hours) || hours <= 0) {
      throw httpError(400, 'learnerId, subjectId, topic and hoursRequired (> 0) are required');
    }
    if (!isValidUrgency(urgency)) throw httpError(400, 'urgency must be low, medium or high');
    const { rows } = await query(
      `INSERT INTO referrals
         (referral_code, learner_id, faculty_id, subject_id, topic, urgency, notes, hours_required, hours_remaining, date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8,CURRENT_DATE)
       RETURNING id, referral_code, status`,
      [`REF-${String(await nextReferralNumber()).padStart(3, '0')}`,
        learnerId, req.user.id, subjectId, String(topic).slice(0, 200), urgency, notes ? String(notes).slice(0, 500) : null, hours],
    );
    const full = await query(`${SELECT_SQL} WHERE r.id = $1`, [rows[0].id]);
    res.status(201).json({ referral: reorder(full.rows[0]) });
  } catch (e) {
    if (e.code === '23503') e.status = 400, e.message = 'Unknown learner or subject';
    next(e);
  }
});

/** POST /referrals/:id/assign — faculty assigns a tutor; flagged → assigned + notify tutor */
router.post('/referrals/:id/assign', requireAuth, requireRole('faculty'), async (req, res, next) => {
  try {
    const { tutorId } = req.body ?? {};
    if (!tutorId) throw httpError(400, 'tutorId required');
    const { rows } = await query(
      `UPDATE referrals
         SET assigned_tutor_id = $1,
             status = CASE WHEN status = 'flagged' THEN 'assigned' ELSE status END,
             hours_remaining = COALESCE(hours_remaining, hours_required)
       WHERE id = $2 AND faculty_id = $3 AND status <> 'resolved'
       RETURNING id, status, referral_code`,
      [tutorId, req.params.id, req.user.id],
    );
    if (!rows[0]) throw httpError(404, 'Referral not found, not yours, or already resolved');
    await insertNotification(tutorId, 'referral', 'New peer tutoring referral assigned to you', rows[0].referral_code);
    res.json({ referral: rows[0] });
  } catch (e) {
    if (e.code === '23503') e.status = 400, e.message = 'Unknown tutor';
    next(e);
  }
});

const TRANSITIONS = {
  flagged: ['assigned', 'rejected'],
  // rejected is terminal: only removal (superadmin DELETE) lifts it off the board
  rejected: [],
  assigned: ['in-progress', 'resolved'],
  'in-progress': ['in-progress', 'resolved'],
  resolved: [],
};

/** PATCH /referrals/:id/status — lifecycle transition with server-side authorization */
router.patch('/referrals/:id/status', requireAuth, async (req, res, next) => {
  try {
    const status = req.body?.status;
    if (!status || !Object.keys(TRANSITIONS).includes(status)) {
      throw httpError(400, 'status must be flagged | assigned | in-progress | resolved');
    }
    const { rows } = await query(`SELECT * FROM referrals WHERE id = $1`, [req.params.id]);
    const cur = rows[0];
    if (!cur) throw httpError(404, 'Referral not found');
    const mayEdit =
      (req.user.role === 'faculty' && cur.faculty_id === req.user.id) ||
      (req.user.role === 'tutor' && cur.assigned_tutor_id === req.user.id) ||
      req.user.role === 'superadmin';
    if (!mayEdit) throw httpError(403, 'Not your referral');
    if (!TRANSITIONS[cur.status].includes(status)) {
      throw httpError(409, `Invalid transition ${cur.status} → ${status}`);
    }
    const applied = await query(
      `UPDATE referrals SET status = $1 WHERE id = $2 RETURNING id, status`,
      [status, req.params.id]);
    res.json({ referral: applied.rows[0] });
  } catch (e) { next(e); }
});

// GET /referrals/:id — single row with same-scope authorization
router.get('/referrals/:id', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(`${SELECT_SQL} WHERE r.id = $1`, [req.params.id]);
    const r = rows[0];
    if (!r) throw httpError(404, 'Referral not found');
    const scoped =
      (req.user.role === 'superadmin') ||
      (req.user.role === 'faculty' && r.faculty_id === req.user.id) ||
      (req.user.role === 'learner' && r.learner_id === req.user.id) ||
      (req.user.role === 'tutor' && r.tutor_id === req.user.id);
    if (!scoped) throw httpError(403, 'Forbidden');
    res.json({ referral: reorder(r) });
  } catch (e) { next(e); }
});

export default router;

// helpers ------------------------------------------------------------
async function nextReferralNumber() {
  // count(*)-based numbering collides once rows can be removed (delete REF-006,
  // next create would try REF-006 again) — derive it from the highest code instead.
  const { rows } = await query(
    `SELECT COALESCE(max(NULLIF(regexp_replace(referral_code, '[^0-9]', '', 'g'), '')::int), 0) + 1 AS n FROM referrals`,
  );
  return rows[0].n;
}

function insertNotification(userId, kind, message, code) {
  const title = kind === 'referral' ? 'New referral assigned' : 'Update';
  return query(
    `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, 'info')`,
    [userId, title, `${message} ${code || ''}`.trim()],
  ).catch(e => console.error('notify', e.message));
}
