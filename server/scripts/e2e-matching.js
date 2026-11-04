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

const later = new Date();
// A far-future random day keeps reruns on a scratch database out of the same
// slot; the overlap probe below adds a controlled 30-minute collision.
later.setDate(later.getDate() + 30 + Math.floor(Math.random() * 300));
const pad = (n) => String(n).padStart(2, '0');
const preferredDate = `${later.getFullYear()}-${pad(later.getMonth() + 1)}-${pad(later.getDate())}`;
const preferredTime = '3:30 PM';

(async () => {
  const learner = (await login('TE-128')).data;
  const tutor = (await login('TU-042')).data;

  const { data: { subjects } } = await request('/subjects', { token: learner.token });
  const prog = subjects.find(s => s.code === 'PROG 201');

  const dir = (await request('/tutors', { token: learner.token, params: undefined })).status;
  console.log('GET /tutors ->', dir);

  const badReq = await request('/session-requests', {
    method: 'POST', token: learner.token,
    body: { tutorId: null, subjectId: prog.id, topic: 'Linked Lists', preferredDate, preferredTime },
  });
  console.log('request w/o tutor ->', badReq.status, badReq.data.error);
  if (badReq.status !== 400) throw new Error(`missing tutor should be 400, got ${badReq.status}`);

  // find TU-042's id + check their subject accreditation is PROG 201
  const { data: { tutors } } = await request('/tutors?subject=PROG%20201&available=1', { token: learner.token });
  console.log('filtered Directory rows:', tutors.length, '->', tutors.map(t => t.name).slice(0, 3));

  const mark = tutors.find(t => t.custom_id === 'TU-042');
  if (!mark) return console.log('Mark not in PROG 201 filter (unexpected)');

  const created = await request('/session-requests', {
    method: 'POST', token: learner.token,
    body: { tutorId: mark.id, subjectId: prog.id, topic: 'Linked Lists & Pointers', preferredDate, preferredTime, note: 'after-lab' },
  });
  console.log('created request ->', created.status, created.data);
  if (created.status !== 201) throw new Error(`request should be 201, got ${created.status} ${created.data.error ?? ''}`);

  // negative: tutor not accredited for the subject (tu-031 English tutor)
  const all = (await request('/tutors', { token: learner.token })).data.tutors;  const literacy = all.find(t => t.custom_id === 'TU-031');
  const conflict = await request('/session-requests', {
    method: 'POST', token: learner.token,
    body: { tutorId: literacy.id, subjectId: prog.id, topic: 'Linked lists', preferredDate, preferredTime },
  });
  console.log('unaccredited pairing ->', conflict.status, conflict.data.error);
  if (conflict.status !== 409) throw new Error(`unaccredited pairing should be 409, got ${conflict.status}`);

  // tutor accepts
  const teacher = (await login('TU-042')).data;
  const pending = (await request('/session-requests', { token: teacher.token })).data.requests;
  const mine = pending.find(r => r.id === created.data.request.id && r.status === 'pending');
  if (!mine) throw new Error('accept failed to find pending request');
  const accepted = await request(`/session-requests/${mine.id}/accept`, { method: 'POST', token: teacher.token });
  console.log('tutor accept ->', accepted.status, 'session:', accepted.data.session?.session_code);
  if (accepted.status !== 201) throw new Error(`accept should be 201, got ${accepted.status} ${accepted.data.error ?? ''}`);
  const double = await request(`/session-requests/${mine.id}/accept`, { method: 'POST', token: teacher.token });
  console.log('double accept ->', double.status, double.data.error);
  if (double.status !== 409) throw new Error(`double accept should be 409, got ${double.status}`);

  const shiftTime = (value, delta) => {
    const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(value);
    let hour = Number(m[1]) % 12 + (/PM/i.test(m[3]) ? 12 : 0);
    let total = (hour * 60 + Number(m[2]) + delta + 1440) % 1440;
    const h24 = Math.floor(total / 60);
    const suffix = h24 >= 12 ? 'PM' : 'AM';
    const h12 = h24 % 12 || 12;
    return `${h12}:${pad(total % 60)} ${suffix}`;
  };
  const overlapping = await request('/session-requests', {
    method: 'POST', token: learner.token,
    body: { tutorId: mark.id, subjectId: prog.id, topic: 'Overlap probe', preferredDate, preferredTime: shiftTime(preferredTime, 30) },
  });
  if (overlapping.status !== 201) throw new Error(`overlap request should be 201, got ${overlapping.status}`);
  const overlapAccept = await request(`/session-requests/${overlapping.data.request.id}/accept`, {
    method: 'POST', token: teacher.token,
  });
  console.log('overlapping accept ->', overlapAccept.status, overlapAccept.data.error);
  if (overlapAccept.status !== 409) throw new Error(`overlapping accept should be 409, got ${overlapAccept.status}`);

  console.log('Matching e2e passed.');
})();
