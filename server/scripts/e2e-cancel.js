/* Cancel e2e: tutor availability toggle → learner withdraws a pending request →
 * tutor accepts a live request → learner cancels the resulting session. */
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
later.setDate(later.getDate() + 40 + Math.floor(Math.random() * 300));
const pad = (n) => String(n).padStart(2, '0');
const preferredDate = `${later.getFullYear()}-${pad(later.getMonth() + 1)}-${pad(later.getDate())}`;

function check(condition, message) {
  if (!condition) throw new Error(message);
}

(async () => {
  const learner = (await login('TE-128')).data;
  const tutor = (await login('TU-042')).data;
  check(learner?.token && tutor?.token, 'demo logins failed');

  const { data: { subjects } } = await request('/subjects', { token: learner.token });
  const subject = subjects.find((s) => s.code === 'PROG 201');
  check(subject, 'PROG 201 subject missing from seed');

  const { data: { tutors } } = await request('/tutors', { token: learner.token });
  const mark = tutors.find((t) => t.custom_id === 'TU-042');
  check(mark, 'TU-042 missing from tutor directory');

  // ── availability round-trip ───────────────────────────────────────────────
  const paused = await request('/tutors/me/availability', {
    method: 'PATCH', token: tutor.token, body: { available: false },
  });
  console.log('tutor pause ->', paused.status, paused.data.user?.is_available);
  check(paused.status === 200 && paused.data.user?.is_available === false, `pause failed: ${paused.status}`);

  const blocked = await request('/session-requests', {
    method: 'POST', token: learner.token,
    body: { tutorId: mark.id, subjectId: subject.id, topic: 'Paused tutor probe', preferredDate, preferredTime: '9:15 AM' },
  });
  console.log('request while paused ->', blocked.status, blocked.data.error);
  check(blocked.status === 409, `paused tutor should reject requests, got ${blocked.status}`);

  const learnerPatch = await request('/tutors/me/availability', {
    method: 'PATCH', token: learner.token, body: { available: true },
  });
  console.log('learner patch ->', learnerPatch.status);
  check(learnerPatch.status === 403, `learner should not toggle availability, got ${learnerPatch.status}`);

  const resumed = await request('/tutors/me/availability', {
    method: 'PATCH', token: tutor.token, body: { available: true },
  });
  console.log('tutor resume ->', resumed.status, resumed.data.user?.is_available);
  check(resumed.status === 200 && resumed.data.user?.is_available === true, `resume failed: ${resumed.status}`);

  // ── learner withdraws a pending request ───────────────────────────────────
  const created = await request('/session-requests', {
    method: 'POST', token: learner.token,
    body: { tutorId: mark.id, subjectId: subject.id, topic: 'Withdraw me', preferredDate, preferredTime: '9:15 AM' },
  });
  console.log('create request ->', created.status);
  check(created.status === 201, `request should be 201, got ${created.status} ${created.data.error ?? ''}`);
  const requestId = created.data.request.id;

  const withdrawn = await request(`/session-requests/${requestId}/cancel`, { method: 'POST', token: learner.token });
  console.log('learner withdraw ->', withdrawn.status, withdrawn.data.request?.status);
  check(withdrawn.status === 200 && withdrawn.data.request?.status === 'cancelled', `withdraw failed: ${withdrawn.status}`);

  const again = await request(`/session-requests/${requestId}/cancel`, { method: 'POST', token: learner.token });
  console.log('double withdraw ->', again.status, again.data.error);
  check(again.status === 409, `double withdraw should be 409, got ${again.status}`);

  const acceptCancelled = await request(`/session-requests/${requestId}/accept`, { method: 'POST', token: tutor.token });
  console.log('accept withdrawn ->', acceptCancelled.status, acceptCancelled.data.error);
  check(acceptCancelled.status === 409, `accepting a withdrawn request should be 409, got ${acceptCancelled.status}`);

  const pending = (await request('/session-requests', { token: learner.token })).data.requests;
  check(!pending.some((r) => r.id === requestId && r.status === 'pending'), 'withdrawn request still appears as pending');

  // ── accepted request → learner cancels the session ────────────────────────
  const live = await request('/session-requests', {
    method: 'POST', token: learner.token,
    body: { tutorId: mark.id, subjectId: subject.id, topic: 'Cancel the session', preferredDate, preferredTime: '10:30 AM' },
  });
  check(live.status === 201, `second request should be 201, got ${live.status}`);

  const accepted = await request(`/session-requests/${live.data.request.id}/accept`, { method: 'POST', token: tutor.token });
  console.log('tutor accept ->', accepted.status, accepted.data.session?.session_code);
  check(accepted.status === 201, `accept should be 201, got ${accepted.status} ${accepted.data.error ?? ''}`);

  const cancelled = await request(`/sessions/${accepted.data.session.id}/cancel`, {
    method: 'POST', token: learner.token, body: { reason: 'e2e cancel' },
  });
  console.log('learner cancel session ->', cancelled.status, cancelled.data.session?.status);
  check(cancelled.status === 200 && cancelled.data.session?.status === 'cancelled', `session cancel failed: ${cancelled.status}`);

  console.log('Cancel e2e passed.');
})();
