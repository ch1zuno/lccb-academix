/* Matching e2e: directory → request → tutor sees it → accept → session row. */
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

(async () => {
  const learner = (await login('TE-128')).data;
  const tutor = (await login('TU-042')).data;

  const { data: { subjects } } = await request('/subjects', { token: learner.token });
  const prog = subjects.find(s => s.code === 'PROG 201');

  const dir = (await request('/tutors', { token: learner.token, params: undefined })).status;
  console.log('GET /tutors ->', dir);

  const badReq = await request('/session-requests', {
    method: 'POST', token: learner.token,
    body: { tutorId: null, subjectId: prog.id, topic: 'Linked Lists', preferredDate: '2026-10-24', preferredTime: '3 PM' },
  });
  console.log('request w/o tutor ->', badReq.status, badReq.data.error);

  // find TU-042's id + check their subject accreditation is PROG 201
  const { data: { tutors } } = await request('/tutors?subject=PROG%20201&available=1', { token: learner.token });
  console.log('filtered Directory rows:', tutors.length, '->', tutors.map(t => t.name).slice(0, 3));

  const mark = tutors.find(t => t.custom_id === 'TU-042');
  if (!mark) return console.log('Mark not in PROG 201 filter (unexpected)');

  const created = await request('/session-requests', {
    method: 'POST', token: learner.token,
    body: { tutorId: mark.id, subjectId: prog.id, topic: 'Linked Lists & Pointers', preferredDate: '2026-10-24', preferredTime: '3:30 PM', note: 'after-lab' },
  });
  console.log('created request ->', created.status, created.data);

  // negative: tutor not accredited for the subject (tu-031 English tutor)
  const all = (await request('/tutors', { token: learner.token })).data.tutors;  const literacy = all.find(t => t.custom_id === 'TU-031');
  const conflict = await request('/session-requests', {
    method: 'POST', token: learner.token,
    body: { tutorId: literacy.id, subjectId: prog.id, topic: 'Linked lists', preferredDate: '2026-10-25', preferredTime: '2 PM' },
  });
  console.log('unaccredited pairing ->', conflict.status, conflict.data.error);

  // tutor accepts
  const teacher = (await login('TU-042')).data;
  const pending = (await request('/session-requests', { token: teacher.token })).data.requests;
  const mine = pending.find(r => r.id === created.data.request.id && r.status === 'pending');
  if (!mine) return console.log('accept failed to find pending request');
  const accepted = await request(`/session-requests/${mine.id}/accept`, { method: 'POST', token: teacher.token });
  console.log('tutor accept ->', accepted.status, 'session:', accepted.data.session?.session_code);
  const double = await request(`/session-requests/${mine.id}/accept`, { method: 'POST', token: teacher.token });
  console.log('double accept ->', double.status, double.data.error);
})();
