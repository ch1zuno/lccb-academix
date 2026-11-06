/* Concurrency e2e:
 *  1. two different-reward redemptions fired at once cannot overdraw a wallet
 *  2. a session with no check-ins cannot be wrapped up for points
 */
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
  const learner = (await login('TE-092')).data;
  const { rows: [user] } = await client.query(
    `SELECT id FROM users WHERE custom_id = 'TE-092'`,
  );
  const { rows: [wallet] } = await client.query(
    `SELECT COALESCE(SUM(amount), 0)::int AS balance FROM points_ledger WHERE user_id = $1`, [user.id]);
  const target = 150;
  if (wallet.balance < target) {
    await client.query(
      `INSERT INTO points_ledger (user_id, amount, description) VALUES ($1, $2, 'E2E concurrency fixture')`,
      [user.id, target - wallet.balance],
    );
  }
  const rewards = (await request('/rewards', { token: learner.token })).data.rewards;
  const a = rewards.find((r) => r.cost === 100 && r.stock > 0);
  const b = rewards.find((r) => r.cost === 120 && r.stock > 0);
  assert(a && b, 'expected the 100 and 120 point rewards in stock');

  const [ra, rb] = await Promise.all([
    request(`/rewards/${a.id}/redeem`, { method: 'POST', token: learner.token }),
    request(`/rewards/${b.id}/redeem`, { method: 'POST', token: learner.token }),
  ]);
  const statuses = [ra.status, rb.status].sort((x, y) => x - y);
  assert(statuses[0] === 201 && statuses[1] === 409, `expected one 201 and one 409, got ${statuses.join('/')}: ${ra.data.error ?? ''} ${rb.data.error ?? ''}`);

  const after = (await request('/wallet', { token: learner.token })).data;
  assert(Number(after.balance) >= 0, `wallet went negative: ${after.balance}`);
  assert(Number(after.balance) === 30 || Number(after.balance) === 50, `unexpected wallet after race: ${after.balance}`);

  // Wrap-up must reject a real upcoming session that has zero check-ins.
  const tutor = (await login('TU-042')).data;
  const sessions = (await request('/sessions/mine', { token: tutor.token })).data.sessions ?? [];
  const unconfirmed = sessions.find((s) => s.status === 'upcoming' && Number(s.check_in_count) < 2);
  assert(unconfirmed, 'need an upcoming session with fewer than two check-ins for the anti-farming probe');
  const cheat = await request(`/sessions/${unconfirmed.id}/wrap-up`, {
    method: 'POST', token: tutor.token, body: { rating: 5, notes: 'no check-in' },
  });
  assert(cheat.status === 409, `wrap-up without check-ins should be 409, got ${cheat.status}`);

  console.log('Concurrency and anti-farming e2e passed.');
} finally {
  await client.end();
}
