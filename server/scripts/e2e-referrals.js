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

  // ── rejected referrals: lifecycle guards + superadmin removal ───────────
  let bad = 0;
  const expect = (label, actual, wanted, extra) => {
    const ok = actual === wanted;
    if (!ok) bad++;
    console.log(`${ok ? 'ok' : 'FAIL'} ${label} -> ${actual}${extra ? ` (${extra})` : ''}`);
  };

  const superadmin = (await login('l.betita.admin@lccbacolod.edu.ph')).data;
  const learnerL = (await login('TE-128')).data;
  const pg2 = new pg.default.Client({ connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/lccb_academix' });
  await pg2.connect();
  const anyLearner = (await pg2.query(`SELECT id FROM users WHERE role = 'learner' ORDER BY created_at LIMIT 1`)).rows[0].id;
  const anySubject = (await pg2.query(`SELECT id FROM subjects ORDER BY code LIMIT 1`)).rows[0].id;
  await pg2.end();

  const created = await request('/referrals', {
    method: 'POST', token: faculty.token,
    body: { learnerId: anyLearner, subjectId: anySubject, topic: 'E2E rejection probe', urgency: 'low', hoursRequired: 2 },
  });
  const staged = created.data.referral;
  expect('create referral', created.status, 201, staged?.referral_code);

  // learners cannot remove anything
  const learnerDelete = await request(`/referrals/${staged.id}`, { method: 'DELETE', token: learnerL.token });
  expect('learner delete (403)', learnerDelete.status, 403, learnerDelete.data.error);

  // superadmin can only remove REJECTED referrals — flagged must be refused
  const preDelete = await request(`/referrals/${staged.id}`, { method: 'DELETE', token: superadmin.token });
  expect('superadmin delete while flagged (409)', preDelete.status, 409, preDelete.data.error);

  // creator faculty rejects the flagged referral; then it is terminal
  const rejected = await request(`/referrals/${staged.id}/status`, { method: 'PATCH', token: faculty.token, body: { status: 'rejected' } });
  expect('faculty reject', rejected.status, 200, rejected.data.referral?.status);
  const revive = await request(`/referrals/${staged.id}/status`, { method: 'PATCH', token: faculty.token, body: { status: 'assigned' } });
  expect('rejected is terminal (409)', revive.status, 409, revive.data.error);

  // superadmin removes it; a second DELETE finds nothing
  const removed = await request(`/referrals/${staged.id}`, { method: 'DELETE', token: superadmin.token });
  expect('superadmin delete rejected', removed.status, 200, removed.data.removed === true ? 'removed ok' : JSON.stringify(removed.data));
  const gone = await request(`/referrals/${staged.id}`, { method: 'DELETE', token: superadmin.token });
  expect('delete again (404)', gone.status, 404, gone.data.error);

  if (bad) process.exit(1);
})();
