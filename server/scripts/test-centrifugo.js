import jwt from 'jsonwebtoken';
import { signConnectionToken, MIN_CENTRIFUGO_SECRET_LENGTH } from '../lib/centrifugo.js';
import { config } from '../config.js';

const BASE = 'http://localhost:4000/api';

async function request(path, { method = 'GET', token, body, headers = {} } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data;
  try {
    data = await res.json();
  } catch {
    data = {};
  }
  return { status: res.status, data, headers: res.headers };
}

const login = (loginId) =>
  request('/auth/login', { method: 'POST', body: { loginId, password: 'demo1234' } });

const assert = (ok, msg) => {
  if (!ok) {
    console.error(`✗ FAIL: ${msg}`);
    throw new Error(msg);
  }
  console.log(`✓ PASS: ${msg}`);
};

async function runTests() {
  console.log('\n--- 1. Testing Centrifugo JWT Signing Helper Unit Logic ---');

  // Test 1: Secret length validation
  let shortSecretThrew = false;
  try {
    signConnectionToken({
      userId: 'user-123',
      secretOverride: 'short-secret-under-32-chars',
    });
  } catch (err) {
    shortSecretThrew = true;
    assert(
      err.message.includes(`at least ${MIN_CENTRIFUGO_SECRET_LENGTH} characters`),
      `Proper error message on short secret: "${err.message}"`,
    );
  }
  assert(shortSecretThrew, 'signConnectionToken throws on secret < 32 characters');

  // Test 2: Missing userId validation
  let missingUserThrew = false;
  try {
    signConnectionToken({
      userId: '',
      secretOverride: 'this-is-a-valid-secret-longer-than-32-chars-long!',
    });
  } catch (err) {
    missingUserThrew = true;
    assert(err.message.includes('userId is required'), 'Proper error message on missing userId');
  }
  assert(missingUserThrew, 'signConnectionToken throws on empty userId');

  // Test 3: Valid token signing and HS256 claims
  const testSecret = 'this-is-a-valid-secret-longer-than-32-chars-long!';
  const token = signConnectionToken({
    userId: 'usr_42',
    info: { name: 'Mark Antipo', role: 'tutor' },
    ttlSeconds: 300,
    secretOverride: testSecret,
  });

  assert(typeof token === 'string' && token.split('.').length === 3, 'Token is a valid 3-part JWT');

  const decoded = jwt.verify(token, Buffer.from(testSecret, 'utf-8'), { algorithms: ['HS256'] });
  assert(decoded.sub === 'usr_42', 'Claim `sub` matches userId');
  assert(decoded.info.name === 'Mark Antipo', 'Claim `info.name` matches profile');
  assert(decoded.info.role === 'tutor', 'Claim `info.role` matches role');
  assert(typeof decoded.exp === 'number' && decoded.exp > decoded.iat, 'Claims `iat` and `exp` are valid numbers');
  assert(decoded.exp - decoded.iat === 300, 'TTL matches requested 300s');

  console.log('\n--- 2. Testing Realtime Token API Endpoint (/api/realtime/token) ---');

  // Test 4: Unauthenticated access returns 401
  const unauthRes = await request('/realtime/token', { method: 'POST' });
  assert(unauthRes.status === 401, 'POST /api/realtime/token returns 401 when unauthorized');

  // Test 5: Method Guard: GET returns 405 Method Not Allowed
  const getRes = await request('/realtime/token', { method: 'GET' });
  assert(getRes.status === 405, 'GET /api/realtime/token returns 405 Method Not Allowed');
  assert(getRes.headers.get('allow') === 'POST', 'Response header includes Allow: POST');

  // Log in demo accounts
  const tutorRes = await login('TU-042');
  const learnerRes = await login('TE-128');
  const facultyRes = await login('b.tisuela@lccbacolod.edu.ph');
  const adminRes = await login('l.betita.admin@lccbacolod.edu.ph');

  assert(tutorRes.status === 200, 'Tutor Mark Antipo logged in');
  assert(learnerRes.status === 200, 'Learner Julian Gemelo logged in');
  assert(facultyRes.status === 200, 'Faculty logged in');
  assert(adminRes.status === 200, 'Superadmin logged in');

  const tutorToken = tutorRes.data.token;
  const learnerToken = learnerRes.data.token;
  const facultyToken = facultyRes.data.token;
  const adminToken = adminRes.data.token;

  // Test 6: Authenticated POST generates token and sets Cache-Control: no-store
  const authedRes = await request('/realtime/token', {
    method: 'POST',
    token: tutorToken,
  });

  assert(authedRes.status === 200, 'POST /api/realtime/token returns 200 OK');
  assert(Boolean(authedRes.data.token), 'Response contains token string');
  assert(typeof authedRes.data.expiresAt === 'number', 'Response contains expiresAt unix timestamp');
  assert(
    authedRes.headers.get('cache-control')?.includes('no-store'),
    'Response headers include Cache-Control: no-store',
  );

  // Verify decoded payload from actual server config
  const serverDecoded = jwt.verify(authedRes.data.token, Buffer.from(config.centrifugoSecret, 'utf-8'), {
    algorithms: ['HS256'],
  });
  assert(serverDecoded.sub === tutorRes.data.user.id, 'Decoded token sub matches authenticated tutor id');
  assert(serverDecoded.info.name === 'Mark Antipo', 'Info contains display name');
  assert(serverDecoded.info.role === 'tutor', 'Info contains role');
  assert(!('email' in serverDecoded.info), 'Non-sensitive info: email excluded');
  assert(!('token_version' in serverDecoded.info), 'Non-sensitive info: token_version excluded');

  console.log('\n--- 3. Testing Centrifugo Subscribe Proxy Authorization ---');

  // Fetch tutor sessions to find target session
  const { data: { sessions } } = await request('/sessions/mine', { token: tutorToken });
  const session = sessions.find((s) => s.status === 'upcoming' || s.status === 'in-progress');
  assert(Boolean(session), `Target session found: ${session?.session_code}`);

  const proxySecret = config.centrifugoProxySecret || config.centrifugoSecret;
  const proxyHeaders = {
    'X-Centrifugo-Proxy-Secret': proxySecret,
  };

  // Test 7: Invalid proxy secret returns 403
  const badSecretRes = await request('/realtime/proxy/subscribe', {
    method: 'POST',
    headers: { 'X-Centrifugo-Proxy-Secret': 'wrong-secret' },
    body: {
      user: tutorRes.data.user.id,
      channel: `tutoring-room:${session.session_code}`,
    },
  });
  assert(badSecretRes.status === 403, 'Proxy request with wrong secret rejected with 403');

  // Test 8: Deny by default on non-matching channel namespace
  const invalidChannelRes = await request('/realtime/proxy/subscribe', {
    method: 'POST',
    headers: proxyHeaders,
    body: {
      user: tutorRes.data.user.id,
      channel: 'random-channel:123',
    },
  });
  assert(
    invalidChannelRes.data.error?.code === 103,
    'Subscription to unauthorized channel namespace rejected with code 103',
  );

  // Test 9: Deny access to non-existent room
  const nonExistentRoomRes = await request('/realtime/proxy/subscribe', {
    method: 'POST',
    headers: proxyHeaders,
    body: {
      user: tutorRes.data.user.id,
      channel: 'tutoring-room:non-existent-room-code-999',
    },
  });
  assert(
    nonExistentRoomRes.data.error?.code === 104,
    'Subscription to non-existent room rejected with code 104',
  );

  // Test 10: Deny access to unauthorized user (faculty is neither tutor nor learner for this session)
  const unassignedUserRes = await request('/realtime/proxy/subscribe', {
    method: 'POST',
    headers: proxyHeaders,
    body: {
      user: facultyRes.data.user.id,
      channel: `tutoring-room:${session.session_code}`,
    },
  });
  assert(
    unassignedUserRes.data.error?.code === 103,
    'Unassigned faculty user denied access with code 103',
  );

  // Test 11: Authorize assigned tutor
  const tutorSubRes = await request('/realtime/proxy/subscribe', {
    method: 'POST',
    headers: proxyHeaders,
    body: {
      user: tutorRes.data.user.id,
      channel: `tutoring-room:${session.session_code}`,
    },
  });
  assert(
    tutorSubRes.status === 200 && tutorSubRes.data.result && !tutorSubRes.data.error,
    'Assigned tutor authorized with 200 { result: {} }',
  );

  // Test 12: Authorize assigned learner
  const learnerSubRes = await request('/realtime/proxy/subscribe', {
    method: 'POST',
    headers: proxyHeaders,
    body: {
      user: learnerRes.data.user.id,
      channel: `tutoring-room:${session.session_code}`,
    },
  });
  assert(
    learnerSubRes.status === 200 && learnerSubRes.data.result && !learnerSubRes.data.error,
    'Assigned learner authorized with 200 { result: {} }',
  );

  // Test 13: Authorize by UUID instead of session_code
  const uuidSubRes = await request('/realtime/proxy/subscribe', {
    method: 'POST',
    headers: proxyHeaders,
    body: {
      user: tutorRes.data.user.id,
      channel: `tutoring-room:${session.id}`,
    },
  });
  assert(
    uuidSubRes.status === 200 && uuidSubRes.data.result && !uuidSubRes.data.error,
    'Assigned tutor authorized via session UUID format',
  );

  // Test 14: Authorize superadmin supervisor
  const adminSubRes = await request('/realtime/proxy/subscribe', {
    method: 'POST',
    headers: proxyHeaders,
    body: {
      user: adminRes.data.user.id,
      channel: `tutoring-room:${session.session_code}`,
    },
  });
  assert(
    adminSubRes.status === 200 && adminSubRes.data.result && !adminSubRes.data.error,
    'Superadmin authorized to supervise tutoring room',
  );

  console.log('\nAll Centrifugo unit and integration tests PASSED successfully!\n');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('\nTests failed with error:', err);
  process.exit(1);
});

