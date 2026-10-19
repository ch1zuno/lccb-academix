import jwt from 'jsonwebtoken';
import { pool } from '../db.js';

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '12h' },
  );
}

function unauthorized(res, msg = 'Unauthorized') {
  return res.status(401).json({ error: msg });
}

export const requireAuth = async (req, res, next) => {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return unauthorized(res, 'Missing bearer token');
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await pool.query(
      `SELECT id, custom_id, name, email, role, avatar, program, department, title
       FROM users WHERE id = $1`, [payload.sub],
    );
    if (!rows[0]) return unauthorized(res, 'Account no longer exists');
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
