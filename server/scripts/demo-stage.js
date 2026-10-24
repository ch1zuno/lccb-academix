/* Demo stager — mints every showcase state THROUGH THE REAL API so every
 * ledger entry, notification, rating and accreditation record is legitimate.
 *
 *   node server/scripts/demo-stage.js                          (local API on :4000)
 *   $env:DEMO_API_BASE="https://lccb-academix.vercel.app"; node server/scripts/demo-stage.js
 *
 * Ground rules:
 *  - insert-only toward existing data; it never edits or deletes seed rows;
 *  - the only state changes are on objects this run just created (rejecting
 *    the demo referral, accepting the demo request);
 *  - re-runnable: each step first looks for its showcase object and skips if
 *    it already exists in the required state. */

const ORIGIN = (process.env.DEMO_API_BASE || 'http://localhost:4000').replace(/\/+$/, '');
const BASE = ORIGIN.endsWith('/api') ? ORIGIN : `${ORIGIN}/api`;
const PASSWORD = 'demo1234';
const FACULTY = 'b.tisuela@lccbacolod.edu.ph';
const LEARNER = 'TE-128';
const TUTOR = 'TU-042';
const COHORT_APPLICANTS = [
  '24-0870-118', '24-0870-131', '25-0870-142', '25-0870-155',
  '25-0870-168', '25-0871-071', '25-0871-086', '26-0870-093', '26-0871-114',
];

async function request(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data;
  try { data = await res.json(); } catch { data = {}; }
  return { status: res.status, data };
}

async function login(loginId) {
  const r = await request('/auth/login', { method: 'POST', body: { loginId, password: PASSWORD } });
  if (r.status !== 200 || !r.data.token) {
    throw new Error(`login ${loginId} failed — ${r.status} ${r.data.error ?? ''}`.trim());
  }
  return r.data; // { token, user }
}

let failures = 0;
async function step(label, fn) {
  try {
    const message = await fn();
    console.log(`✓ ${label} — ${message}`);
  } catch (e) {
    failures += 1;
    console.log(`✗ ${label} — ${e.message}`);
  }
}

const today = new Date().toISOString().slice(0, 10);

console.log(`Demo staging against ${BASE}\n`);

const faculty = await login(FACULTY);
const learner = await login(LEARNER);
const tutor = await login(TUTOR);

const subjectRows = (await request('/subjects', { token: faculty.token })).data.subjects ?? [];
const subjectByCode = new Map(subjectRows.map((s) => [s.code, s]));
const fallbackSubject = subjectRows[0];

await step('flagged referral for the reject act', async () => {
  const refs = (await request('/referrals', { token: faculty.token })).data.referrals ?? [];
  const existing = refs.find((r) => /^DEMO: Flagged/.test(r.topic ?? '') && r.status === 'flagged');
  if (existing) return `already on the board (${existing.referral_code})`;

  const students = (await request(`/referrals/search-students?q=${encodeURIComponent(LEARNER)}`, { token: faculty.token })).data.students ?? [];
  const student = students.find((s) => s.custom_id === LEARNER) ?? students[0];
  if (!student) throw new Error(`${LEARNER} not found by search`);
  const subject = subjectByCode.get('PROG 201') ?? fallbackSubject;

  const created = await request('/referrals', {
    method: 'POST',
    token: faculty.token,
    body: {
      learnerId: student.id,
      subjectId: subject.id,
      topic: 'DEMO: Flagged — linked lists',
      urgency: 'high',
      hoursRequired: 4,
      notes: 'Staged for the presentation: assign a tutor or reject it live.',
    },
  });
  if (created.status !== 201) throw new Error(created.data.error || `POST /referrals ${created.status}`);
  return `created ${created.data.referral.referral_code}`;
});

