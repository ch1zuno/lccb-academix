/* Check-in e2e: tutor stages token → learner + tutor verify → device verify fallback. */
const BASE = (process.env.E2E_API_BASE || 'http://localhost:4000').replace(/\/+$/, '') + '/api';
const DEVICE_KEY = process.env.DEVICE_API_KEY || 'dev-device-key';

async function request(path, { method = 'GET', token, body, headers = {} } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data; try { data = await res.json(); } catch { data = {}; }
  return { status: res.status, data };
}
const login = (loginId) => request('/auth/login', { method: 'POST', body: { loginId, password: 'demo1234' } });

(async () => {
  const tutor = (await login('TU-042')).data;
  const learner = (await login('TE-128')).data;

  const mine = (await request('/sessions/mine', { token: tutor.token })).data.sessions;
  console.log('tutor sessions:', mine.length, mine.slice(0, 3).map(s => `${s.session_code} (${s.status}, ${s.check_in_count}/2 checked)`));

  const target = mine.find(s => s.status === 'upcoming');
  if (!target) return console.log('no upcoming session to test, abort');

  // 1. stage token
  const staged = await request(`/sessions/${target.id}/stage-token`, { method: 'POST', token: tutor.token, body: { method: 'otp' } });
  console.log('staged:', staged.data);
  if (staged.status !== 200) return console.log('stage failed, abort');

  // 2. learner check-in
  const ci = await request(`/sessions/${target.id}/check-in`, { method: 'POST', token: learner.token, body: { token: staged.data.token } });
  console.log('learner check-in:', ci.data);

  // 3. same user reusing token must fail (409) without burning the shared code for their partner
  const bad = await request(`/sessions/${target.id}/check-in`, { method: 'POST', token: learner.token, body: { token: staged.data.token } });
  console.log('token reuse:', bad.status, bad.data.error);
  if (bad.status !== 409) throw new Error(`expected 409 on duplicate learner check-in, got ${bad.status}`);

  // 4. tutor confirms with the SAME shared code (no need to burn/regenerate a second code)
  const ci2 = await request(`/sessions/${target.id}/check-in`, { method: 'POST', token: tutor.token, body: { token: staged.data.token } });
  console.log('tutor check-in:', ci2.data);
  if (ci2.status !== 200 || !ci2.data.sessionStarted) throw new Error(`expected shared-code tutor check-in to start session, got ${ci2.status} ${JSON.stringify(ci2.data)}`);

  // 5. unauth'd check-in by another learner must fail (TE-092 touches TU-042's session)
  const stranger = (await login('TE-092')).data;
  const staged3 = await request(`/sessions/${target.id}/stage-token`, { method: 'POST', token: tutor.token, body: { method: 'otp' } });
  const outsider = await request(`/sessions/${target.id}/check-in`, { method: 'POST', token: stranger.token, body: { token: staged3.data.token } });
  console.log('outsider:', outsider.status, outsider.data.error);

  // 6. device fingerprint verify (device key required)
  const badDevice = await request('/device/verify', { method: 'POST', body: { fingerprint_id: 'FPR-001' }, headers: { 'X-Device-Key': 'wrong' } });
  console.log('device wrong key:', badDevice.status);
  const roster = await request('/device/import-roster', {
    method: 'POST', headers: { 'X-Device-Key': DEVICE_KEY },
    body: { csv: 'FPR-001,Julian Gemelo\nFPR-002,Julian Gemelo\nBOGUS,"BlurpNotFound"' },
  });
  console.log('roster import:', roster.data);
  const dv = await request('/device/verify', { method: 'POST', body: { fingerprint_id: 'FPR-001' }, headers: { 'X-Device-Key': DEVICE_KEY } });
  console.log('device verify:', dv.status, dv.data.session?.session_code ?? 'no session', 'confirms:', dv.data.confirmations);
})();
