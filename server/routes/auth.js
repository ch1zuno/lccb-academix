import express from 'express';
import bcrypt from 'bcryptjs';
import { query, withTransaction } from '../db.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { config } from '../config.js';
import { audit, requestIp } from '../lib/audit.js';
import { clearSessionCookie, setSessionCookie } from '../lib/sessionCookie.js';

const router = express.Router();
const DEV = !config.isProd;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PUBLIC_COLUMNS = `id, custom_id, name, email, role, avatar, program, department, title,
                        is_verified, is_available, certified_by_id, token_version`;

async function fetchFullUser(userId) {
  const { rows } = await query(
    `SELECT u.id, u.custom_id, u.name, u.email, u.role, u.avatar, u.bio, u.program, u.department, u.title,
            u.is_verified, u.is_available, u.certified_by_id,
            EXISTS(SELECT 1 FROM user_avatars ua WHERE ua.user_id = u.id) AS has_avatar
     FROM users u WHERE u.id = $1`,
    [userId]
  );
  const user = rows[0];
  if (!user) return null;

  user.avatar_url = user.has_avatar ? `/api/users/${user.id}/avatar` : null;

  if (user.role === 'tutor') {
    const subRows = await query(
      `SELECT s.id, s.code, s.name, s.department
       FROM user_subjects us
       JOIN subjects s ON s.id = us.subject_id
       WHERE us.user_id = $1
       ORDER BY s.code`,
      [userId]
    );
    user.subjects = subRows.rows;
  }
  return user;
}

/**
 * POST /api/auth/login { loginId, password }
 * loginId = custom_id (e.g. TE-128), custom_id@… style email, or email.
 */
router.post('/login', async (req, res, next) => {
  try {
    const { loginId, password } = req.body || {};
    if (!loginId || !password) {
      return res.status(400).json({ error: 'loginId and password are required' });
    }
    const key = String(loginId).trim();
    const { rows } = await query(
      `SELECT id, custom_id, name, email, role, avatar, program, department, title,
              is_verified, is_available, certified_by_id, token_version, password_hash
       FROM users
       WHERE custom_id ILIKE $1 OR email = $2`,
      [key, key.includes('@') ? key : null],
    );
    const user = rows[0];
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid school ID / email or password' });
    }
    const token = signToken(user);
    delete user.password_hash;
    delete user.token_version;
    await audit({
      actorId: user.id,
      actorRole: user.role,
      action: 'auth.login',
      entity: 'user',
      entityId: user.id,
      ip: requestIp(req),
    });
    res.set('Cache-Control', 'no-store');
    setSessionCookie(res, token);
    res.json({ token, user });
  } catch (e) { next(e); }
});

/** GET /api/auth/me → current user profile (fresh, no hash) */
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await fetchFullUser(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  } catch (e) { next(e); }
});

/**
 * PATCH /api/auth/profile
 * Allows users to edit their own profile: name, bio (max 280 plain text), avatar.
 * Tutors also edit the subjects they teach.
 */
