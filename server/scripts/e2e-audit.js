/* Audit trail e2e: login writes a row, superadmin can read it, learner cannot,
 * and the database rejects UPDATE/DELETE on audit_log. */
import pg from 'pg';
import { E2E_DATABASE_URL } from './e2e-db.js';

const BASE = (process.env.E2E_API_BASE || 'http://localhost:4000').replace(/\/+$/, '') + '/api';
const client = new pg.Client({ connectionString: E2E_DATABASE_URL });
await client.connect();

async function request(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data; try { data = await res.json(); } catch { data = {}; }
  return { status: res.status, data };
}
const login = (loginId) => request('/auth/login', { method: 'POST', body: { loginId, password: 'demo1234' } });
const assert = (ok, message) => { if (!ok) throw new Error(message); };

try {
  const admin = await login('l.betita.admin@lccbacolod.edu.ph');
  const learner = await login('TE-092');
  assert(admin.status === 200, 'superadmin login failed');

  const feed = await request('/audit?limit=5', { token: admin.data.token });
  assert(feed.status === 200, `audit read failed: ${feed.status}`);
  assert(Array.isArray(feed.data.entries) && feed.data.entries.length > 0, 'audit feed is empty');
  assert(feed.data.entries.some((e) => e.action === 'auth.login'), 'login events missing');

  const denied = await request('/audit', { token: learner.data.token });
  assert(denied.status === 403, `learner should be blocked, got ${denied.status}`);

  const row = (await client.query('SELECT id FROM audit_log ORDER BY id DESC LIMIT 1')).rows[0];
  assert(row, 'no audit row to probe');
  for (const sql of [
    `UPDATE audit_log SET action = 'tampered' WHERE id = ${row.id}`,
    `DELETE FROM audit_log WHERE id = ${row.id}`,
  ]) {
    try {
      await client.query(sql);
      throw new Error(`append-only audit statement was allowed: ${sql}`);
    } catch (error) {
      assert(/append-only/i.test(error.message), `wrong audit error: ${error.message}`);
    }
  }
  console.log('Audit trail e2e passed.');
} finally {
  await client.end();
}
