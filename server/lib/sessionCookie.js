/* Opaque HttpOnly session cookie. The JWT is never readable by browser code;
 * API scripts may still send the same token as a Bearer header. */
import { config } from '../config.js';

export const SESSION_COOKIE = 'academix_session';
export const SESSION_TTL_SECONDS = 48 * 60 * 60; // default 48h cap (learners)
export const SESSION_TTL_MS = SESSION_TTL_SECONDS * 1000;
export const SUPERADMIN_IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30m inactivity cap for superadmin
export const STEP_UP_TTL_SECONDS = 10 * 60; // 10m step-up validity window

export const ROLE_SESSION_TTL_SECONDS = {
  superadmin: 2 * 60 * 60, // 2h hard cap for Dean / Superadmin
  tutor: 12 * 60 * 60, // 12h hard cap for Accredited Tutors
  faculty: 24 * 60 * 60, // 24h hard cap for Faculty
  learner: SESSION_TTL_SECONDS, // 48h hard cap for Students
};

export function sessionTtlSecondsForRole(role) {
  return ROLE_SESSION_TTL_SECONDS[role] ?? SESSION_TTL_SECONDS;
}

export function sessionTtlMsForRole(role) {
  return sessionTtlSecondsForRole(role) * 1000;
}

export function readCookie(req, name) {
  const raw = req.headers?.cookie;
  if (!raw) return null;
  for (const part of raw.split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    if (part.slice(0, index).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(index + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

export function requestToken(req) {
  const bearer = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  return bearer || readCookie(req, SESSION_COOKIE);
}

export function setSessionCookie(res, token, role) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: config.isProd,
    sameSite: 'strict',
    path: '/',
    maxAge: sessionTtlMsForRole(role),
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    secure: config.isProd,
    sameSite: 'strict',
    path: '/',
  });
}
