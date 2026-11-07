import assert from 'node:assert/strict';
import { deriveJitsiRoomName } from '../routes/video.js';

const API_BASE = 'http://localhost:4000/api';

async function loginUser(loginId) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ loginId, password: 'demo1234' }),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Login failed for ${loginId}: ${res.status} ${errText}`);
  }
  const cookie = res.headers.get('set-cookie');
  const data = await res.json();
  return { user: data.user, cookie };
}

async function runTests() {
  console.log('🧪 Starting Video Room & Membership Authorization Tests...\n');
  let passed = 0;

  // 1. Unit test: deriveJitsiRoomName
  console.log('Test 1: deriveJitsiRoomName format & determinism');
  {
    const room1a = deriveJitsiRoomName('SES-184036', 'test-secret-12345678901234567890');
    const room1b = deriveJitsiRoomName('SES-184036', 'test-secret-12345678901234567890');
    const room2 = deriveJitsiRoomName('SES-999999', 'test-secret-12345678901234567890');

    assert.equal(room1a, room1b, 'Same sessionId must yield identical roomName');
    assert.notEqual(room1a, room2, 'Different sessionId must yield different roomName');
    assert.match(room1a, /^tutoring-[a-f0-9]{32}$/, 'roomName must match tutoring-<32-hex>');
    passed++;
    console.log('  ✓ deriveJitsiRoomName is deterministic and properly formatted');
  }

  // 2. Endpoint: Unauthenticated access returns 401
  console.log('Test 2: GET /api/video/room requires authentication');
  {
    const res = await fetch(`${API_BASE}/video/room?roomId=SES-184036`);
    assert.equal(res.status, 401, 'Unauthenticated request must return 401');
    passed++;
    console.log('  ✓ Unauthenticated request rejected with 401');
  }

  // 3. Login accounts for authorization testing
  console.log('Test 3: Authentication credentials check');
  const tutor = await loginUser('TU-042');
  const learner = await loginUser('TE-128');
  const faculty = await loginUser('b.tisuela@lccbacolod.edu.ph');
  const superadmin = await loginUser('l.betita.admin@lccbacolod.edu.ph');
  passed++;
  console.log('  ✓ Test user sessions acquired');

  // Find target test session (tutor TU-042 and learner TE-128)
  const sessionListRes = await fetch(`${API_BASE}/sessions/mine`, {
    headers: { Cookie: tutor.cookie },
  });
  const sessionList = await sessionListRes.json();
  const targetSession = sessionList.sessions?.find((s) => s.status === 'upcoming' || s.status === 'in-progress');
  assert.ok(targetSession, 'Target tutoring session must exist');

  const targetRoomId = targetSession.session_code;
  const targetSessionUuid = targetSession.id;

  // 4. Missing roomId returns 400
  console.log('Test 4: Missing roomId parameter returns 400');
  {
    const res = await fetch(`${API_BASE}/video/room`, {
      headers: { Cookie: tutor.cookie },
    });
    assert.equal(res.status, 400, 'Missing roomId must return 400');
    passed++;
    console.log('  ✓ Missing roomId rejected with 400');
  }

  // 5. Non-member user returns 403 Forbidden
  console.log('Test 5: Non-member access returns 403 Forbidden');
  {
    const res = await fetch(`${API_BASE}/video/room?roomId=${encodeURIComponent(targetRoomId)}`, {
      headers: { Cookie: faculty.cookie },
    });
    assert.equal(res.status, 403, 'Unassigned user must return 403');
    const data = await res.json();
    assert.match(data.error, /permission denied|not assigned/i, 'Error message indicates unauthorized');
    passed++;
    console.log('  ✓ Non-member user rejected with 403');
  }

  // 6. Assigned tutor receives 200 with roomName and domain
  console.log('Test 6: Assigned tutor authorized');
  let tutorRoomName = '';
  {
    const res = await fetch(`${API_BASE}/video/room?roomId=${encodeURIComponent(targetRoomId)}`, {
      headers: { Cookie: tutor.cookie },
    });
    assert.equal(res.status, 200, 'Assigned tutor must be authorized with 200');
    assert.equal(res.headers.get('cache-control'), 'no-store', 'Response must be Cache-Control: no-store');
    const data = await res.json();
    assert.ok(data.roomName, 'Response must contain roomName');
    assert.ok(data.domain, 'Response must contain domain');
    assert.match(data.roomName, /^tutoring-[a-f0-9]{32}$/, 'roomName format must be valid');
    assert.equal(data.roomSecret, undefined, 'Must NEVER leak room secret');
    tutorRoomName = data.roomName;
    passed++;
    console.log(`  ✓ Assigned tutor received roomName: ${tutorRoomName}`);
  }

  // 7. Assigned learner receives identical roomName (via session_code or UUID)
  console.log('Test 7: Assigned learner receives identical roomName');
  {
    // Request via UUID
    const res = await fetch(`${API_BASE}/video/room?roomId=${encodeURIComponent(targetSessionUuid)}`, {
      headers: { Cookie: learner.cookie },
    });
    assert.equal(res.status, 200, 'Assigned learner must be authorized with 200');
    const data = await res.json();
    assert.equal(data.roomName, tutorRoomName, 'Learner must get identical roomName as tutor');
    passed++;
    console.log('  ✓ Assigned learner received identical roomName');
  }

  // 8. Superadmin supervisor receives identical roomName
  console.log('Test 8: Superadmin supervisor authorized');
  {
    const res = await fetch(`${API_BASE}/video/room?roomId=${encodeURIComponent(targetRoomId)}`, {
      headers: { Cookie: superadmin.cookie },
    });
    assert.equal(res.status, 200, 'Superadmin supervisor must be authorized with 200');
    const data = await res.json();
    assert.equal(data.roomName, tutorRoomName, 'Superadmin must get identical roomName');
    passed++;
    console.log('  ✓ Superadmin supervisor authorized');
  }

  console.log(`\n🎉 All ${passed}/8 Video Room tests passed successfully!`);
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
