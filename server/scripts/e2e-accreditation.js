/* Accreditation e2e: apply → fetch exam (no answers leaked) → submit → grade → superadmin approve. */
import 'dotenv/config';
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
const psql = new pg.default.Client({ connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/lccb_academix' });
await psql.connect();
const CORRECT = {};
{
  const { rows } = await psql.query('SELECT question_number, answer FROM exam_questions ORDER BY question_number');
  rows.forEach(q => { CORRECT[q.question_number] = q.answer; });
}

(async () => {
  const learner = (await login('TE-092')).data; // Pringle
  const sa = (await login('l.betita.admin@lccbacolod.edu.ph')).data;

  const rejected = await request('/accreditation/exam', { token: learner.token });
  console.log('exam before apply:', rejected.status, rejected.data.error);

  const subs = (await request('/subjects', { token: learner.token })).data.subjects.slice(0, 2);
  const docs = [
    { title: "Dean's Lister — 1st Sem AY 2025-2026", detail: 'GWA 1.32', link: 'https://drive.example.com/scan-maria' },
    { title: 'LCCB Coding Cup 2025 — Champion', detail: 'Programming competition certificate' },
  ];
  const apply = await request('/accreditation/apply', { method: 'POST', token: learner.token, body: { subjectIds: subs.map(s => s.id), achievements: docs } });
  console.log('apply:', apply.status, apply.data.application ?? apply.data.error);
  if (apply.status !== 201) { console.log('ABORT — apply failed'); process.exit(1); }

  const mine0 = (await request('/accreditation/mine', { token: learner.token })).data.application;
  console.log('documents on application:', mine0.achievements?.length, '(expected 2) | code:', mine0.application_code);

  const badLink = await request('/accreditation/apply', { method: 'POST', token: (await login('TE-128')).data.token, body: { subjectIds: subs.map(s => s.id), achievements: [{ title: 'x', link: 'javascript:alert(1)' }] } });
  console.log('bad document link rejected:', badLink.status, badLink.data.error);

  const again = await request('/accreditation/apply', { method: 'POST', token: learner.token, body: { subjectIds: subs.map(s => s.id) } });
  console.log('duplicate apply:', again.status, again.data.error);

  const exam = (await request('/accreditation/exam', { token: learner.token })).data;
  console.log('exam questions:', exam.questions.length, '| answer leaked?', JSON.stringify(exam.questions[0]).includes('"answer"'));

  // submit all-correct answers
  const answers = {};
  exam.questions.forEach(q => { answers[q.question_number] = CORRECT[q.question_number]; });
  const graded = await request('/accreditation/exam', { method: 'POST', token: learner.token, body: { answers } });
  console.log('graded (all correct):', graded.data.exam_score, 'passed:', graded.data.passed);

  // tamper check: exam is one-shot — a second submission must be rejected
  const rescore = await request('/accreditation/exam', { method: 'POST', token: learner.token, body: { answers: { '1': 99 } } });
  console.log('second submission:', rescore.status, rescore.data.error);

  const list = (await request('/accreditation/applications', { token: sa.token })).data.applications;
  console.log('superadmin sees:', list.map(a => `${a.application_code}:${a.name}:${a.exam_score}:${a.status}`).join(' '));
  const withDocs = list.find(a => a.application_code === mine0.application_code);
  console.log('superadmin sees documents:', withDocs?.achievements?.length === 2 ? '2 (ok)' : `got ${JSON.stringify(withDocs?.achievements)}`);

  const mine = list.find(a => a.exam_score === 100);
  const approve = await request(`/accreditation/:id/approve`.replace(':id', mine.id), { method: 'POST', token: sa.token });
  console.log('approve:', approve.status, JSON.stringify(approve.data));
  const double = await request(`/accreditation/approvals/${mine.id}` && `/accreditation/${mine.id}/approve`, { method: 'POST', token: sa.token });
  console.log('double approve:', double.status, double.data.error);

  const userRow = (await psql.query('SELECT is_verified, certified_by_id IS NOT NULL AS has_certifier, role FROM users WHERE email = $1', [learner.user.email])).rows[0];
  console.log('user after approve:', JSON.stringify(userRow));
})().finally(() => psql.end());
