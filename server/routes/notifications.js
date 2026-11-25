/** GET /notifications — current user's list (+unread, high-priority pinned). PATCH marks all read. */
import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

/** Atomic one-shot reminder for student tasks due within 24 hours. */
export async function syncDueSoonNotifications(learnerId) {
  await query(
    `WITH due_soon AS (
       UPDATE task_assignments ta
          SET due_soon_notified_at = CURRENT_TIMESTAMP
         FROM tasks t
        WHERE ta.task_id = t.id
          AND ta.learner_id = $1
          AND ta.status = 'assigned'
          AND ta.due_soon_notified_at IS NULL
          AND t.due_at IS NOT NULL
          AND t.due_at > CURRENT_TIMESTAMP
          AND t.due_at <= CURRENT_TIMESTAMP + interval '24 hours'
    RETURNING ta.task_id, ta.learner_id, t.title
     )
     INSERT INTO notifications (user_id, title, message, type, priority, entity_type, entity_id)
     SELECT learner_id,
            'Task due soon',
            '"' || title || '" is due within 24 hours.',
            'warning',
            'high',
            'task',
            task_id
       FROM due_soon`,
    [learnerId],
  ).catch(() => {});
}

router.get('/notifications', requireAuth, async (req, res, next) => {
  try {
    if (req.user.role === 'learner') {
      await syncDueSoonNotifications(req.user.id);
    }
    const { rows } = await query(
      `SELECT id, title, message, type, priority, entity_type, entity_id, is_read, created_at
       FROM notifications WHERE user_id = $1
       ORDER BY (priority = 'high') DESC, created_at DESC LIMIT 30`, [req.user.id]);
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
