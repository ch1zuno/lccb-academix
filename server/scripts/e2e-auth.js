/* Auth revocation e2e: logout-all bumps token_version and kills old JWTs. */
const BASE = (process.env.E2E_API_BASE || 'http://localhost:4000').replace(/\/+$/, '') + '/api';

async function request(path, { method = 'GET', token, cookie, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data; try { data = await res.json(); } catch { data = {}; }
  return { status: res.status, data, headers: res.headers };
}
const login = (loginId) => request('/auth/login', { method: 'POST', body: { loginId, password: 'demo1234' } });

const assert = (ok, message) => { if (!ok) throw new Error(message); };

(async () => {
  const first = await login('TE-092');
  assert(first.status === 200 && first.data.token, `login failed: ${first.status} ${first.data.error ?? ''}`);
  const oldToken = first.data.token;

  const setCookie = first.headers.getSetCookie?.()[0] ?? first.headers.get('set-cookie') ?? '';
  assert(/academix_session=/.test(setCookie), 'login must set the session cookie');
  assert(/HttpOnly/i.test(setCookie), 'session cookie must be HttpOnly');
  assert(/SameSite=Strict/i.test(setCookie), 'session cookie must be SameSite=Strict');
  const cookie = setCookie.split(';')[0];

  const cookieMe = await request('/auth/me', { cookie });
  assert(cookieMe.status === 200 && cookieMe.data.user?.custom_id === 'TE-092', `cookie auth failed: ${cookieMe.status}`);

  const cleared = await request('/auth/logout', { method: 'POST', cookie });
  assert(cleared.status === 200, `logout failed: ${cleared.status}`);
  const clearedCookie = cleared.headers.getSetCookie?.()[0] ?? cleared.headers.get('set-cookie') ?? '';
  assert(/academix_session=;/.test(clearedCookie), 'logout must clear the session cookie');

  const anonymous = await request('/auth/me');
  assert(anonymous.status === 401, `anonymous /me should be 401, got ${anonymous.status}`);

  const me = await request('/auth/me', { token: oldToken });
  assert(me.status === 200 && me.data.user?.custom_id === 'TE-092', `me failed: ${me.status}`);

  const revoked = await request('/auth/logout-all', { method: 'POST', token: oldToken });
  assert(revoked.status === 200 && revoked.data.revoked === true, `logout-all failed: ${revoked.status}`);

  const after = await request('/auth/me', { token: oldToken });
  assert(after.status === 401, `old token should be 401, got ${after.status}`);

  const second = await login('TE-092');
  assert(second.status === 200 && second.data.token, `re-login failed: ${second.status}`);
  const fresh = await request('/auth/me', { token: second.data.token });
  assert(fresh.status === 200, `fresh token should work, got ${fresh.status}`);

  const bad = await request('/auth/login', { method: 'POST', body: { loginId: 'TE-092', password: 'wrong-password' } });
  assert(bad.status === 401, `bad password should be 401, got ${bad.status}`);

  console.log('Auth revocation e2e passed.');
})().catch((error) => {
  console.error('FAIL', error.message);
  process.exit(1);
});
