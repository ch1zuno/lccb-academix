/* Wrap-up e2e: validates single-transaction session end + wrap-up (notes + rating + hours + points). */
import pg from 'pg';
import { E2E_DATABASE_URL } from './e2e-db.js';
const BASE = (process.env.E2E_API_BASE || 'http://localhost:4000').replace(/\/+$/, '') + '/api';

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
const psql = new pg.Client({ connectionString: E2E_DATABASE_URL });
await psql.connect();

(async () => {
  const tutor = (await login('TU-042')).data;
  const { rows: [tutorRow] } = await psql.query('SELECT id FROM users WHERE email = $1', [tutor.user.email]);
  if (!tutorRow || tutorRow.id !== tutor.user.id) {
    throw new Error('Direct SQL target does not match the API database — set E2E_DATABASE_URL or run the API against the same local database.');
  }
  const mine = (await request('/sessions/mine', { token: tutor.token })).data.sessions;
  const unconfirmed = mine.find((s) => s.status === 'upcoming' && Number(s.check_in_count) === 0);
  if (unconfirmed) {
    const cheat = await request(`/sessions/${unconfirmed.id}/wrap-up`, {
      method: 'POST', token: tutor.token, body: { rating: 5, notes: 'no check-in' },
    });
    console.log('wrap without check-ins ->', cheat.status, cheat.data.error);
    if (cheat.status !== 409) throw new Error('wrap-up without check-ins should be 409');
  }
  const inProgress = mine.find(s => s.status === 'in-progress');
  if (!inProgress) { console.log('no in-progress session; abort — run e2e-checkin first'); process.exit(0); }
  console.log('wrapping', inProgress.session_code, 'learner:', inProgress.learner_name);

  const refRow = (await psql.query(
    `SELECT r.id FROM referrals r
     WHERE r.learner_id = (SELECT learner_id FROM sessions WHERE id = $1) LIMIT 1`, [inProgress.id])).rows[0];
  if (!refRow) console.log('learner has no referral; skipping decay');
  else await psql.query(`UPDATE sessions SET referral_id = $1 WHERE id = $2`, [refRow.id, inProgress.id]);

  // Backdate started_at past minimum duration threshold for legitimate wrap-up test
  await psql.query(`UPDATE sessions SET started_at = now() - interval '15 minutes' WHERE id = $1`, [inProgress.id]);

  const bad = await request(`/sessions/${inProgress.id}/wrap-up`, { method: 'POST', token: tutor.token, body: { notes: 'no rating!' } });
  console.log('missing rating:', bad.status, bad.data.error);

  const out = await request(`/sessions/${inProgress.id}/wrap-up`, {
    method: 'POST', token: tutor.token, body: { notes: 'Great progress on linked lists today', rating: 5 },
  });
  console.log('wrap-up:', out.status, JSON.stringify({ points: out.data.points, learnerPoints: out.data.learnerPoints, status: out.data.session?.status }));
  if (out.status !== 200) throw new Error(`wrap-up failed: ${out.status} ${out.data.error ?? ''}`);

  // Idempotent double-end on Online session must not re-post points
  if (inProgress.mode === 'online') {
    const endAgain = await request(`/sessions/${inProgress.id}/end`, { method: 'POST', token: tutor.token });
    console.log('post-wrap end (idempotent):', endAgain.status, endAgain.data.alreadyEnded);
    if (endAgain.status !== 200 || endAgain.data.alreadyEnded !== true || endAgain.data.points !== 0) {
      throw new Error(`idempotent double-end failed: ${JSON.stringify(endAgain.data)}`);
    }
  }

  const again = await request(`/sessions/${inProgress.id}/wrap-up`, {
    method: 'POST', token: tutor.token, body: {},
  });
  console.log('second wrap <= conflict:', again.status, again.data.error);
  if (again.status !== 409) throw new Error(`second wrap should be 409, got ${again.status}`);
})().finally(async () => { await psql.end(); });
