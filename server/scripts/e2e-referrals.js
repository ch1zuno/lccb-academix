/* Minimal API e2e: faculty assigns a tutor to REF-001, tutor accepts progress; learner must NOT be able to change status. */
import 'dotenv/config';
const BASE = 'http://localhost:4000/api';

async function request(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data;
  try { data = await res.json(); } catch { data = {}; }
  return { status: res.status, data };
}

const login = (loginId) => request('/auth/login', { method: 'POST', body: { loginId, password: 'demo1234' } });

(async () => {
  const faculty = (await login('b.tisuela@lccbacolod.edu.ph')).data;
  let refs = (await request('/referrals', { token: faculty.token })).data.referrals;
  const ref = refs.find(r => r.referral_code === 'REF-001');
  console.log('target', ref.referral_code, ref.status);

  // faculty picks the flagged one and assigns TU-056 (learner-only referral probes follow)
  // faculty assigns a real tutor to the flagged referral
  const pg = await import('pg');
  const psql = new pg.default.Client({ connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/lccb_academix' });
  await psql.connect();
  const tutorRow = (await psql.query(`SELECT id FROM users WHERE custom_id = 'TU-056'`)).rows[0];
  await psql.end();
  const assigned = await request(`/referrals/${ref.id}/assign`, { method: 'POST', token: faculty.token, body: { tutorId: tutorRow.id } });
  console.log('assign REF-001 ->', assigned.status, JSON.stringify(assigned.data));

  // negative check: assign on a	RESOLVED referral must fail
  const resolved = refs.find(r => r.status === 'resolved');
  if (resolved) {
    const badAssign = await request(`/referrals/${resolved.id}/assign`, { method: 'POST', token: faculty.token, body: { tutorId: tutorRow.id } });
    console.log('assign resolved ->', badAssign.status, badAssign.data.error);
  }

  // authorization: learner attempts to update status
  const learner = (await login('TE-128')).data;
  const learnerRefs = (await request('/referrals', { token: learner.token })).data.referrals;
  const own = learnerRefs[0];
  const forbidden = await request(`/referrals/${own.id}/status`, { method: 'PATCH', token: learner.token, body: { status: 'assigned' } });
  console.log('learner patch status ->', forbidden.status, forbidden.data.error);

  // faculty progress transition on an assigned referral (REF-004 from seed)
  const ref4 = refs.find(r => r.referral_code === 'REF-004' && r.status === 'assigned');
  if (ref4) {
    const prog = await request(`/referrals/${ref4.id}/status`, { method: 'PATCH', token: faculty.token, body: { status: 'in-progress' } });
    console.log('faculty in-progress ->', prog.status, JSON.stringify(prog.data.referral || prog.data.error));
  } else {
    console.log('no assigned referral visible to this faculty (REF-004 belongs to FA-021); skipping');
  }
})();
