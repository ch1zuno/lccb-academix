import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { signToken } from '../middleware/auth.js';
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  SESSION_TTL_MS,
  setSessionCookie,
  clearSessionCookie,
} from './sessionCookie.js';

test('signToken enforces a hard 48-hour expiry', () => {
  const token = signToken({ id: 'u-1', role: 'learner', name: 'Test User', token_version: 2 });
  const decoded = jwt.decode(token);
  assert.equal(SESSION_TTL_SECONDS, 48 * 60 * 60);
  assert.equal(decoded.exp - decoded.iat, SESSION_TTL_SECONDS);
  assert.equal(decoded.tv, 2);
});

test('setSessionCookie and clearSessionCookie use matching 48h HttpOnly strict attributes', () => {
  let setCall = null;
  let clearCall = null;
  const res = {
    cookie: (name, value, opts) => { setCall = { name, value, opts }; },
    clearCookie: (name, opts) => { clearCall = { name, opts }; },
  };

  setSessionCookie(res, 'jwt-value');
  assert.equal(setCall.name, SESSION_COOKIE);
  assert.equal(setCall.value, 'jwt-value');
  assert.equal(setCall.opts.httpOnly, true);
  assert.equal(setCall.opts.sameSite, 'strict');
  assert.equal(setCall.opts.maxAge, SESSION_TTL_MS);
  assert.equal(setCall.opts.maxAge, 48 * 60 * 60 * 1000);

  clearSessionCookie(res);
  assert.equal(clearCall.name, SESSION_COOKIE);
  assert.equal(clearCall.opts.httpOnly, true);
  assert.equal(clearCall.opts.sameSite, 'strict');
  assert.equal(clearCall.opts.path, '/');
});
