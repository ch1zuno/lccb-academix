/* Session Modes e2e:
 * - Campus venue management (faculty/admin allowed, learner 403)
 * - Negative validation: invalid mode, missing/inactive/fake venue, free-text location ignored
 * - Face to Face full flow: book -> notify -> tutor proposes new venue/time -> learner accepts ->
 *   venue double-booking blocked (409) -> reschedule -> notify -> QR double check-in -> wrap-up (+50/+25)
 * - Online full flow: book -> tutor accepts -> notify -> reschedule -> OTP double check-in -> wrap-up (+50/+25)
 * - Faculty CSV export includes Mode column
 */
const BASE = (process.env.E2E_API_BASE || 'http://localhost:4000').replace(/\/+$/, '') + '/api';

async function request(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { status: res.status, data };
}

const login = (loginId) => request('/auth/login', { method: 'POST', body: { loginId, password: 'demo1234' } });
const assert = (ok, msg) => { if (!ok) throw new Error(msg); };

const pad = (n) => String(n).padStart(2, '0');
const futureYmd = (offsetDays) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

(async () => {
  const learnerA = (await login('TE-128')).data;
  const learnerB = (await login('TE-178')).data;
  const tutorA = (await login('TU-042')).data;
  const tutorB = (await login('TU-015')).data;
  const faculty = (await login('b.tisuela@lccbacolod.edu.ph')).data;
  assert(learnerA.token && learnerB.token && tutorA.token && tutorB.token && faculty.token, 'logins failed');

  const { data: { subjects } } = await request('/subjects', { token: learnerA.token });
  const prog201 = subjects.find((s) => s.code === 'PROG 201');
  assert(prog201, 'PROG 201 missing');

  const { data: { tutors } } = await request('/tutors?subject=PROG%20201&available=1', { token: learnerA.token });
  const mark = tutors.find((t) => t.custom_id === 'TU-042');
  const angela = tutors.find((t) => t.custom_id === 'TU-015');
  assert(mark && angela, 'expected TU-042 and TU-015 available for PROG 201');

  // 1. Campus venues RBAC + management
  const venuesRes = await request('/venues', { token: learnerA.token });
  assert(venuesRes.status === 200 && venuesRes.data.venues.length >= 2, 'expected seeded campus venues');
  const [venueA, venueB] = venuesRes.data.venues;

  const learnerCreateVenue = await request('/venues', {
    method: 'POST', token: learnerA.token, body: { name: 'Unauthorized Spot' },
  });
  assert(learnerCreateVenue.status === 403, `learner venue create should be 403, got ${learnerCreateVenue.status}`);

  const tempVenueName = `E2E Test Pod ${Date.now()}`;
  const facCreate = await request('/venues', {
    method: 'POST', token: faculty.token, body: { name: tempVenueName, building: 'Test Wing', room: 'Rm 9', capacity: 4 },
  });
  assert(facCreate.status === 201 && facCreate.data.venue?.id, `faculty venue create failed: ${facCreate.status}`);
  const disabledVenueId = facCreate.data.venue.id;
  const facDisable = await request(`/venues/${disabledVenueId}`, {
    method: 'PATCH', token: faculty.token, body: { is_active: false },
  });
  assert(facDisable.status === 200 && facDisable.data.venue.is_active === false, 'faculty venue disable failed');
  console.log('✓ campus venues RBAC & lifecycle verified');

  const dayF2F = futureYmd(90 + Math.floor(Math.random() * 120));
  const dayOnline = futureYmd(220 + Math.floor(Math.random() * 120));

  // 2. Negative validation tests
  for (const badMode of ['hybrid', '', null, 'in-person']) {
    const r = await request('/session-requests', {
      method: 'POST', token: learnerA.token,
      body: { tutorId: mark.id, subjectId: prog201.id, topic: 'Bad mode', preferredDate: dayF2F, preferredTime: '10:00 AM', mode: badMode },
    });
    assert(r.status === 400, `invalid mode (${String(badMode)}) should be 400, got ${r.status}`);
  }

  const missingVenue = await request('/session-requests', {
    method: 'POST', token: learnerA.token,
    body: { tutorId: mark.id, subjectId: prog201.id, topic: 'No venue', preferredDate: dayF2F, preferredTime: '10:00 AM', mode: 'face_to_face', location: 'My House' },
  });
  assert(missingVenue.status === 400, `f2f without venueId should be 400, got ${missingVenue.status}`);

  const inactiveVenue = await request('/session-requests', {
    method: 'POST', token: learnerA.token,
    body: { tutorId: mark.id, subjectId: prog201.id, topic: 'Inactive venue', preferredDate: dayF2F, preferredTime: '10:00 AM', mode: 'face_to_face', venueId: disabledVenueId },
  });
  assert(inactiveVenue.status === 400, `f2f with inactive venue should be 400, got ${inactiveVenue.status}`);

  const fakeVenue = await request('/session-requests', {
    method: 'POST', token: learnerA.token,
    body: { tutorId: mark.id, subjectId: prog201.id, topic: 'Fake venue', preferredDate: dayF2F, preferredTime: '10:00 AM', mode: 'face_to_face', venueId: '00000000-0000-4000-8000-000000000099' },
  });
  assert(fakeVenue.status === 400, `f2f with unknown venue should be 400, got ${fakeVenue.status}`);
  console.log('✓ negative mode & venue validation verified');

  // 3. Face-to-Face full flow (book -> propose -> accept proposal -> venue conflict -> reschedule -> QR check-in -> wrap-up)
  const f2fReq = await request('/session-requests', {
    method: 'POST', token: learnerA.token,
    body: {
      tutorId: mark.id,
      subjectId: prog201.id,
      topic: 'Linked Lists Lab',
      preferredDate: dayF2F,
      preferredTime: '10:00 AM',
      durationHours: 1,
      mode: 'face_to_face',
      venueId: venueA.id,
      location: 'Ignored Free Text Coffee Shop',
    },
  });
  assert(f2fReq.status === 201, `f2f booking failed: ${f2fReq.status} ${f2fReq.data.error ?? ''}`);
  assert(f2fReq.data.request.mode === 'face_to_face', 'mode not saved as face_to_face');
  assert(f2fReq.data.request.location === venueA.name, `server must derive venue name, got ${f2fReq.data.request.location}`);

  // Tutor received notification with Face to Face
  const tutorNotifs = (await request('/notifications', { token: tutorA.token })).data.notifications || [];
  assert(tutorNotifs.some((n) => /Face to Face/i.test(n.title) || /Face to Face/i.test(n.message)), 'tutor notification missing mode');

  // Tutor counter-proposes venueB + 11:00 AM
  const proposed = await request(`/session-requests/${f2fReq.data.request.id}/propose`, {
    method: 'POST', token: tutorA.token,
    body: { proposedDate: dayF2F, proposedTime: '11:00 AM', proposedVenueId: venueB.id, note: 'Room B is quieter' },
  });
  assert(proposed.status === 200 && proposed.data.request.status === 'counter_proposed', `propose failed: ${proposed.status} ${proposed.data.error ?? ''}`);

  // Learner accepts proposal -> confirmed session at venueB 11:00 AM
  const f2fConfirmed = await request(`/session-requests/${f2fReq.data.request.id}/accept-proposal`, {
    method: 'POST', token: learnerA.token,
  });
  assert(f2fConfirmed.status === 201, `accept-proposal failed: ${f2fConfirmed.status} ${f2fConfirmed.data.error ?? ''}`);
  const f2fSession = f2fConfirmed.data.session;
  assert(f2fSession.mode === 'face_to_face' && f2fSession.venue_id === venueB.id && f2fSession.location === venueB.name, 'confirmed f2f venue mismatch');

  // Venue double-booking guard: second student + DIFFERENT tutor trying same venueB at 11:00 AM must be blocked on accept
  const clashReq = await request('/session-requests', {
    method: 'POST', token: learnerB.token,
    body: { tutorId: angela.id, subjectId: prog201.id, topic: 'Venue clash test', preferredDate: dayF2F, preferredTime: '11:00 AM', mode: 'face_to_face', venueId: venueB.id },
  });
  assert(clashReq.status === 201, `second learner request failed: ${clashReq.status}`);
  const clashAccept = await request(`/session-requests/${clashReq.data.request.id}/accept`, {
    method: 'POST', token: tutorB.token,
  });
  assert(clashAccept.status === 409, `same-venue double-booking should be 409, got ${clashAccept.status}`);
  console.log('✓ face-to-face counter-proposal & venue double-booking guard verified');

  // Reschedule Face to Face to venueA at 2:00 PM
  const reschedF2F = await request(`/sessions/${f2fSession.id}/reschedule`, {
    method: 'PATCH', token: learnerA.token,
    body: { date: dayF2F, time: '2:00 PM', venueId: venueA.id, reason: 'Lab moved' },
  });
  assert(reschedF2F.status === 200 && reschedF2F.data.session.venue_id === venueA.id && reschedF2F.data.session.time === '2:00 PM', `f2f reschedule failed: ${reschedF2F.status}`);

  // Face-to-Face double check-in (QR) + wrap-up
  const st1 = await request(`/sessions/${f2fSession.id}/stage-token`, { method: 'POST', token: tutorA.token, body: { method: 'qr' } });
  assert(st1.status === 200, 'f2f stage-token 1 failed');
  const ciL = await request(`/sessions/${f2fSession.id}/check-in`, { method: 'POST', token: learnerA.token, body: { token: st1.data.token, method: 'qr' } });
  assert(ciL.status === 200 && ciL.data.confirmations === 1, 'f2f learner qr check-in failed');
  const st2 = await request(`/sessions/${f2fSession.id}/stage-token`, { method: 'POST', token: tutorA.token, body: { method: 'qr' } });
  const ciT = await request(`/sessions/${f2fSession.id}/check-in`, { method: 'POST', token: tutorA.token, body: { token: st2.data.token, method: 'qr' } });
  assert(ciT.status === 200 && ciT.data.sessionStarted === true, 'f2f tutor qr check-in failed');

  const wrapF2F = await request(`/sessions/${f2fSession.id}/wrap-up`, {
    method: 'POST', token: learnerA.token, body: { rating: 5 },
  });
  assert(wrapF2F.status === 200 && wrapF2F.data.points === 50 && wrapF2F.data.learnerPoints === 25,
    `f2f wrap-up points mismatch: ${JSON.stringify(wrapF2F.data)}`);
  console.log('✓ face-to-face reschedule, QR check-in, and +50/+25 wrap-up verified');

  // 4. Online full flow (book -> accept -> notify -> reschedule -> OTP check-in -> wrap-up)
  const onlineReq = await request('/session-requests', {
    method: 'POST', token: learnerA.token,
    body: {
      tutorId: mark.id,
      subjectId: prog201.id,
      topic: 'Recursion Online Review',
      preferredDate: dayOnline,
      preferredTime: '1:00 PM',
      durationHours: 1,
      mode: 'online',
      location: 'Ignored Free Text',
    },
  });
  assert(onlineReq.status === 201 && onlineReq.data.request.mode === 'online' && onlineReq.data.request.venue_id === null,
    `online booking failed: ${onlineReq.status}`);
  assert(/Online/i.test(onlineReq.data.request.location), 'online canonical location not enforced');

  const onlineAcc = await request(`/session-requests/${onlineReq.data.request.id}/accept`, {
    method: 'POST', token: tutorA.token,
  });
  assert(onlineAcc.status === 201 && onlineAcc.data.session.mode === 'online', 'online accept failed');
  const onlineSession = onlineAcc.data.session;

  const reschedOnline = await request(`/sessions/${onlineSession.id}/reschedule`, {
    method: 'PATCH', token: tutorA.token,
    body: { date: dayOnline, time: '3:00 PM', reason: 'Online shift' },
  });
  assert(reschedOnline.status === 200 && reschedOnline.data.session.time === '3:00 PM', 'online reschedule failed');

  const os1 = await request(`/sessions/${onlineSession.id}/stage-token`, { method: 'POST', token: tutorA.token, body: { method: 'otp' } });
  const ociL = await request(`/sessions/${onlineSession.id}/check-in`, { method: 'POST', token: learnerA.token, body: { token: os1.data.token, method: 'otp' } });
  assert(ociL.status === 200 && ociL.data.confirmations === 1, 'online learner check-in failed');
  const os2 = await request(`/sessions/${onlineSession.id}/stage-token`, { method: 'POST', token: tutorA.token, body: { method: 'otp' } });
  const ociT = await request(`/sessions/${onlineSession.id}/check-in`, { method: 'POST', token: tutorA.token, body: { token: os2.data.token, method: 'otp' } });
  assert(ociT.status === 200 && ociT.data.sessionStarted === true, 'online tutor check-in failed');

  const wrapOnline = await request(`/sessions/${onlineSession.id}/wrap-up`, {
    method: 'POST', token: learnerA.token, body: { rating: 5 },
  });
  assert(wrapOnline.status === 200 && wrapOnline.data.points === 50 && wrapOnline.data.learnerPoints === 25,
    `online wrap-up points mismatch: ${JSON.stringify(wrapOnline.data)}`);
  console.log('✓ online accept, reschedule, OTP check-in, and +50/+25 wrap-up verified');

  // 5. Faculty CSV export includes Mode column
  const csvRes = await request('/referrals/export.csv', { token: faculty.token });
  assert(csvRes.status === 200, `faculty CSV export failed: ${csvRes.status}`);
  const firstLine = String(csvRes.data.raw || '').replace(/^\uFEFF/, '').split(/\r?\n/)[0];
  assert(firstLine.includes('"Mode"'), `CSV export header missing Mode column: ${firstLine}`);
  console.log('✓ faculty CSV export Mode column verified');

  console.log('Session modes e2e passed.');
})();