await step('rejected referral for the superadmin remove act', async () => {
  const refs = (await request('/referrals', { token: faculty.token })).data.referrals ?? [];
  const existing = refs.find((r) => /^DEMO: Rejected/.test(r.topic ?? '') && r.status === 'rejected');
  if (existing) return `already rejected (${existing.referral_code})`;

  const students = (await request(`/referrals/search-students?q=${encodeURIComponent(LEARNER)}`, { token: faculty.token })).data.students ?? [];
  const student = students.find((s) => s.custom_id === LEARNER) ?? students[0];
  if (!student) throw new Error(`${LEARNER} not found by search`);
  const subject = subjectByCode.get('IT 101') ?? fallbackSubject;

  const created = await request('/referrals', {
    method: 'POST',
    token: faculty.token,
    body: {
      learnerId: student.id,
      subjectId: subject.id,
      topic: 'DEMO: Rejected — duplicate flag',
      urgency: 'low',
      hoursRequired: 2,
      notes: 'Staged so the superadmin overview shows the rejected panel.',
    },
  });
  if (created.status !== 201) throw new Error(created.data.error || `POST /referrals ${created.status}`);
  const rejected = await request(`/referrals/${created.data.referral.id}/status`, {
    method: 'PATCH',
    token: faculty.token,
    body: { status: 'rejected' },
  });
  if (rejected.status !== 200) throw new Error(rejected.data.error || `PATCH status ${rejected.status}`);
  return `created ${created.data.referral.referral_code} and rejected it`;
});

await step('upcoming session for the check-in act', async () => {
  const sessions = (await request('/sessions/mine', { token: learner.token })).data.sessions ?? [];
  const upcoming = sessions.find((s) => s.status === 'upcoming');
  if (upcoming) return `already scheduled (${upcoming.session_code})`;

  const tutors = (await request('/tutors?available=1', { token: learner.token })).data.tutors ?? [];
  const tutorRow = tutors.find((t) => t.custom_id === TUTOR) ?? tutors.find((t) => (t.subjects ?? []).length > 0);
  if (!tutorRow) throw new Error('no available tutor in the directory');
  const subject = subjectByCode.get(tutorRow.subjects?.[0]?.code) ?? fallbackSubject;

  const requested = await request('/session-requests', {
    method: 'POST',
    token: learner.token,
    body: {
      tutorId: tutorRow.id,
      subjectId: subject.id,
      topic: 'DEMO: Check-in walkthrough',
      preferredDate: today,
      preferredTime: '10:00 AM',
      location: 'Library Study Room A',
    },
  });
  if (requested.status !== 201) throw new Error(requested.data.error || `POST /session-requests ${requested.status}`);

  const tutorLogin = tutorRow.custom_id === TUTOR ? tutor : await login(tutorRow.custom_id);
  const accepted = await request(`/session-requests/${requested.data.request.id}/accept`, {
    method: 'POST',
    token: tutorLogin.token,
  });
  if (accepted.status !== 201) throw new Error(accepted.data.error || `accept ${accepted.status}`);
  return `scheduled ${accepted.data.session.session_code} (${subject.code})`;
});

await step('pending, exam-ready tutor application for approvals', async () => {
  for (const candidate of COHORT_APPLICANTS) {
    const who = await login(candidate);
    const mine = (await request('/accreditation/mine', { token: who.token })).data.application;
    if (mine && mine.status === 'pending' && mine.exam_score != null) {
      return `already approvable (${mine.application_code}, score ${mine.exam_score})`;
    }
    if (mine && mine.status === 'pending') {
      // Application exists but the exam is unsent — finish it so Approve works live.
      const exam = await request('/accreditation/exam', { token: who.token });
      if (exam.status !== 200) continue;
      const answers = {};
      for (const q of exam.data.questions ?? []) answers[String(q.question_number)] = 0;
      const graded = await request('/accreditation/exam', { method: 'POST', token: who.token, body: { answers } });
      if (graded.status === 200) return `application ${mine.application_code} exam-ready (score ${graded.data.exam_score})`;
      continue;
    }
    if (mine) continue; // approved/rejected already — next candidate

    const picks = ['PROG 201', 'IT 101', 'DBMS 301'].map((c) => subjectByCode.get(c)).filter(Boolean).slice(0, 2);
    const applied = await request('/accreditation/apply', {
      method: 'POST',
      token: who.token,
      body: {
        subjectIds: picks.map((s) => s.id),
        achievements: [{
          title: "Dean's Lister — 1st Semester",
          detail: 'GPA 1.42, consistent honor student',
          link: 'https://lccb-academix.vercel.app/',
        }],
      },
    });
    if (applied.status !== 201) {
      if (applied.status === 409) continue;
      throw new Error(applied.data.error || `apply ${applied.status}`);
    }

    const exam = await request('/accreditation/exam', { token: who.token });
    const answers = {};
    for (const q of exam.data.questions ?? []) answers[String(q.question_number)] = 0;
    await request('/accreditation/exam', { method: 'POST', token: who.token, body: { answers } });
    return `application ${applied.data.application.application_code} pending for ${candidate} (exam submitted)`;
  }
  throw new Error('all cohort candidates already have applications');
});

