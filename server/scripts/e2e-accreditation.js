/* Accreditation e2e: apply → files → exam → grade → approve.
 * Also asserts the upload guards: type/size/ownership/5-file cap/approve gate. */
import 'dotenv/config';
const BASE = 'http://localhost:4000/api';

const DEMO_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAJElEQVR4nGPg13S6soYXgpDZDFhF+TWdGLCKQnVgNY2BDnYAADMIUhFiMs0JAAAAAElFTkSuQmCC',
  'base64',
);

let failures = 0;
function check(label, ok, detail = '') {
  if (ok) {
    console.log(`  ✓ ${label}`);
  } else {
    failures += 1;
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`);
  }
  return ok;
}

async function request(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data; try { data = await res.json(); } catch { data = {}; }
  return { status: res.status, data };
}

async function upload(path, token, { bytes = DEMO_PNG, type = 'image/png', name = 'proof.png' } = {}) {
  const form = new FormData();
  form.append('document', new Blob([bytes], { type }), name);
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  let data; try { data = await res.json(); } catch { data = {}; }
  return { status: res.status, data };
}

async function download(path, token) {
  const res = await fetch(BASE + path, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  const buffer = Buffer.from(await res.arrayBuffer());
  return { status: res.status, type: res.headers.get('content-type'), disposition: res.headers.get('content-disposition'), buffer };
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
  console.log('\nAccreditation: apply, attach files, exam, approve');
  const learner = (await login('TE-092')).data; // Pringle
  const sa = (await login('l.betita.admin@lccbacolod.edu.ph')).data;
  const other = (await login('TE-128')).data;
  if (!learner.token || !sa.token || !other.token) throw new Error('demo logins failed');

  const rejected = await request('/accreditation/exam', { token: learner.token });
  check('exam before apply is 404', rejected.status === 404, `${rejected.status} ${rejected.data.error}`);

  const subs = (await request('/subjects', { token: learner.token })).data.subjects.slice(0, 2);
  const notes = [
    { title: "Dean's Lister — 1st Sem AY 2025-2026", detail: 'GWA 1.32', link: 'https://drive.example.com/scan-maria' },
    { title: 'LCCB Coding Cup 2025 — Champion', detail: 'Programming competition certificate' },
  ];
  const apply = await request('/accreditation/apply', { method: 'POST', token: learner.token, body: { subjectIds: subs.map(s => s.id), achievements: notes } });
  console.log('apply:', apply.status, apply.data.application ?? apply.data.error);
  if (apply.status !== 201) throw new Error('apply failed');
  const appId = apply.data.application.id;

  const mine0 = (await request('/accreditation/mine', { token: learner.token })).data.application;
  check('notes saved with the application', mine0.achievements?.length === 2, `got ${mine0.achievements?.length}`);
  check('new application starts with zero files', mine0.document_count === 0, `got ${mine0.document_count}`);

  const badLink = await request('/accreditation/apply', { method: 'POST', token: other.token, body: { subjectIds: subs.map(s => s.id), achievements: [{ title: 'x', link: 'javascript:alert(1)' }] } });
  check('javascript: link rejected', badLink.status === 400, `${badLink.status}`);

  const again = await request('/accreditation/apply', { method: 'POST', token: learner.token, body: { subjectIds: subs.map(s => s.id) } });
  check('duplicate pending application rejected', again.status === 409, `${again.status}`);

  const exam = (await request('/accreditation/exam', { token: learner.token })).data;
  check('exam has 15 questions', exam.questions?.length === 15, `got ${exam.questions?.length}`);
  check('exam never leaks answers', !JSON.stringify(exam.questions?.[0] ?? {}).includes('"answer"'));

  const answers = {};
  exam.questions.forEach(q => { answers[q.question_number] = CORRECT[q.question_number]; });
  const graded = await request('/accreditation/exam', { method: 'POST', token: learner.token, body: { answers } });
  check('all-correct exam scores 100', graded.data.exam_score === 100, `got ${graded.data.exam_score}`);

  const rescore = await request('/accreditation/exam', { method: 'POST', token: learner.token, body: { answers: { '1': 99 } } });
  check('exam is one-shot', rescore.status === 409, `${rescore.status}`);

  const list = (await request('/accreditation/applications', { token: sa.token })).data.applications;
  const staged = list.find(a => a.application_code === mine0.application_code);
  check('superadmin sees the notes', staged?.achievements?.length === 2, `got ${staged?.achievements?.length}`);
  check('superadmin sees zero files', staged?.document_count === 0, `got ${staged?.document_count}`);

  const blocked = await request(`/accreditation/${appId}/approve`, { method: 'POST', token: sa.token });
  check('approve blocked without a file', blocked.status === 409 && /document/i.test(blocked.data.error ?? ''), `${blocked.status} ${blocked.data.error}`);

  const wrongType = await upload(`/accreditation/${appId}/documents`, learner.token, { name: 'payload.exe' });
  check('executable extension rejected', wrongType.status === 400, `${wrongType.status} ${wrongType.data.error}`);

  const fakePdf = await upload(`/accreditation/${appId}/documents`, learner.token, { name: 'fake.pdf', type: 'application/pdf' });
  check('content/extension mismatch rejected', fakePdf.status === 400, `${fakePdf.status} ${fakePdf.data.error}`);

  const oversized = await upload(`/accreditation/${appId}/documents`, learner.token, {
    name: 'huge.png',
    bytes: Buffer.concat([DEMO_PNG, Buffer.alloc(4 * 1024 * 1024)]),
  });
  check('file over 4 MB rejected', oversized.status === 400, `${oversized.status} ${oversized.data.error}`);

  const first = await upload(`/accreditation/${appId}/documents`, learner.token);
  check('valid PNG attaches', first.status === 201, `${first.status} ${first.data.error}`);
  const firstId = first.data.document?.id;

  const meta = await request(`/accreditation/${appId}/documents`, { token: learner.token });
  check('owner lists one file', meta.status === 200 && meta.data.documents?.length === 1, `${meta.status} ${meta.data.documents?.length}`);
  check('metadata never includes bytes', meta.data.documents?.[0] && !('data' in meta.data.documents[0]));

  const raw = await download(`/accreditation/documents/${firstId}`, learner.token);
  check('owner downloads the file', raw.status === 200 && raw.buffer.equals(DEMO_PNG), `${raw.status} ${raw.buffer.length}B`);
  check('content type + length headers', raw.type === 'image/png' && raw.buffer.length === DEMO_PNG.length, `${raw.type} ${raw.buffer.length}`);

  const rawSa = await download(`/accreditation/documents/${firstId}`, sa.token);
  check('superadmin downloads the file', rawSa.status === 200 && rawSa.buffer.equals(DEMO_PNG), `${rawSa.status}`);

  const rawOther = await download(`/accreditation/documents/${firstId}`, other.token);
  check('other learner cannot download it', rawOther.status === 403, `${rawOther.status}`);

  const metaOther = await request(`/accreditation/${appId}/documents`, { token: other.token });
  check('other learner cannot list the files', metaOther.status === 403, `${metaOther.status}`);

  const uploadOther = await upload(`/accreditation/${appId}/documents`, other.token);
  check('other learner cannot upload to it', uploadOther.status === 403, `${uploadOther.status}`);

  const deleteOther = await request(`/accreditation/documents/${firstId}`, { method: 'DELETE', token: other.token });
  check('other learner cannot remove the file', deleteOther.status === 403, `${deleteOther.status}`);

  const deleteMine = await request(`/accreditation/documents/${firstId}`, { method: 'DELETE', token: learner.token });
  check('owner removes the file while pending', deleteMine.status === 200, `${deleteMine.status} ${deleteMine.data.error}`);

  const second = await upload(`/accreditation/${appId}/documents`, learner.token, { name: 'deans-list.png' });
  check('file re-attaches after removal', second.status === 201, `${second.status} ${second.data.error}`);
  const keptIds = [second.data.document?.id];

  for (let i = 1; i <= 4; i += 1) {
    const extra = await upload(`/accreditation/${appId}/documents`, learner.token, { name: `proof-${i}.png` });
    check(`file ${i + 1} of 5 attaches`, extra.status === 201, `${extra.status} ${extra.data.error}`);
    keptIds.push(extra.data.document?.id);
  }
  const sixth = await upload(`/accreditation/${appId}/documents`, learner.token, { name: 'proof-6.png' });
  check('sixth file rejected by the cap', sixth.status === 409, `${sixth.status} ${sixth.data.error}`);

  const removedExtra = await request(`/accreditation/documents/${keptIds[1]}`, { method: 'DELETE', token: learner.token });
  check('owner can withdraw one of five', removedExtra.status === 200, `${removedExtra.status} ${removedExtra.data.error}`);

  const mine1 = (await request('/accreditation/mine', { token: learner.token })).data.application;
  check('mine reports the file count', mine1.document_count === 4, `got ${mine1.document_count}`);

  const approved = await request(`/accreditation/${appId}/approve`, { method: 'POST', token: sa.token });
  check('approve succeeds with files', approved.status === 200 && approved.data.approved === true, `${approved.status} ${approved.data.error}`);

  const double = await request(`/accreditation/${appId}/approve`, { method: 'POST', token: sa.token });
  check('double approve rejected', double.status === 409, `${double.status}`);

  const lateUpload = await upload(`/accreditation/${appId}/documents`, learner.token, { name: 'late.png' });
  check('upload blocked after approval', lateUpload.status === 409, `${lateUpload.status} ${lateUpload.data.error}`);

  const lateDelete = await request(`/accreditation/documents/${keptIds[0]}`, { method: 'DELETE', token: learner.token });
  check('files locked after approval', lateDelete.status === 409, `${lateDelete.status} ${lateDelete.data.error}`);

  const userRow = (await psql.query('SELECT is_verified, certified_by_id IS NOT NULL AS has_certifier, role FROM users WHERE email = $1', [learner.user.email])).rows[0];
  check('user is verified with a certifier', userRow?.is_verified === true && userRow?.has_certifier === true, JSON.stringify(userRow));
})().catch((e) => {
  failures += 1;
  console.error('e2e crashed:', e);
}).finally(async () => {
  await psql.end();
  if (failures) {
    console.log(`\n${failures} accreditation check(s) failed.`);
    process.exitCode = 1;
  } else {
    console.log('\nAll accreditation checks passed.');
  }
});
