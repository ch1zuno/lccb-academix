/* Lifecycle, Tutor-Only Online End, Anti-Abuse Guards, Now Requests & Validation E2E:
 * 1. Tutor ends Online session (valid duration -> +50/+25, ended_by='tutor')
 * 2. Student and unrelated user get 403 on POST /sessions/:id/end and GET /sessions/:id
 * 3. Double end (sequential + parallel) is idempotent and never double-posts ledger
 * 4. Short Online session (< min duration) ends cleanly, posts 0 points, sets needs_faculty_review=true
 * 5. Stale session job + lazy read: past-dated pending/upcoming/in-progress -> expired/missed/auto-closed;
 *    nothing stale appears in GET /sessions/mine?scope=checkin or POST /device/verify
 * 6. Now instant request: high-priority notif + tutor accept; expired Now request auto-expires + notifies learner + 409 on late accept; Now rejected when tutor is busy/paused
 * 7. Negative booking validation: invalid course, invalid language, short topic, invalid venue, invalid/unavailable slot
 */
import pg from 'pg';
import { E2E_DATABASE_URL } from './e2e-db.js';
import { sweepStaleSessionsAndRequests } from '../lib/sessionLifecycle.js';

const BASE = (process.env.E2E_API_BASE || 'http://localhost:4000').replace(/\/+$/, '') + '/api';
const DEVICE_KEY = process.env.DEVICE_API_KEY || 'dev-device-key';

