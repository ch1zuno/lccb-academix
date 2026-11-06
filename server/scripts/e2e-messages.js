/* Messaging e2e: booking gate → send → unread → read → reply → limits.
 * A conversation is only allowed between a learner and a tutor who share a
 * pending/accepted request or a session. */
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

function check(condition, message) {
  if (!condition) throw new Error(message);
}

const later = new Date();
later.setDate(later.getDate() + 50 + Math.floor(Math.random() * 300));
const pad = (n) => String(n).padStart(2, '0');
const preferredDate = `${later.getFullYear()}-${pad(later.getMonth() + 1)}-${pad(later.getDate())}`;

(async () => {
  const learner = (await login('TE-128')).data;
  const tutor = (await login('TU-042')).data;
  check(learner?.token && tutor?.token, 'demo logins failed');
  check(learner.user.role === 'learner' && tutor.user.role === 'tutor', 'unexpected demo roles');

  const { data: { subjects } } = await request('/subjects', { token: learner.token });
  const subject = subjects.find((s) => s.code === 'PROG 201');
  check(subject, 'PROG 201 subject missing from seed');

  const { data: { tutors } } = await request('/tutors', { token: learner.token });
  const mark = tutors.find((t) => t.custom_id === 'TU-042');
  const literacy = tutors.find((t) => t.custom_id === 'TU-031');
  check(mark && literacy, 'expected tutors missing from directory');

  // The pair needs a booking before chat unlocks.
  const booking = await request('/session-requests', {
    method: 'POST', token: learner.token,
    body: { tutorId: mark.id, subjectId: subject.id, topic: 'Messaging e2e', preferredDate, preferredTime: '11:45 AM' },
  });
  check(booking.status === 201, `booking should be 201, got ${booking.status} ${booking.data.error ?? ''}`);

  const inbox = (await request('/conversations', { token: learner.token })).data.conversations ?? [];
  const tutorThread = inbox.find((c) => c.other_id === tutor.user.id);
  console.log('learner inbox ->', inbox.length, 'thread with tutor:', Boolean(tutorThread));
  check(tutorThread, 'tutor did not appear in the learner inbox after booking');

  // Learner sends.
  const sent = await request(`/conversations/${tutor.user.id}/messages`, {
    method: 'POST', token: learner.token,
    body: { body: 'Hi Mark — I booked the 11:45 slot. Is the library okay?' },
  });
  console.log('learner send ->', sent.status);
  check(sent.status === 201, `send should be 201, got ${sent.status} ${sent.data.error ?? ''}`);
  check(sent.data.message.sender_id === learner.user.id, 'sender_id must come from the JWT');

  // Tutor sees an unread badge and the thread.
  const tutorInbox = (await request('/conversations', { token: tutor.token })).data.conversations ?? [];
  const learnerThread = tutorInbox.find((c) => c.other_id === learner.user.id);
  check(learnerThread, 'learner did not appear in the tutor inbox');
  check(learnerThread.unread >= 1, `tutor should have an unread message, got ${learnerThread.unread}`);
  check(learnerThread.last_body === sent.data.message.body, 'inbox last_body mismatch');

  const thread = (await request(`/conversations/${learner.user.id}/messages`, { token: tutor.token })).data.messages ?? [];
  check(thread.some((m) => m.id === sent.data.message.id), 'tutor thread is missing the message');

  // Mark read clears the pair's unread count.
  const read = await request(`/conversations/${learner.user.id}/read`, { method: 'POST', token: tutor.token });
  console.log('mark read ->', read.status, read.data.read);
  check(read.status === 200 && read.data.read >= 1, `mark-read should clear at least one message, got ${read.status}`);

  const tutorInboxAfter = (await request('/conversations', { token: tutor.token })).data.conversations ?? [];
  const afterRead = tutorInboxAfter.find((c) => c.other_id === learner.user.id);
  check(afterRead.unread === 0, `tutor unread should be 0, got ${afterRead?.unread}`);

  // Tutor replies; learner gets the latest message and a badge.
  const reply = await request(`/conversations/${learner.user.id}/messages`, {
    method: 'POST', token: tutor.token,
    body: { body: 'Library Study Room A works. See you then.' },
  });
  check(reply.status === 201, `reply should be 201, got ${reply.status}`);

  const learnerInbox = (await request('/conversations', { token: learner.token })).data.conversations ?? [];
  const learnerPair = learnerInbox.find((c) => c.other_id === tutor.user.id);
  check(learnerPair.unread >= 1, 'learner should have an unread reply');

  const latest = (await request(`/conversations/${tutor.user.id}/messages?limit=1`, { token: learner.token })).data.messages ?? [];
  check(latest.length === 1 && latest[0].body === reply.data.message.body, 'limit=1 should return only the newest message');

  // Validation and guards.
  const empty = await request(`/conversations/${tutor.user.id}/messages`, {
    method: 'POST', token: learner.token, body: { body: '   ' },
  });
  check(empty.status === 400, `empty message should be 400, got ${empty.status}`);

  const tooLong = await request(`/conversations/${tutor.user.id}/messages`, {
    method: 'POST', token: learner.token, body: { body: 'x'.repeat(1001) },
  });
  check(tooLong.status === 400, `over-long message should be 400, got ${tooLong.status}`);

  const self = await request(`/conversations/${learner.user.id}/messages`, {
    method: 'POST', token: learner.token, body: { body: 'hello me' },
  });
  check(self.status === 400, `self-message should be 400, got ${self.status}`);

  const noBooking = await request(`/conversations/${literacy.id}/messages`, {
    method: 'POST', token: learner.token, body: { body: 'No booking here' },
  });
  console.log('no-booking send ->', noBooking.status, noBooking.data.error);
  check(noBooking.status === 403, `unbooked tutor should be 403, got ${noBooking.status}`);

  const faculty = (await login('b.tisuela@lccbacolod.edu.ph')).data;
  const facultyInbox = await request('/conversations', { token: faculty.token });
  check(facultyInbox.status === 403, `faculty inbox should be 403, got ${facultyInbox.status}`);

  console.log('Messaging e2e passed.');
})();
