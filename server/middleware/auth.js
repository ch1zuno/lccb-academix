import jwt from 'jsonwebtoken';
import { pool } from '../db.js';
import { config } from '../config.js';
import { requestToken, SESSION_TTL_SECONDS } from '../lib/sessionCookie.js';

export function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      name: user.name,
      tv: Number(user.token_version) || 0,
    },
    config.jwtSecret,
    { expiresIn: SESSION_TTL_SECONDS },
  );
}

function unauthorized(res, msg = 'Unauthorized') {
  return res.status(401).json({ error: msg });
}

export async function authenticateRequest(req) {
  const token = requestToken(req);
  if (!token) return { error: 'Missing session' };
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const { rows } = await pool.query(
      `SELECT id, custom_id, name, email, role, avatar, program, department, title, token_version
       FROM users WHERE id = $1`, [payload.sub],
    );
    if (!rows[0]) return { error: 'Account no longer exists' };
    // Sign-out-all and password changes bump token_version. Tokens minted
    // before the column existed carry no `tv`, which maps to version 0.
    if (Number(payload.tv ?? 0) !== Number(rows[0].token_version ?? 0)) {
      return { error: 'Session revoked — sign in again' };
    }
    return { user: rows[0], authExp: payload.exp ?? null };
  } catch {
    return { error: 'Invalid or expired token' };
  }
}

export const requireAuth = async (req, res, next) => {
  const result = await authenticateRequest(req);
  if (result.error) return unauthorized(res, result.error);
  req.user = result.user;
  req.authExp = result.authExp;
  next();
};

/** requireRole('tutor') or requireRole('tutor','faculty') */
export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return unauthorized(res);
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: `Requires role: ${roles.join(' or ')}` });
  }
  next();
};
