/* Opaque HttpOnly session cookie. The JWT is never readable by browser code;
 * API scripts may still send the same token as a Bearer header. */
import { config } from '../config.js';

export const SESSION_COOKIE = 'academix_session';
export const SESSION_TTL_SECONDS = 48 * 60 * 60; // hard 48h cap before re-login
export const SESSION_TTL_MS = SESSION_TTL_SECONDS * 1000;

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

export function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: config.isProd,
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_TTL_MS,
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
