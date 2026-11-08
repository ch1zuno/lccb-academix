import express from 'express';
import { query } from '../db.js';
import { toPublicProfile } from '../lib/publicProfile.js';

const router = express.Router();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/users/:id/avatar
 * Serves the user's resized avatar image from bytea storage with HTTP ETag caching.
 */
router.get('/users/:id/avatar', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!UUID_RE.test(String(id))) {
      return res.status(404).send('Invalid user ID');
    }

    const { rows } = await query(
      `SELECT data, mime_type, updated_at FROM user_avatars WHERE user_id = $1`,
      [id]
    );

    const avatar = rows[0];
    if (!avatar || !avatar.data) {
      res.set('Cache-Control', 'no-cache');
      return res.status(404).send('Avatar not found');
    }

    const timestamp = avatar.updated_at ? new Date(avatar.updated_at).getTime() : 0;
    const etag = `W/"${id}-${timestamp}"`;

    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }

    res.set({
      'Content-Type': avatar.mime_type || 'image/webp',
      'Content-Length': String(avatar.data.length),
      'ETag': etag,
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      'X-Content-Type-Options': 'nosniff',
    });

    res.send(avatar.data);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/users/:id/public
 * Returns the public-safe profile for a user.
 * Strips email, password_hash, token_version, and internal IDs.
 */
router.get('/users/:id/public', async (req, res, next) => {
  try {
    const { id } = req.params;
    const isUuid = UUID_RE.test(String(id));

    const { rows } = await query(
      `SELECT u.id, u.custom_id, u.name, u.role, u.bio, u.avatar, u.program, u.department,
              u.is_available, u.is_verified,
              EXISTS(SELECT 1 FROM user_avatars ua WHERE ua.user_id = u.id) AS has_avatar
       FROM users u
       WHERE ${isUuid ? 'u.id = $1' : 'u.custom_id = $1'}`,
      [id]
    );

    const user = rows[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let stats = null;
    if (user.role === 'tutor') {
      const statsRes = await query(
        `SELECT count(*)::int AS completed_sessions
         FROM sessions
         WHERE tutor_id = $1 AND status = 'completed'`,
        [user.id]
      );
      stats = { completed_sessions: statsRes.rows[0]?.completed_sessions || 0 };
    } else if (user.role === 'learner') {
      const statsRes = await query(
        `SELECT count(*)::int AS completed_sessions
         FROM sessions
         WHERE learner_id = $1 AND status = 'completed'`,
        [user.id]
      );
      stats = { completed_sessions: statsRes.rows[0]?.completed_sessions || 0 };
    }

    let subjects = [];
    if (user.role === 'tutor') {
      const subRows = await query(
        `SELECT s.id, s.code, s.name, s.department
         FROM user_subjects us
         JOIN subjects s ON s.id = us.subject_id
         WHERE us.user_id = $1
         ORDER BY s.code`,
        [user.id]
      );
      subjects = subRows.rows;
    }

    const publicProfile = toPublicProfile(user, subjects, stats);
    res.json({
      profile: publicProfile,
      userId: user.id,
      customId: user.custom_id,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

