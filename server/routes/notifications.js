/** GET /notifications — current user's list (+unread). PATCH marks all read. */
import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/notifications', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT id, title, message, type, is_read, created_at
       FROM notifications WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 30`, [req.user.id]);
    const unread = rows.filter(r => !r.is_read).length;
    res.json({ notifications: rows, unread });
  } catch (e) { next(e); }
});

router.patch('/notifications', requireAuth, async (req, res, next) => {
  try {
    await query(`UPDATE notifications SET is_read = true WHERE user_id = $1`, [req.user.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

export default router;
