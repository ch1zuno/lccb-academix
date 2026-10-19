/* Wrap-up e2e: validates single-transaction session wrap (notes + rating + hours + points). */
const BASE = 'http://localhost:4000/api';

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
const pg = await import('pg');
const psql = new pg.default.Client({ connectionString: 'postgres://postgres:postgres@localhost:5432/lccb_academix' });
await psql.connect();

(async () => {
  const tutor = (await login('TU-042')).data;
  const mine = (await request('/sessions/mine', { token: tutor.token })).data.sessions;
  const inProgress = mine.find(s => s.status === 'in-progress');
  if (!inProgress) { console.log('no in-progress session; abort — run e2e-checkin first'); process.exit(0); }
  console.log('wrapping', inProgress.session_code, 'learner:', inProgress.learner_name);

  // find a referral the learner belongs to (REF-001 latest learner assignment on TU-042)
  const refRow = (await psql.query(
    `SELECT r.id FROM referrals r
     WHERE r.learner_id = (SELECT learner_id FROM sessions WHERE id = $1) LIMIT 1`, [inProgress.id])).rows[0];
  // attach a referral to the session so the update path is exercised?
  if (!refRow) console.log('learner has no referral; skipping decay');
  else await psql.query(`UPDATE sessions SET referral_id = $1 WHERE id = $2`, [refRow.id, inProgress.id]);

  // validate before wrap
  const bad = await request(`/sessions/${inProgress.id}/wrap-up`, { method: 'POST', token: tutor.token, body: { notes: 'no rating!' } });
  console.log('missing rating:', bad.status, bad.data.error);

  const out = await request(`/sessions/${inProgress.id}/wrap-up`, {
    method: 'POST', token: tutor.token, body: { notes: 'Great progress on linked lists today', rating: 5 },
  });
  console.log('wrap-up:', out.status, JSON.stringify(out.data));

  const again = await request(`/sessions/${inProgress.id}/wrap-up`, {
    method: 'POST', token: tutor.token, body: { notes: 'repeat', rating: 3 },
  });
  console.log('second wrap <= conflict:', again.status, again.data.error);
})().finally(async () => { await psql.end(); });
