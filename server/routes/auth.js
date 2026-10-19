import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { pool, query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
const DEV = process.env.NODE_ENV !== 'production';

/**
 * POST /api/auth/login { loginId, password }
 * loginId = custom_id (e.g. TE-128), custom_id@… style email, or email.
 */
router.post('/login', async (req, res) => {
  const { loginId, password } = req.body || {};
  if (!loginId || !password) {
    return res.status(400).json({ error: 'loginId and password are required' });
  }
  const key = String(loginId).trim();
  const { rows } = await query(
    `SELECT id, custom_id, name, email, role, avatar, program, department, password_hash
     FROM users
     WHERE custom_id ILIKE $1 OR email = $2`,
    [key, key.includes('@') ? key : null],
  );
  const user = rows[0];
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid school ID / email or password' });
  }
  const token = jwt.sign(
    { sub: user.id, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '12h' },
  );
  delete user.password_hash;
  res.json({ token, user });
});

/** GET /api/auth/me → current user profile (fresh, no hash) */
router.get('/me', requireAuth, async (req, res) => {
  const { rows } = await query(
    `SELECT id, custom_id, name, email, role, avatar, program, department, title,
            is_verified, certified_by_id
     FROM users WHERE id = $1`, [req.user.id],
  );
  res.json({ user: rows[0] });
});

/** GET /api/auth/dev-account — one-line dev switcher only outside production */
router.get('/dev-accounts', async (_req, res, next) => {
  if (!DEV) return next();
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
