import express from 'express';
import { query } from '../db.js';
import { toPublicProfile } from '../lib/publicProfile.js';
import { isR2Configured, getFromR2 } from '../lib/storage.js';

const router = express.Router();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/users/:id/avatar
 * Serves the user's resized avatar image from R2 CDN, R2 stream, or bytea storage with HTTP caching.
 */
router.get('/users/:id/avatar', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!UUID_RE.test(String(id))) {
      return res.status(404).send('Invalid user ID');
    }

    const { rows } = await query(
      `SELECT data, mime_type, updated_at, r2_key, r2_url FROM user_avatars WHERE user_id = $1`,
      [id]
    );

    const avatar = rows[0];
    if (!avatar || (!avatar.data && !avatar.r2_key && !avatar.r2_url)) {
      res.set('Cache-Control', 'no-cache');
      return res.status(404).send('Avatar not found');
    }

    // 1. Redirect directly to public R2 URL if configured
    if (avatar.r2_url) {
      return res.redirect(302, avatar.r2_url);
    }

    // 2. Stream from R2 bucket if r2_key exists
    if (avatar.r2_key && isR2Configured()) {
      try {
        const { stream, contentType, contentLength, etag } = await getFromR2(avatar.r2_key);
        if (etag && req.headers['if-none-match'] === etag) {
          return res.status(304).end();
        }
        res.set({
          'Content-Type': contentType || avatar.mime_type || 'image/webp',
          ...(contentLength ? { 'Content-Length': String(contentLength) } : {}),
          ...(etag ? { 'ETag': etag } : {}),
          'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
          'X-Content-Type-Options': 'nosniff',
        });
        return stream.pipe(res);
      } catch (err) {
        if (!avatar.data) throw err;
      }
    }

    // 3. Fallback to PostgreSQL bytea
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
      `SELECT u.id, u.custom_id, u.name, u.role, u.title, u.bio, u.avatar, u.program, u.department,
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
    } else if (user.role === 'faculty') {
      const statsRes = await query(
        `SELECT count(*)::int AS completed_sessions
         FROM sessions
         WHERE (tutor_id = $1 OR faculty_id = $1) AND status = 'completed'`,
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
    if (user.role === 'tutor' || user.role === 'faculty') {
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

