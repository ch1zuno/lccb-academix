import express from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { requireAuth, signToken } from '../middleware/auth.js';
import { config } from '../config.js';
import { audit, requestIp } from '../lib/audit.js';
import { clearSessionCookie, setSessionCookie } from '../lib/sessionCookie.js';

const router = express.Router();
const DEV = !config.isProd;

const PUBLIC_COLUMNS = `id, custom_id, name, email, role, avatar, program, department, title,
                        is_verified, is_available, certified_by_id, token_version`;

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
    const { rows } = await query(
      `SELECT id, custom_id, name, email, role, avatar, program, department, title,
              is_verified, is_available, certified_by_id
       FROM users WHERE id = $1`, [req.user.id],
    );
    res.json({ user: rows[0] });
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