router.patch('/profile', requireAuth, async (req, res, next) => {
  try {
    const { name, bio, avatarBase64, subjectIds } = req.body || {};
    const userId = req.user.id;

    // 1. Validate name
    let validatedName = undefined;
    if (name !== undefined) {
      const cleanName = String(name).trim();
      if (!cleanName) {
        return res.status(400).json({ error: 'Display name cannot be empty' });
      }
      if (cleanName.length > 100) {
        return res.status(400).json({ error: 'Display name must be 100 characters or fewer' });
      }
      validatedName = cleanName;
    }

    // 2. Validate bio (plain text only, max 280 chars)
    let validatedBio = undefined;
    if (bio !== undefined) {
      const cleanBio = String(bio).trim();
      if (cleanBio.length > 280) {
        return res.status(400).json({ error: 'Bio must be 280 characters or fewer' });
      }
      validatedBio = cleanBio;
    }

    // 3. Process avatar if provided
    if (avatarBase64 === null) {
      // Remove avatar
      await query(`DELETE FROM user_avatars WHERE user_id = $1`, [userId]);
    } else if (typeof avatarBase64 === 'string' && avatarBase64.trim().length > 0) {
      const cleanedBase64 = avatarBase64.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
      const buffer = Buffer.from(cleanedBase64, 'base64');

      if (buffer.length > 500 * 1024) {
        return res.status(400).json({ error: 'Avatar image must not exceed 500 KB' });
      }

      // Check magic bytes
      let mimeType = null;
      if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        mimeType = 'image/jpeg';
      } else if (
        buffer.length >= 8 &&
        buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
        buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
      ) {
        mimeType = 'image/png';
      } else if (
        buffer.length >= 12 &&
        buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
        buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
      ) {
        mimeType = 'image/webp';
      }

      if (!mimeType) {
        return res.status(400).json({ error: 'Invalid image format. Only JPEG, PNG, and WebP are allowed.' });
      }

      await query(
        `INSERT INTO user_avatars (user_id, data, mime_type, size_bytes, updated_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id) DO UPDATE
           SET data = EXCLUDED.data,
               mime_type = EXCLUDED.mime_type,
               size_bytes = EXCLUDED.size_bytes,
               updated_at = CURRENT_TIMESTAMP`,
        [userId, buffer, mimeType, buffer.length]
      );
    }

    // 4. Update tutor subjects if tutor role
    if (req.user.role === 'tutor' && Array.isArray(subjectIds)) {
      const validUuids = subjectIds.filter((id) => UUID_RE.test(String(id)));
      await withTransaction(async (client) => {
        await client.query(`DELETE FROM user_subjects WHERE user_id = $1`, [userId]);
        if (validUuids.length > 0) {
          await client.query(
            `INSERT INTO user_subjects (user_id, subject_id)
             SELECT $1, id FROM subjects WHERE id = ANY($2::uuid[])`,
            [userId, validUuids]
          );
        }
      });
    }

    // 5. Update users table
    if (validatedName !== undefined || validatedBio !== undefined) {
      await query(
        `UPDATE users
         SET name = COALESCE($1, name),
             bio = COALESCE($2, bio),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [validatedName ?? null, validatedBio ?? null, userId]
      );
    }

    await audit({
      actorId: userId,
      actorRole: req.user.role,
      action: 'user.update_profile',
      entity: 'user',
      entityId: userId,
      ip: requestIp(req),
    });

    const updatedUser = await fetchFullUser(userId);
    res.json({ ok: true, user: updatedUser });
  } catch (e) { next(e); }
});

/**
 * POST /api/auth/change-password { currentPassword, newPassword }
 * Retires the shared demo password without a mail provider: the user proves
 * the old password, gets a fresh token, and every other JWT is revoked.
 */
router.post('/change-password', requireAuth, async (req, res, next) => {
  try {
    const currentPassword = String(req.body?.currentPassword ?? '');
    const newPassword = String(req.body?.newPassword ?? '');
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'currentPassword and newPassword are required' });
    }
    if (newPassword.length < 10) {
      return res.status(400).json({ error: 'New password must be at least 10 characters' });
    }
    if (Buffer.byteLength(newPassword, 'utf8') > 72) {
      return res.status(400).json({ error: 'New password must be 72 bytes or fewer' });
    }
    if (newPassword === currentPassword) {
      return res.status(400).json({ error: 'New password must be different' });
    }
    const { rows } = await query(
      `SELECT password_hash, token_version FROM users WHERE id = $1`, [req.user.id]);
    if (!rows[0] || !bcrypt.compareSync(currentPassword, rows[0].password_hash)) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    const hash = bcrypt.hashSync(newPassword, 12);
    const updated = await query(
      `UPDATE users
          SET password_hash = $1, token_version = token_version + 1
        WHERE id = $2
        RETURNING ${PUBLIC_COLUMNS}`,
      [hash, req.user.id],
    );
    const fresh = updated.rows[0];
    const token = signToken(fresh);
    delete fresh.token_version;
    await audit({
      actorId: fresh.id,
      actorRole: fresh.role,
      action: 'auth.password_change',
      entity: 'user',
      entityId: fresh.id,
      ip: requestIp(req),
    });
    res.set('Cache-Control', 'no-store');
    setSessionCookie(res, token);
    res.json({ token, user: fresh });
  } catch (e) { next(e); }
});

/** POST /api/auth/logout - clear the browser session cookie. */
router.post('/logout', (req, res) => {
  res.set('Cache-Control', 'no-store');
  clearSessionCookie(res);
  res.json({ ok: true });
});

/** POST /api/auth/logout-all — bump token_version; every issued JWT dies. */
router.post('/logout-all', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      `UPDATE users SET token_version = token_version + 1
        WHERE id = $1 RETURNING token_version`, [req.user.id]);
    await audit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'auth.logout_all',
      entity: 'user',
      entityId: req.user.id,
      ip: requestIp(req),
    });
    clearSessionCookie(res);
    res.json({ revoked: true, tokenVersion: rows[0]?.token_version ?? null });
  } catch (e) { next(e); }
});

/** GET /api/auth/dev-accounts — one-line dev switcher only outside production */
router.get('/dev-accounts', async (_req, res, next) => {
  if (!DEV || !config.demoMode) return next();
  try {
    const { rows } = await query(
      `SELECT id, custom_id, name, role, program, department, title
       FROM users WHERE custom_id IN ('SA-001','FA-017','TU-042','TE-128')
       OR email = 'l.betita.admin@lccbacolod.edu.ph' ORDER BY role`,
    );
    // In dev the frontend logs in with loginId + demo password.
    res.json({ password: 'demo1234', accounts: rows });
  } catch (e) { next(e); }
});

export default router;
