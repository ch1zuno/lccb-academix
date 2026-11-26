/* Security hardening e2e: verifies RLS on all public tables, change-password rate
 * limiting, constant-time login rejection, device key rejection, WebSocket auth +
 * room membership enforcement, fail-closed Centrifugo proxy, and role guards. */
import 'dotenv/config';
import pg from 'pg';
import WebSocket from 'ws';
import jwt from 'jsonwebtoken';
import { generateTotpCode } from '../lib/totp.js';

const ORIGIN = (process.env.E2E_API_BASE || 'http://localhost:4000').replace(/\/+$/, '');
const BASE = `${ORIGIN}/api`;
const WS_URL = `${ORIGIN.replace(/^http/, 'ws')}/realtime-ws`;

async function request(path, { method = 'GET', token, headers = {}, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data;
  try { data = await res.json(); } catch { data = {}; }
  return { status: res.status, data };
}

const assert = (ok, message) => { if (!ok) throw new Error(message); };

(async () => {
  // 1. Unknown user login returns identical 401 message as bad password
  const unknownUser = await request('/auth/login', {
    method: 'POST',
    body: { loginId: 'NONEXISTENT-99999', password: 'wrong-password' },
  });
  assert(unknownUser.status === 401, `expected 401 for unknown user, got ${unknownUser.status}`);
  assert(
    unknownUser.data.error === 'Invalid school ID / email or password',
    `unexpected login error message: ${unknownUser.data.error}`,
  );

  // 2. Device API rejects invalid X-Device-Key
  const badDevice = await request('/device/roster', {
    headers: { 'X-Device-Key': 'wrong-key-value' },
  });
  assert(badDevice.status === 401, `expected 401 for bad device key, got ${badDevice.status}`);

  // 3. Password change endpoint enforces rate limit (max 5 / 15 min)
  const login = await request('/auth/login', {
    method: 'POST',
    body: { loginId: 'TE-245', password: 'demo1234' },
  });
  assert(login.status === 200 && login.data.token, `login for TE-245 failed: ${login.status}`);
  const token = login.data.token;

  for (let i = 1; i <= 5; i += 1) {
    const attempt = await request('/auth/change-password', {
      method: 'POST',
      token,
      body: { currentPassword: 'wrong-password', newPassword: 'NewStrongPassword123!' },
    });
    assert(attempt.status === 401, `attempt ${i} expected 401, got ${attempt.status}`);
  }
  const throttled = await request('/auth/change-password', {
    method: 'POST',
    token,
    body: { currentPassword: 'wrong-password', newPassword: 'NewStrongPassword123!' },
  });
  assert(throttled.status === 429, `6th change-password attempt should be 429, got ${throttled.status}`);

  // 4. Role separation check: learner blocked from faculty CSV export and superadmin audit log
  const csvGuard = await request('/referrals/export.csv', { token });
  assert(csvGuard.status === 403, `learner should get 403 on CSV export, got ${csvGuard.status}`);
  const auditGuard = await request('/audit', { token });
  assert(auditGuard.status === 403, `learner should get 403 on /audit, got ${auditGuard.status}`);

  // 5. Centrifugo subscribe proxy fails closed on missing/invalid secret (403 or 503, never 200)
  const proxyBad = await request('/realtime/proxy/subscribe', {
    method: 'POST',
    body: { user: login.data.user.id, channel: 'tutoring-room:SES-001' },
  });
  assert(
    proxyBad.status === 403 || proxyBad.status === 503,
    `realtime proxy without secret must return 403 or 503, got ${proxyBad.status}`,
  );

  // 6. WebSocket /realtime-ws rejects unauthenticated sockets (4001) and unauthorized room joins
  const anonCloseCode = await new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    const timer = setTimeout(() => { ws.terminate(); reject(new Error('anon ws did not close')); }, 4000);
    ws.on('close', (code) => { clearTimeout(timer); resolve(code); });
    ws.on('error', () => {});
  });
  assert(anonCloseCode === 4001, `expected unauthenticated WS close code 4001, got ${anonCloseCode}`);

  // Fetch a real session belonging to TU-042, then verify TE-245 (not a participant) is denied WS subscribe
  const tutorLogin = await request('/auth/login', {
    method: 'POST',
    body: { loginId: 'TU-042', password: 'demo1234' },
  });
  const tutorSessions = await request('/sessions/mine', { token: tutorLogin.data.token });
  const targetSession = (tutorSessions.data.sessions || []).find(
    (s) => (s.status === 'upcoming' || s.status === 'in-progress') && s.learner_id !== login.data.user.id,
  );
  assert(Boolean(targetSession), 'expected a session belonging to another learner for WS membership check');

  const outsiderMsg = await new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL, { headers: { Authorization: `Bearer ${token}` } });
    const timer = setTimeout(() => { ws.terminate(); reject(new Error('outsider ws timeout')); }, 4000);
    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'subscribe', roomId: targetSession.id, user: { id: tutorLogin.data.user.id } }));
    });
    ws.on('message', (raw) => {
      clearTimeout(timer);
      ws.close();
      resolve(JSON.parse(raw.toString()));
    });
    ws.on('error', (err) => { clearTimeout(timer); reject(err); });
  });
  assert(outsiderMsg.type === 'error', `outsider WS subscribe should return error, got ${JSON.stringify(outsiderMsg)}`);

  const memberMsg = await new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL, { headers: { Authorization: `Bearer ${tutorLogin.data.token}` } });
    const timer = setTimeout(() => { ws.terminate(); reject(new Error('member ws timeout')); }, 4000);
    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'subscribe', roomId: targetSession.id }));
    });
    ws.on('message', (raw) => {
      clearTimeout(timer);
      ws.close();
      resolve(JSON.parse(raw.toString()));
    });
    ws.on('error', (err) => { clearTimeout(timer); reject(err); });
  });
  assert(memberMsg.type === 'subscribed', `authorized tutor WS subscribe should succeed, got ${JSON.stringify(memberMsg)}`);

  // 7. Role-scoped JWT TTLs + unverified tutor enforcement + Superadmin 2FA & containment
  const saLogin = await request('/auth/login', {
    method: 'POST',
    body: { loginId: 'l.betita.admin@lccbacolod.edu.ph', password: 'demo1234' },
  });
  assert(saLogin.status === 200 && saLogin.data.token, `superadmin login failed: ${saLogin.status}`);
  const saJwt = jwt.decode(saLogin.data.token);
  const tutorJwt = jwt.decode(tutorLogin.data.token);
  const learnerJwt = jwt.decode(token);
  assert(saJwt.exp - saJwt.iat === 2 * 60 * 60, `expected 2h superadmin JWT, got ${saJwt.exp - saJwt.iat}`);
  assert(tutorJwt.exp - tutorJwt.iat === 12 * 60 * 60, `expected 12h tutor JWT, got ${tutorJwt.exp - tutorJwt.iat}`);
  assert(learnerJwt.exp - learnerJwt.iat === 48 * 60 * 60, `expected 48h learner JWT, got ${learnerJwt.exp - learnerJwt.iat}`);

  // Unverified tutor TU-038 must be blocked from availability toggle and tasks
  const unverifiedTutor = await request('/auth/login', {
    method: 'POST',
    body: { loginId: 'TU-038', password: 'demo1234' },
  });
  assert(unverifiedTutor.status === 200 && unverifiedTutor.data.token, `TU-038 login failed: ${unverifiedTutor.status}`);
  const blockedAvail = await request('/tutors/me/availability', {
    method: 'PATCH',
    token: unverifiedTutor.data.token,
    body: { available: false },
  });
  assert(blockedAvail.status === 403, `unverified tutor availability should be 403, got ${blockedAvail.status}`);
  const blockedTasks = await request('/tasks', { token: unverifiedTutor.data.token });
  assert(blockedTasks.status === 403, `unverified tutor tasks should be 403, got ${blockedTasks.status}`);

  // Superadmin 2FA setup -> enable -> challenge login -> verify-login -> step-up -> disable
  const setup = await request('/auth/totp/setup', { method: 'POST', token: saLogin.data.token });
  assert(setup.status === 200 && setup.data.secret, `totp setup failed: ${setup.status}`);
  const enabled = await request('/auth/totp/enable', {
    method: 'POST',
    token: saLogin.data.token,
    body: { code: generateTotpCode(setup.data.secret) },
  });
  assert(enabled.status === 200 && enabled.data.enabled === true && enabled.data.recoveryCodes?.length === 8, `totp enable failed: ${enabled.status}`);

  const mfaPrompt = await request('/auth/login', {
    method: 'POST',
    body: { loginId: 'l.betita.admin@lccbacolod.edu.ph', password: 'demo1234' },
  });
  assert(mfaPrompt.status === 200 && mfaPrompt.data.requiresTotp === true && mfaPrompt.data.challengeToken, `expected TOTP challenge on login`);

  const mfaDone = await request('/auth/totp/verify-login', {
    method: 'POST',
    body: { challengeToken: mfaPrompt.data.challengeToken, code: generateTotpCode(setup.data.secret) },
  });
  assert(mfaDone.status === 200 && mfaDone.data.token, `totp verify-login failed: ${mfaDone.status}`);
  const saMfaToken = mfaDone.data.token;

  const stepUp = await request('/auth/step-up', {
    method: 'POST',
    token: saMfaToken,
    body: { code: generateTotpCode(setup.data.secret) },
  });
  assert(stepUp.status === 200 && stepUp.data.stepUpToken, `step-up failed: ${stepUp.status}`);

  // Superadmin tutor governance: suspend TU-015 -> kills TU-015 session -> reinstate TU-015
  const targetTutor = await request('/auth/login', {
    method: 'POST',
    body: { loginId: 'TU-015', password: 'demo1234' },
  });
  assert(targetTutor.status === 200 && targetTutor.data.token, 'TU-015 login failed');

  const suspended = await request(`/admin/tutors/${targetTutor.data.user.id}/suspend`, {
    method: 'POST',
    token: saMfaToken,
    headers: { 'X-Step-Up-Token': stepUp.data.stepUpToken },
    body: { reason: 'E2E security test suspension' },
  });
  assert(suspended.status === 200 && suspended.data.suspended === true, `suspend failed: ${suspended.status}`);

  const deadSession = await request('/auth/me', { token: targetTutor.data.token });
  assert(deadSession.status === 401, `suspended tutor old JWT must be 401, got ${deadSession.status}`);

  const reinstated = await request(`/admin/tutors/${targetTutor.data.user.id}/reinstate`, {
    method: 'POST',
    token: saMfaToken,
    headers: { 'X-Step-Up-Token': stepUp.data.stepUpToken },
  });
  assert(reinstated.status === 200 && reinstated.data.reinstated === true, `reinstate failed: ${reinstated.status}`);

  // Cleanly disable 2FA on SA-001 so subsequent demo/e2e scripts can log in with password
  const disabled = await request('/auth/totp/disable', {
    method: 'POST',
    token: saMfaToken,
    body: { currentPassword: 'demo1234', code: enabled.data.recoveryCodes[0] },
  });
  assert(disabled.status === 200 && disabled.data.disabled === true, `totp disable failed: ${disabled.status}`);

  // 8. Database RLS verification on local Postgres
  if (process.env.DATABASE_URL) {
    const parsed = new URL(process.env.DATABASE_URL);
    const local = /^(localhost|127\.0\.0\.1|::1)$/.test(parsed.hostname);
    if (local) {
      const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
      try {
        const { rows } = await pool.query(
          `SELECT tablename, rowsecurity
             FROM pg_tables
            WHERE schemaname = 'public'
              AND tablename <> 'schema_migrations'
            ORDER BY tablename`,
        );
        assert(rows.length > 0, 'expected public tables in local database');
        const unprotected = rows.filter((r) => !r.rowsecurity).map((r) => r.tablename);
        assert(
          unprotected.length === 0,
          `RLS not enabled on public tables: ${unprotected.join(', ')}`,
        );
      } finally {
        await pool.end();
      }
    }
  }

  console.log('Security hardening e2e passed.');
})().catch((error) => {
  console.error('FAIL', error.message);
  process.exit(1);
});
