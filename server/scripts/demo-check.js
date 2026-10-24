/* Showtime readiness gate. Run 10 minutes before presenting.
 *
 *   node server/scripts/demo-check.js                     (local API on :4000)
 *   node server/scripts/demo-check.js https://lccb-academix.vercel.app --warm
 *
 * Verifies: API + database health, all four role logins, every page's main
 * data endpoint, the role guard, and that demo:stage left the showcase states
 * in place (flagged + rejected referrals, an upcoming session, an approvable
 * application). Exits non-zero if anything is off. */

const args = process.argv.slice(2);
const warm = args.includes('--warm');
const target = args.find((a) => !a.startsWith('--')) || process.env.DEMO_API_BASE || 'http://localhost:4000';
const ORIGIN = target.replace(/\/+$/, '');
const API = ORIGIN.endsWith('/api') ? ORIGIN : `${ORIGIN}/api`;
const WEB = API.replace(/\/api$/, '');
const PASSWORD = 'demo1234';

let pass = 0;
let fail = 0;

function check(label, ok, extra = '') {
  if (ok) pass += 1; else fail += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? ` — ${extra}` : ''}`);
}

async function request(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data;
  try { data = await res.json(); } catch { data = {}; }
  return { status: res.status, data };
}

async function login(loginId) {
  return request('/auth/login', { method: 'POST', body: { loginId, password: PASSWORD } });
}

(async () => {
  console.log(`Demo readiness — ${API}\n`);

  if (warm) {
    for (let i = 1; i <= 3; i += 1) {
      const started = Date.now();
      await fetch(`${API}/health`).catch(() => {});
      console.log(`warm ${i}/3 — ${Date.now() - started}ms`);
    }
    console.log('');
  }

  const health = await request('/health');
  check(
    'health (API + database)',
    health.status === 200 && health.data.ok === true && health.data.database === 'up',
    `${health.status}${health.data.latencyMs != null ? ` · ${health.data.latencyMs}ms` : ''}${health.data.error ? ` · ${health.data.error}` : ''}`,
  );

  const ROLES = [
    ['learner', 'TE-128'],
    ['tutor', 'TU-042'],
    ['faculty', 'b.tisuela@lccbacolod.edu.ph'],
    ['superadmin', 'l.betita.admin@lccbacolod.edu.ph'],
  ];
  const tokens = {};
  for (const [role, loginId] of ROLES) {
    const r = await login(loginId);
    const ok = r.status === 200 && Boolean(r.data.token);
    check(`${role} login (${loginId})`, ok, ok ? 'token issued' : `${r.status} ${r.data.error ?? ''}`);
    if (ok) tokens[role] = r.data.token;
  }

  const get = async (label, path, token, want = 200) => {
    const r = await request(path, { token });
    check(label, r.status === want, `${r.status}${r.status !== want ? ` ${r.data.error ?? ''}` : ''}`);
    return r;
  };

  let learnerSessions = [];
  if (tokens.learner) {
    const s = await get('learner sessions', '/sessions/mine', tokens.learner);
    learnerSessions = s.data.sessions ?? [];
    await get('learner wallet', '/wallet', tokens.learner);
  }
  if (tokens.tutor) {
    await get('tutor sessions', '/sessions/mine', tokens.tutor);
    await get('tutor directory', '/tutors', tokens.tutor);
    await get('rewards catalog', '/rewards', tokens.tutor);
  }

  let facultyRefs = [];
  if (tokens.faculty) {
    const r = await get('faculty referral board', '/referrals', tokens.faculty);
    facultyRefs = r.data.referrals ?? [];
  }

  let applications = [];
  if (tokens.superadmin) {
    await get('superadmin referrals', '/referrals', tokens.superadmin);
    await get('superadmin analytics', '/analytics', tokens.superadmin);
    const a = await get('superadmin applications', '/accreditation/applications', tokens.superadmin);
    applications = a.data.applications ?? [];
  }

  await get('public landing overview', '/public/overview', undefined);

  if (tokens.learner) {
    const guard = await request('/analytics', { token: tokens.learner });
    check('role guard: learner blocked from analytics', guard.status === 403, String(guard.status));
  }

  const webHost = new URL(WEB).hostname;
  if (!/^(localhost|127\.0\.0\.1|::1)$/.test(webHost)) {
    try {
      const res = await fetch(WEB);
      check('web app reachable', res.status === 200, String(res.status));
    } catch (e) {
      check('web app reachable', false, e.message);
    }
  }

  console.log('\n— staged showcase —');
  const flagged = facultyRefs.find((r) => /^DEMO: Flagged/.test(r.topic ?? '') && r.status === 'flagged');
  check(
    'flagged referral for the reject act',
    Boolean(flagged),
    flagged ? flagged.referral_code : 'run npm run demo:stage',
  );
  const rejected = facultyRefs.find((r) => /^DEMO: Rejected/.test(r.topic ?? '') && r.status === 'rejected');
  check(
    'rejected referral for the remove act',
    Boolean(rejected),
    rejected ? rejected.referral_code : 'run npm run demo:stage',
  );
  const upcoming = learnerSessions.find((s) => s.status === 'upcoming');
  check(
    'upcoming session for the check-in act',
    Boolean(upcoming),
    upcoming ? upcoming.session_code : 'run npm run demo:stage',
  );
  const approvable = applications.find((a) => a.status === 'pending' && a.exam_score != null);
  check(
    'approvable tutor application',
    Boolean(approvable),
    approvable ? `${approvable.application_code} · ${approvable.name}` : 'run npm run demo:stage',
  );

  console.log(`\n${pass} passed, ${fail} failed.`);
  if (fail) {
    console.log('NOT DEMO READY — fix the FAIL lines above.');
    process.exit(1);
  }
  console.log('DEMO READY ✅');
})();