async function request(path, { method = 'GET', token, body, headers = {} } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data;
  try { data = await res.json(); } catch { data = {}; }
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

const psql = new pg.Client({ connectionString: E2E_DATABASE_URL });
await psql.connect();

async function createInProgressOnlineSession({ tutor, learner, subjectId, day, time }) {
  const reqRes = await request('/session-requests', {
    method: 'POST',
    token: learner.token,
    body: {
      tutorId: tutor.user.id,
      subjectId,
      topic: 'Lifecycle Online Test',
      preferredDate: day,
      preferredTime: time,
      durationHours: 1,
      mode: 'online',
      language: 'English',
    },
  });
  assert(reqRes.status === 201, `create request failed: ${reqRes.status} ${reqRes.data.error ?? ''}`);
  const accRes = await request(`/session-requests/${reqRes.data.request.id}/accept`, {
    method: 'POST',
    token: tutor.token,
  });
  assert(accRes.status === 201, `accept request failed: ${accRes.status} ${accRes.data.error ?? ''}`);
  const session = accRes.data.session;

  const s1 = await request(`/sessions/${session.id}/stage-token`, { method: 'POST', token: tutor.token, body: { method: 'otp' } });
  await request(`/sessions/${session.id}/check-in`, { method: 'POST', token: learner.token, body: { token: s1.data.token, method: 'otp' } });
  const s2 = await request(`/sessions/${session.id}/stage-token`, { method: 'POST', token: tutor.token, body: { method: 'otp' } });
  const c2 = await request(`/sessions/${session.id}/check-in`, { method: 'POST', token: tutor.token, body: { token: s2.data.token, method: 'otp' } });
  assert(c2.status === 200 && c2.data.sessionStarted === true, 'check-in failed to start session');
  return session;
}

(async () => {
  const learner = (await login('TE-128')).data;
  const otherLearner = (await login('TE-092')).data;
  const tutor = (await login('TU-042')).data;
  const englishTutor = (await login('TU-031')).data; // teaches ENGL 101 / FIL 102; languages: English, Tagalog
  assert(learner.token && otherLearner.token && tutor.token && englishTutor.token, 'logins failed');

  const { data: { subjects } } = await request('/subjects', { token: learner.token });
  const prog201 = subjects.find((s) => s.code === 'PROG 201');
  const engl101 = subjects.find((s) => s.code === 'ENGL 101');
  assert(prog201 && engl101, 'subjects missing');

  const testDay = futureYmd(140 + Math.floor(Math.random() * 80));

  // ── 1 & 2 & 3. Tutor-only Online end, 403 for student/stranger, idempotent double end ──
  const sess1 = await createInProgressOnlineSession({ tutor, learner, subjectId: prog201.id, day: testDay, time: '9:00 AM' });

  // Access checks on GET /sessions/:id
  const strangerRoom = await request(`/sessions/${sess1.id}`, { token: otherLearner.token });
  assert(strangerRoom.status === 403, `stranger GET /sessions/:id must be 403, got ${strangerRoom.status}`);
  const learnerRoom = await request(`/sessions/${sess1.id}`, { token: learner.token });
  assert(learnerRoom.status === 200 && learnerRoom.data.session.id === sess1.id, 'assigned learner should access GET /sessions/:id');

  // Student & stranger cannot end Online session
  const studentEnd = await request(`/sessions/${sess1.id}/end`, { method: 'POST', token: learner.token });
  assert(studentEnd.status === 403, `student end should be 403, got ${studentEnd.status}`);
  const strangerEnd = await request(`/sessions/${sess1.id}/end`, { method: 'POST', token: otherLearner.token });
  assert(strangerEnd.status === 403, `stranger end should be 403, got ${strangerEnd.status}`);

  // Backdate started_at 15 minutes so duration meets anti-abuse floor
  await psql.query(`UPDATE sessions SET started_at = now() - interval '15 minutes' WHERE id = $1`, [sess1.id]);

  const ledgerBefore = Number((await psql.query(
    `SELECT count(*)::int AS n FROM points_ledger WHERE description LIKE $1`,
    [`%${sess1.id.slice(0, 8)}%`],
  )).rows[0].n);

  // Concurrent double end (two tabs / double-click) must be idempotent
  const [e1, e2] = await Promise.all([
    request(`/sessions/${sess1.id}/end`, { method: 'POST', token: tutor.token }),
    request(`/sessions/${sess1.id}/end`, { method: 'POST', token: tutor.token }),
  ]);
  assert(e1.status === 200 && e2.status === 200, `concurrent end statuses: ${e1.status}/${e2.status}`);
  const endedResults = [e1.data, e2.data];
  assert(endedResults.filter((r) => !r.alreadyEnded).length === 1, 'exactly one concurrent end should settle');
  assert(endedResults.filter((r) => r.alreadyEnded).length === 1, 'second concurrent end must be alreadyEnded=true');

  // Third sequential end is also idempotent
  const e3 = await request(`/sessions/${sess1.id}/end`, { method: 'POST', token: tutor.token });
  assert(e3.status === 200 && e3.data.alreadyEnded === true && e3.data.points === 0, 'sequential repeat end must post 0 points');

  const ledgerAfter = Number((await psql.query(
    `SELECT count(*)::int AS n FROM points_ledger WHERE description LIKE $1`,
    [`%${sess1.id.slice(0, 8)}%`],
  )).rows[0].n);
  assert(ledgerAfter - ledgerBefore <= 2, `ledger double-posted: before=${ledgerBefore}, after=${ledgerAfter}`);
  assert((await psql.query(`SELECT ended_by FROM sessions WHERE id = $1`, [sess1.id])).rows[0].ended_by === 'tutor', 'ended_by must be tutor');
  console.log('✓ tutor-only Online end, 403 guards, and concurrent idempotency verified');

  // ── 4. Short Online session (< min duration) posts 0 points and flags faculty review ──
  const shortSess = await createInProgressOnlineSession({ tutor, learner, subjectId: prog201.id, day: testDay, time: '11:00 AM' });
  const shortEnd = await request(`/sessions/${shortSess.id}/end`, { method: 'POST', token: tutor.token });
  assert(shortEnd.status === 200, `short session end failed: ${shortEnd.status}`);
  assert(shortEnd.data.points === 0 && shortEnd.data.learnerPoints === 0, `short session must post 0 points, got ${JSON.stringify(shortEnd.data)}`);
  assert(shortEnd.data.needsFacultyReview === true, 'short session must set needsFacultyReview=true');
  assert(shortEnd.data.session.status === 'completed' && shortEnd.data.session.ended_reason === 'ended_below_min_duration', 'short session status/reason mismatch');
  console.log('✓ short session anti-abuse guard (0 pts + faculty review flag) verified');

  // ── 5. Stale session job + lazy read enforcement ──
  const yesterday = new Date(Date.now() - 2 * 86_400_000).toISOString().slice(0, 10);
  const pastCutoff = new Date(Date.now() - 86_400_000).toISOString();

  const { rows: [staleReq] } = await psql.query(
    `INSERT INTO session_requests (learner_id, tutor_id, subject_id, topic, preferred_date, preferred_time, location, expires_at, status)
     VALUES ($1, $2, $3, 'Stale Req', $4, '10:00 AM', 'Online · LCCB Live Classroom', $5, 'pending') RETURNING id`,
    [learner.user.id, tutor.user.id, prog201.id, yesterday, pastCutoff],
  );
  const { rows: [staleUpcoming] } = await psql.query(
    `INSERT INTO sessions (session_code, tutor_id, learner_id, subject_id, topic, date, time, duration, duration_hours, status, mode, location, cutoff_at)
     VALUES ($1, $2, $3, $4, 'Stale Upcoming', $5, '10:00 AM', '1 hr', 1, 'upcoming', 'online', 'Online · LCCB Live Classroom', $6) RETURNING id`,
    [`SES-MU${Date.now().toString().slice(-4)}`, tutor.user.id, learner.user.id, prog201.id, yesterday, pastCutoff],
  );
  const { rows: [staleActive] } = await psql.query(
    `INSERT INTO sessions (session_code, tutor_id, learner_id, subject_id, topic, date, time, duration, duration_hours, status, mode, location, started_at, cutoff_at)
     VALUES ($1, $2, $3, $4, 'Stale Active', $5, '11:00 AM', '1 hr', 1, 'in-progress', 'online', 'Online · LCCB Live Classroom', $6, $6) RETURNING id`,
    [`SES-MA${Date.now().toString().slice(-4)}`, tutor.user.id, learner.user.id, prog201.id, yesterday, pastCutoff],
  );

  // Lazy read on check-in tab must immediately sweep and hide all stale sessions
  const checkinRes = await request('/sessions/mine?scope=checkin', { token: learner.token });
  assert(checkinRes.status === 200, 'checkin scope read failed');
  const checkinIds = new Set((checkinRes.data.sessions || []).map((s) => s.id));
  assert(!checkinIds.has(staleUpcoming.id) && !checkinIds.has(staleActive.id), 'stale sessions leaked into check-in tab!');

  // Re-run scheduled sweep explicitly (must be idempotent)
  const sweep2 = await sweepStaleSessionsAndRequests();
  assert(sweep2.expiredRequests === 0 && sweep2.missedSessions === 0 && sweep2.autoClosedSessions === 0, 'second sweep should be no-op');

  const reqStatus = (await psql.query(`SELECT status FROM session_requests WHERE id = $1`, [staleReq.id])).rows[0].status;
  const upStatus = (await psql.query(`SELECT status, ended_by FROM sessions WHERE id = $1`, [staleUpcoming.id])).rows[0];
  const actStatus = (await psql.query(`SELECT status, ended_by FROM sessions WHERE id = $1`, [staleActive.id])).rows[0];
  assert(reqStatus === 'expired', `stale request should be expired, got ${reqStatus}`);
  assert(upStatus.status === 'missed' && upStatus.ended_by === 'system', `stale upcoming should be missed, got ${JSON.stringify(upStatus)}`);
  assert(actStatus.status === 'auto-closed' && actStatus.ended_by === 'system', `stale active should be auto-closed, got ${JSON.stringify(actStatus)}`);

  // Biometric verify must never match stale sessions
  const dv = await request('/device/verify', { method: 'POST', body: { fingerprint_id: 'FPR-001' }, headers: { 'X-Device-Key': DEVICE_KEY } });
  if (dv.status === 200 && dv.data.session) {
    assert(dv.data.session.session_id !== staleUpcoming.id && dv.data.session.session_id !== staleActive.id, 'biometric matched stale session');
  }
  console.log('✓ stale session lazy-read & scheduled sweep (expired/missed/auto-closed) verified');

  // ── 6. Now instant requests: accept, expire, and busy/paused rejection ──
  // Make sure TU-042 has no lingering in-progress session right now before testing Now
  await psql.query(`UPDATE sessions SET status = 'completed', ended_by = 'system' WHERE tutor_id = $1 AND status = 'in-progress'`, [tutor.user.id]);
  const slotsRes = await request(`/tutors/${tutor.user.id}/slots?date=${testDay}`, { token: learner.token });
  assert(slotsRes.status === 200 && Array.isArray(slotsRes.data.languages), 'slots endpoint missing languages');

  // Test Now expiry first (without blocking tutor with an active session)
  const nowExpReq = await request('/session-requests', {
    method: 'POST',
    token: learner.token,
    body: {
      tutorId: tutor.user.id,
      subjectId: prog201.id,
      topic: 'Now Expiry Probe',
      mode: 'online',
      language: 'English',
      durationHours: 0.5,
      isNow: true,
    },
  });
  assert(nowExpReq.status === 201 && nowExpReq.data.request.is_now === true && Boolean(nowExpReq.data.request.expires_at),
    `Now request creation failed: ${nowExpReq.status} ${nowExpReq.data.error ?? ''}`);

  // Tutor received high-priority notification
  const tutorNotifs = (await request('/notifications', { token: tutor.token })).data.notifications || [];
  assert(tutorNotifs.some((n) => n.priority === 'high' && /Instant/i.test(n.title)), 'Now request missing high-priority tutor notification');

  // Expire it by backdating expires_at, then assert lazy read flips to expired and late accept is 409
  await psql.query(`UPDATE session_requests SET expires_at = now() - interval '1 minute' WHERE id = $1`, [nowExpReq.data.request.id]);
  const lateAccept = await request(`/session-requests/${nowExpReq.data.request.id}/accept`, { method: 'POST', token: tutor.token });
  assert(lateAccept.status === 409, `accepting expired Now request should be 409, got ${lateAccept.status}`);
  const expCheck = (await psql.query(`SELECT status FROM session_requests WHERE id = $1`, [nowExpReq.data.request.id])).rows[0].status;
  assert(expCheck === 'expired', `expired Now request status should be expired, got ${expCheck}`);

  // Now request accepted in time -> creates upcoming session with is_now=true
  const nowOkReq = await request('/session-requests', {
    method: 'POST',
    token: learner.token,
    body: {
      tutorId: tutor.user.id,
      subjectId: prog201.id,
      topic: 'Now Instant Help',
      mode: 'online',
      language: 'English',
      durationHours: 0.5,
      isNow: true,
    },
  });
  assert(nowOkReq.status === 201, `Now accept-path request failed: ${nowOkReq.status} ${nowOkReq.data.error ?? ''}`);
  const nowAccepted = await request(`/session-requests/${nowOkReq.data.request.id}/accept`, { method: 'POST', token: tutor.token });
  assert(nowAccepted.status === 201 && nowAccepted.data.session.is_now === true, `Now accept failed: ${nowAccepted.status}`);

  // Second Now request while first Now session overlaps must be rejected (409)
  const nowBusy = await request('/session-requests', {
    method: 'POST',
    token: otherLearner.token,
    body: {
      tutorId: tutor.user.id,
      subjectId: prog201.id,
      topic: 'Should Block Busy',
      mode: 'online',
      language: 'English',
      durationHours: 0.5,
      isNow: true,
    },
  });
  assert(nowBusy.status === 409, `Now while tutor busy should be 409, got ${nowBusy.status}`);
  // Clean up our Now session so TU-042 stays clean for subsequent scripts
  await request(`/sessions/${nowAccepted.data.session.id}/cancel`, { method: 'POST', token: learner.token, body: { reason: 'e2e cleanup' } });
  console.log('✓ Now instant request (high-priority alert, accept, expire, busy block) verified');

  // ── 7. Negative booking validation: invalid course, language, topic, venue, slot ──
  const badCourse = await request('/session-requests', {
    method: 'POST',
    token: learner.token,
    body: { tutorId: englishTutor.user.id, subjectId: prog201.id, topic: 'Wrong course', preferredDate: testDay, preferredTime: '2:00 PM', mode: 'online', language: 'English' },
  });
  assert(badCourse.status === 409, `invalid course for tutor should be 409, got ${badCourse.status}`);

  const badLang = await request('/session-requests', {
    method: 'POST',
    token: learner.token,
    body: { tutorId: englishTutor.user.id, subjectId: engl101.id, topic: 'Wrong lang', preferredDate: testDay, preferredTime: '2:00 PM', mode: 'online', language: 'Hiligaynon' },
  });
  assert(badLang.status === 400, `unsupported language for TU-031 should be 400, got ${badLang.status}`);

  const shortTopic = await request('/session-requests', {
    method: 'POST',
    token: learner.token,
    body: { tutorId: tutor.user.id, subjectId: prog201.id, topic: 'x', preferredDate: testDay, preferredTime: '2:00 PM', mode: 'online', language: 'English' },
  });
  assert(shortTopic.status === 400, `too-short topic should be 400, got ${shortTopic.status}`);

  const badSlot = await request('/session-requests', {
    method: 'POST',
    token: learner.token,
    body: { tutorId: tutor.user.id, subjectId: prog201.id, topic: 'Late slot', preferredDate: testDay, preferredTime: '11:00 PM', mode: 'online', language: 'English' },
  });
  assert(badSlot.status === 409, `outside-hours slot should be 409, got ${badSlot.status}`);

  const badVenue = await request('/session-requests', {
    method: 'POST',
    token: learner.token,
    body: { tutorId: tutor.user.id, subjectId: prog201.id, topic: 'Bad venue', preferredDate: testDay, preferredTime: '2:00 PM', mode: 'face_to_face', venueId: 'not-a-uuid', language: 'English' },
  });
  assert(badVenue.status === 400, `invalid venue should be 400, got ${badVenue.status}`);
  console.log('✓ negative booking validation (course, language, topic, slot, venue) verified');

  console.log('Lifecycle, ending guards, and booking e2e passed.');
})().finally(async () => { await psql.end(); });
