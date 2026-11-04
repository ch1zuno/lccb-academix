import jwt from 'jsonwebtoken';
import { pool } from '../db.js';
import { config } from '../config.js';
import { requestToken } from '../lib/sessionCookie.js';

export function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      name: user.name,
      tv: Number(user.token_version) || 0,
    },
    config.jwtSecret,
    { expiresIn: '12h' },
  );
}

function unauthorized(res, msg = 'Unauthorized') {
  return res.status(401).json({ error: msg });
}

export const requireAuth = async (req, res, next) => {
  const token = requestToken(req);
  if (!token) return unauthorized(res, 'Missing session');
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const { rows } = await pool.query(
      `SELECT id, custom_id, name, email, role, avatar, program, department, title, token_version
       FROM users WHERE id = $1`, [payload.sub],
    );
    if (!rows[0]) return unauthorized(res, 'Account no longer exists');
    // Sign-out-all and password changes bump token_version. Tokens minted
    // before the column existed carry no `tv`, which maps to version 0.
    if (Number(payload.tv ?? 0) !== Number(rows[0].token_version ?? 0)) {
      return unauthorized(res, 'Session revoked — sign in again');
    }
    req.user = rows[0];
    next();
  } catch {
    return unauthorized(res, 'Invalid or expired token');
  }
};

/** requireRole('tutor') or requireRole('tutor','faculty') */
export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return unauthorized(res);
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: `Requires role: ${roles.join(' or ')}` });
  }
  next();
};