await step('points buffer for the rewards act', async () => {
  const rewards = (await request('/rewards', { token: learner.token })).data.rewards ?? [];
  const cheapest = rewards.filter((r) => (r.stock ?? 0) > 0).sort((a, b) => a.cost - b.cost)[0];
  if (!cheapest) return 'no rewards in stock — nothing to buffer';

  let balance = (await request('/wallet', { token: learner.token })).data.balance ?? 0;
  if (balance >= cheapest.cost) return `balance ${balance} already covers ${cheapest.name} (${cheapest.cost})`;

  let completed = 0;
  for (let i = 0; i < 12 && balance < cheapest.cost; i += 1) {
    await completeDemoSession();
    completed += 1;
    balance = (await request('/wallet', { token: learner.token })).data.balance ?? balance;
  }
  if (balance < cheapest.cost) throw new Error(`balance ${balance} still below ${cheapest.cost}`);
  return `topped up to ${balance} with ${completed} completed demo session(s)`;
});

console.log('');
if (failures) {
  console.log(`${failures} staging step(s) failed — fix them before rehearsing.`);
  process.exit(1);
}
console.log('DEMO STAGE READY — run the readiness gate next:');
console.log(`  npm run demo:check -- ${BASE.replace(/\/api$/, '')}`);

/* One complete learner↔tutor session through the public flow: request →
 * accept → dual check-in → wrap-up. Grants the learner 25 real ledger points. */
async function completeDemoSession() {
  const tutors = (await request('/tutors?available=1', { token: learner.token })).data.tutors ?? [];
  const tutorRow = tutors.find((t) => t.custom_id === TUTOR);
  if (!tutorRow) throw new Error(`${TUTOR} is not available for a demo session`);
  const subject = subjectByCode.get('PROG 201') ?? fallbackSubject;

  const requested = await request('/session-requests', {
    method: 'POST',
    token: learner.token,
    body: {
      tutorId: tutorRow.id,
      subjectId: subject.id,
      topic: 'DEMO: Points top-up',
      preferredDate: today,
      preferredTime: '9:00 AM',
      location: 'Library Study Room A',
    },
  });
  if (requested.status !== 201) throw new Error(requested.data.error || 'top-up request failed');

  const accepted = await request(`/session-requests/${requested.data.request.id}/accept`, {
    method: 'POST',
    token: tutor.token,
  });
  if (accepted.status !== 201) throw new Error(accepted.data.error || 'top-up accept failed');
  const sessionId = accepted.data.session.id;

  const stageToken = () =>
    request(`/sessions/${sessionId}/stage-token`, { method: 'POST', token: tutor.token, body: { method: 'otp' } });

  const first = await stageToken();
  if (first.status !== 200) throw new Error(first.data.error || 'stage-token failed');
  const learnerCheck = await request(`/sessions/${sessionId}/check-in`, {
    method: 'POST', token: learner.token, body: { token: first.data.token },
  });
  if (learnerCheck.status !== 200) throw new Error(learnerCheck.data.error || 'learner check-in failed');

  const second = await stageToken();
  const tutorCheck = await request(`/sessions/${sessionId}/check-in`, {
    method: 'POST', token: tutor.token, body: { token: second.data.token },
  });
  if (tutorCheck.status !== 200) throw new Error(tutorCheck.data.error || 'tutor check-in failed');

  const wrapped = await request(`/sessions/${sessionId}/wrap-up`, {
    method: 'POST', token: tutor.token, body: { notes: 'Staged demo session — attendance verified.', rating: 5 },
  });
  if (wrapped.status !== 200) throw new Error(wrapped.data.error || 'wrap-up failed');
}
