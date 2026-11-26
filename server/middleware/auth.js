import jwt from 'jsonwebtoken';
import { pool } from '../db.js';
import { config } from '../config.js';
import {
  requestToken,
  sessionTtlSecondsForRole,
  SUPERADMIN_IDLE_TIMEOUT_MS,
  STEP_UP_TTL_SECONDS,
} from '../lib/sessionCookie.js';

export function signToken(user, { mfa = false } = {}) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      name: user.name,
      tv: Number(user.token_version) || 0,
      ...(mfa ? { mfa: true } : {}),
    },
    config.jwtSecret,
    { expiresIn: sessionTtlSecondsForRole(user?.role) },
  );
}

export function signStepUpToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      tv: Number(user.token_version) || 0,
      purpose: 'step_up',
    },
    config.jwtSecret,
    { expiresIn: STEP_UP_TTL_SECONDS },
  );
}

function hasValidStepUpHeader(req, user) {
  const raw = req.headers?.['x-step-up-token'];
  if (!raw || typeof raw !== 'string') return false;
  try {
    const payload = jwt.verify(raw.trim(), config.jwtSecret);
    return (
      payload.purpose === 'step_up'
      && payload.sub === user.id
      && Number(payload.tv ?? 0) === Number(user.token_version ?? 0)
    );
  } catch {
    return false;
  }
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
      `SELECT id, custom_id, name, email, role, avatar, program, department, title,
              is_verified, token_version, totp_enabled, suspended_at, last_active_at
       FROM users WHERE id = $1`, [payload.sub],
    );
    const user = rows[0];
    if (!user) return { error: 'Account no longer exists' };
    // Sign-out-all and password changes bump token_version. Tokens minted
    // before the column existed carry no `tv`, which maps to version 0.
    if (Number(payload.tv ?? 0) !== Number(user.token_version ?? 0)) {
      return { error: 'Session revoked — sign in again' };
    }
    // Enforce 30-minute idle timeout for superadmin accounts.
    if (user.role === 'superadmin') {
      const now = Date.now();
      const lastActiveMs = user.last_active_at ? new Date(user.last_active_at).getTime() : null;
      const issuedMs = payload.iat ? payload.iat * 1000 : now;
      if (lastActiveMs && lastActiveMs >= issuedMs && (now - lastActiveMs) > SUPERADMIN_IDLE_TIMEOUT_MS) {
        return { error: 'Superadmin session timed out after inactivity — sign in again' };
      }
      // Refresh activity heartbeat at most once per minute to avoid write churn.
      if (!lastActiveMs || (now - lastActiveMs) > 60_000) {
        pool.query(`UPDATE users SET last_active_at = CURRENT_TIMESTAMP WHERE id = $1`, [user.id]).catch(() => {});
      }
    }
    return {
      user,
      authExp: payload.exp ?? null,
      authIat: payload.iat ?? null,
      authMfa: Boolean(payload.mfa),
    };
  } catch {
    return { error: 'Invalid or expired token' };
  }
}

export const requireAuth = async (req, res, next) => {
  const result = await authenticateRequest(req);
  if (result.error) return unauthorized(res, result.error);
  req.user = result.user;
  req.authExp = result.authExp;
  req.authIat = result.authIat;
  req.authMfa = result.authMfa;
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

/** Enforces that tutors are accredited (is_verified = true) and not suspended. */
export const requireVerifiedTutor = ({ allowFaculty = false } = {}) => (req, res, next) => {
  if (!req.user) return unauthorized(res);
  if (allowFaculty && req.user.role === 'faculty') return next();
  if (req.user.role !== 'tutor' || !req.user.is_verified || req.user.suspended_at) {
    return res.status(403).json({
      error: req.user.suspended_at
        ? 'Your tutor accreditation is currently suspended'
        : 'Requires an accredited, verified tutor account',
    });
  }
  next();
};

/**
 * Step-up guard for high-privilege superadmin actions.
 * Passes with a valid 10m X-Step-Up-Token header OR a fresh login within 10m
 * (with MFA verified if TOTP 2FA is enrolled).
 */
export const requireStepUp = (req, res, next) => {
  if (!req.user) return unauthorized(res);
  if (req.user.role !== 'superadmin') return next();
  if (hasValidStepUpHeader(req, req.user)) return next();

  const freshLogin = Boolean(
    req.authIat && (Date.now() - req.authIat * 1000) <= STEP_UP_TTL_SECONDS * 1000,
  );
  if (freshLogin && (!req.user.totp_enabled || req.authMfa)) {
    return next();
  }

  return res.status(403).json({
    error: 'Step-up verification required for this administrative action',
    code: 'STEP_UP_REQUIRED',
    totpEnabled: Boolean(req.user.totp_enabled),
  });
};
