import assert from 'node:assert/strict';
import { app } from '../app.js';
import { query } from '../db.js';

let server;
let BASE;

async function request(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data;
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  return { status: res.status, data };
}

const login = (loginId) => request('/auth/login', { method: 'POST', body: { loginId, password: 'demo1234' } });

async function run() {
  console.log('Starting ephemeral test server...');
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      BASE = `http://127.0.0.1:${port}/api`;
      console.log(`Ephemeral API listening on ${BASE}\n`);
      resolve();
    });
  });

  try {
    console.log('Testing Demo Session Boot & Participant Search...\n');

    // 1. Log in demo participants
    const tutorRes = await login('TU-042');
    assert.equal(tutorRes.status, 200, 'Tutor login must succeed');
    const tutorToken = tutorRes.data.token;
    const tutorId = tutorRes.data.user.id;

    const learnerRes = await login('TE-128');
    assert.equal(learnerRes.status, 200, 'Learner login must succeed');
    const learnerToken = learnerRes.data.token;
    const learnerId = learnerRes.data.user.id;

    // Additional accounts to test invalid role pairings
    const secondLearnerRes = await login('TE-245');
    assert.equal(secondLearnerRes.status, 200, 'Second learner login must succeed');
    const secondLearnerId = secondLearnerRes.data.user.id;

    const secondTutorRes = await login('TU-038');
    assert.equal(secondTutorRes.status, 200, 'Second tutor login must succeed');
    const secondTutorId = secondTutorRes.data.user.id;

    console.log('✓ Demo accounts logged in successfully.');

    // 2. Test GET /sessions/demo-participants
    console.log('Testing GET /api/sessions/demo-participants...');
    const searchLearners = await request('/sessions/demo-participants?role=learner&q=Julian', { token: learnerToken });
    assert.equal(searchLearners.status, 200);
    assert.ok(Array.isArray(searchLearners.data.participants), 'Must return participants array');
    const foundLearner = searchLearners.data.participants.find((p) => p.custom_id === 'TE-128');
    assert.ok(foundLearner, 'Should find Julian Gemelo (TE-128)');
    assert.equal(foundLearner.role, 'learner');

    const searchTutors = await request('/sessions/demo-participants?role=tutor&q=Mark', { token: learnerToken });
    assert.equal(searchTutors.status, 200);
    const foundTutor = searchTutors.data.participants.find((p) => p.custom_id === 'TU-042');
    assert.ok(foundTutor, 'Should find Mark Antipo (TU-042)');
    assert.ok(foundTutor.role === 'tutor' || foundTutor.role === 'faculty');
    console.log('✓ Participant search filtering works cleanly.');

    // 3. Test validation errors on POST /sessions/demo-boot
    console.log('Testing validation guards on POST /api/sessions/demo-boot...');

    // Missing IDs
    const missingRes = await request('/sessions/demo-boot', {
      method: 'POST',
      token: learnerToken,
      body: {},
    });
    assert.equal(missingRes.status, 400, 'Must reject missing IDs with 400');

    // Same user for student and tutor
    const sameUserRes = await request('/sessions/demo-boot', {
      method: 'POST',
      token: learnerToken,
      body: { learnerId, tutorId: learnerId },
    });
    assert.equal(sameUserRes.status, 400, 'Must reject same user with 400');

    // Two learners (student-student)
    const twoStudentsRes = await request('/sessions/demo-boot', {
      method: 'POST',
      token: learnerToken,
      body: { learnerId, tutorId: secondLearnerId },
    });
    assert.equal(twoStudentsRes.status, 400, 'Must reject student-student pairing with 400');
    assert.match(twoStudentsRes.data.error, /accredited tutor|faculty/i, 'Error message must explain role requirement');

    // Two tutors (tutor-tutor)
    const twoTutorsRes = await request('/sessions/demo-boot', {
      method: 'POST',
      token: tutorToken,
      body: { learnerId: secondTutorId, tutorId },
    });
    assert.equal(twoTutorsRes.status, 400, 'Must reject tutor-tutor pairing with 400');
    assert.match(twoTutorsRes.data.error, /student|learner/i, 'Error message must explain student role requirement');
    console.log('✓ Strict role validation guards verified (student ↔ tutor only).');

    // 4. Test booting Online in-progress session
    console.log('Testing boot of Online in-progress session...');
    const onlineBootRes = await request('/sessions/demo-boot', {
      method: 'POST',
      token: learnerToken,
      body: {
        learnerId,
        tutorId,
        mode: 'online',
        status: 'in-progress',
        topic: 'Automated E2E Test Online Demo Session',
      },
    });
    assert.equal(onlineBootRes.status, 201, 'Online boot must return 201 Created');
    const onlineSession = onlineBootRes.data.session;
    assert.equal(onlineSession.mode, 'online');
    assert.equal(onlineSession.status, 'in-progress');
    assert.ok(onlineSession.started_at, 'Live session must have started_at set');
    assert.equal(onlineSession.location, 'Online · LCCB Live Classroom');

    // Verify check-in records in database
    const { rows: checkIns } = await query(
      `SELECT user_id, method FROM session_check_ins WHERE session_id = $1`,
      [onlineSession.id],
    );
    assert.equal(checkIns.length, 2, 'Must have 2 check-ins for live session');
    assert.ok(checkIns.some((c) => c.user_id === learnerId), 'Learner must be checked in');
    assert.ok(checkIns.some((c) => c.user_id === tutorId), 'Tutor must be checked in');

    // Verify room read
    const roomRes = await request(`/sessions/${onlineSession.id}`, { token: learnerToken });
    assert.equal(roomRes.status, 200);
    assert.equal(roomRes.data.session.id, onlineSession.id);
    assert.equal(roomRes.data.session.status, 'in-progress');
    console.log(`✓ Booted Online session ${onlineSession.session_code} live in-progress with dual check-ins.`);

    // 5. Test booting Offline upcoming session
    console.log('Testing boot of Face to Face upcoming session...');
    const offlineBootRes = await request('/sessions/demo-boot', {
      method: 'POST',
      token: tutorToken,
      body: {
        learnerId,
        tutorId,
        mode: 'face_to_face',
        status: 'upcoming',
        topic: 'Automated E2E Test Offline Demo Session',
      },
    });
    assert.equal(offlineBootRes.status, 201, 'Offline boot must return 201 Created');
    const offlineSession = offlineBootRes.data.session;
    assert.equal(offlineSession.mode, 'face_to_face');
    assert.equal(offlineSession.status, 'upcoming');
    assert.ok(offlineSession.venue_id, 'Face to face session must have venue_id');
    assert.notEqual(offlineSession.location, 'Online · LCCB Live Classroom');

    // Verify checkin scope query
    const checkinScopeRes = await request('/sessions/mine?scope=checkin', { token: tutorToken });
    assert.equal(checkinScopeRes.status, 200);
    const foundInCheckin = checkinScopeRes.data.sessions.find((s) => s.id === offlineSession.id);
    assert.ok(foundInCheckin, 'Offline upcoming session must appear in scope=checkin');
    console.log(`✓ Booted Face to Face session ${offlineSession.session_code} ready for check-in.`);

    console.log('\nAll Demo Session Boot tests PASSED (100% green).');
  } finally {
    if (server) server.close();
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n✗ Test failed:', err);
    if (server) server.close();
    process.exit(1);
  });
