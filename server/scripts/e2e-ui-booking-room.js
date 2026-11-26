/* Playwright UI E2E:
 * 1. Wizard 6-question pass-through prefill -> picks tutor -> chooses Online Mode ->
 *    lands on compact Details screen with collapsed editable summary rows (Course, Topic, Language),
 *    survives reload via sessionStorage, and has 0 horizontal overflow at 360px.
 * 2. Dedicated /session/:id room page: no sidebar, tutor End session confirmation dialog has exact copy
 *    "Are you sure you want to end this session?" with default focus on Cancel, and duplicate tab guard
 *    blocks second tab with "You are already in this session in another tab".
 */
import { chromium } from 'playwright';

const BASE = (process.env.UI_BASE_URL || 'http://127.0.0.1:4000').replace(/\/+$/, '');
const PASSWORD = process.env.DEMO_PASSWORD || 'demo1234';
const assert = (ok, msg) => { if (!ok) throw new Error(msg); };

async function launchBrowser() {
  for (const channel of ['chrome', 'msedge', undefined]) {
    try {
      return await chromium.launch({ headless: true, ...(channel ? { channel } : {}) });
    } catch { /* try next */ }
  }
  throw new Error('No Chromium/Chrome browser available');
}

async function createAuthedContext(browser, loginId, viewport = { width: 360, height: 740 }) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  const res = await context.request.post(`${BASE}/api/auth/login`, {
    data: { loginId, password: PASSWORD },
  });
  assert(res.status() === 200, `login ${loginId} failed: ${res.status()}`);
  const body = await res.json();
  const payload = JSON.stringify({ user: body.user, expiresAt: body.sessionExpiresAt || Date.now() + 86_400_000 });
  await context.addInitScript((val) => {
    localStorage.setItem('academix-user', val);
    sessionStorage.setItem('academix-splash-seen', '1');
  }, payload);
  return { context, token: body.token, user: body.user };
}

const browser = await launchBrowser();

try {
  // ── 1. Wizard prefill pass-through -> 3-step booking Details screen ──
  const { context: learnerCtx, token: learnerToken } = await createAuthedContext(browser, 'TE-128', { width: 360, height: 740 });
  const page = await learnerCtx.newPage();
  await page.goto(`${BASE}/wizard`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#wizard-question-title', { timeout: 10000 });

  // Answer all 6 wizard steps quickly
  await page.getByRole('radio', { name: /Prepare for exams/i }).click();
  await page.getByRole('button', { name: /^Next$/i }).click();
  await page.getByRole('radio', { name: /This week/i }).click();
  await page.getByRole('button', { name: /^Next$/i }).click();
  await page.getByRole('radio', { name: /^PROG 201$/i }).click();
  await page.getByRole('button', { name: /^Next$/i }).click();
  await page.getByRole('radio', { name: /I know the basics/i }).click();
  await page.getByRole('button', { name: /^Next$/i }).click();
  await page.getByRole('radio', { name: /^English/i }).click();
  await page.getByRole('button', { name: /^Next$/i }).click();
  await page.getByRole('radio', { name: /Mon morning/i }).click();
  await page.getByRole('button', { name: /Find matches/i }).click();

  // Wait for matches and click Book / Request session on first tutor
  const bookBtn = page.getByRole('button', { name: /Book|Request session/i }).first();
  await bookBtn.waitFor({ state: 'visible', timeout: 15000 });
  await bookBtn.click();

  // Step 1 of 3: Mode (nothing preselected)
  await page.getByText(/Step 1 of 3/i).waitFor({ state: 'visible', timeout: 10000 });
  const onlineRadio = page.getByRole('radio', { name: /Online/i });
  assert((await onlineRadio.getAttribute('aria-checked')) === 'false', 'Online mode must not be preselected');
  await onlineRadio.click();
  await page.getByRole('button', { name: /Continue to details/i }).click();

  // Step 2 of 3: Details screen with prefilled editable summary rows
  await page.getByText(/Step 2 of 3/i).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText(/Prefilled from your matches/i).waitFor({ state: 'visible', timeout: 5000 });
  await page.getByText(/PROG 201/i).first().waitFor({ state: 'visible' });
  await page.getByText(/Exam & Quiz Prep/i).first().waitFor({ state: 'visible' });
  await page.getByRole('button', { name: /Edit course/i }).waitFor({ state: 'visible' });

  // Zero horizontal overflow at 360px on Details screen
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert(overflow <= 0, `3-step Details screen overflowed by +${overflow}px at 360px`);

  // Refresh preserves draft via sessionStorage
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByText(/Step 2 of 3/i).waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText(/PROG 201/i).first().waitFor({ state: 'visible' });
  console.log('✓ Wizard prefill pass-through, 3-step Details progressive disclosure, reload persistence, and 360px fit verified');

  // ── 2. Dedicated /session/:id room page: ConfirmDialog + duplicate tab guard ──
  const { context: tutorCtx, token: tutorToken } = await createAuthedContext(browser, 'TU-042', { width: 1024, height: 768 });

  // Stage an in-progress online session via API for UI room verification
  const subjRes = await tutorCtx.request.get(`${BASE}/api/subjects`, { headers: { Authorization: `Bearer ${tutorToken}` } });
  const prog201 = (await subjRes.json()).subjects.find((s) => s.code === 'PROG 201');
  const today = new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10);
  const reqRes = await learnerCtx.request.post(`${BASE}/api/session-requests`, {
    headers: { Authorization: `Bearer ${learnerToken}` },
    data: { tutorId: 'TU-042', subjectId: prog201.id, topic: 'Room UI Check', preferredDate: today, preferredTime: '4:00 PM', mode: 'online', language: 'English', durationHours: 0.5 },
  });
  let sessionId = null;
  if (reqRes.status() === 201) {
    const reqId = (await reqRes.json()).request.id;
    const accRes = await tutorCtx.request.post(`${BASE}/api/session-requests/${reqId}/accept`, {
      headers: { Authorization: `Bearer ${tutorToken}` },
    });
    if (accRes.status() === 201) {
      sessionId = (await accRes.json()).session.id;
      const st1 = await (await tutorCtx.request.post(`${BASE}/api/sessions/${sessionId}/stage-token`, {
        headers: { Authorization: `Bearer ${tutorToken}` }, data: { method: 'otp' },
      })).json();
      await learnerCtx.request.post(`${BASE}/api/sessions/${sessionId}/check-in`, {
        headers: { Authorization: `Bearer ${learnerToken}` }, data: { token: st1.token, method: 'otp' },
      });
      const st2 = await (await tutorCtx.request.post(`${BASE}/api/sessions/${sessionId}/stage-token`, {
        headers: { Authorization: `Bearer ${tutorToken}` }, data: { method: 'otp' },
      })).json();
      await tutorCtx.request.post(`${BASE}/api/sessions/${sessionId}/check-in`, {
        headers: { Authorization: `Bearer ${tutorToken}` }, data: { token: st2.token, method: 'otp' },
      });
    }
  }
  assert(Boolean(sessionId), 'could not stage in-progress session for room UI check');

  const roomTab1 = await tutorCtx.newPage();
  await roomTab1.goto(`${BASE}/session/${sessionId}`, { waitUntil: 'networkidle' });
  await roomTab1.waitForSelector('button:has-text("End session")', { timeout: 10000 });

  // No sidebar on dedicated room route
  const asideCount = await roomTab1.locator('aside').count();
  assert(asideCount === 0, `dedicated /session/:id must have no sidebar, found ${asideCount}`);

  // Confirm dialog exact copy + Cancel default focus
  await roomTab1.getByRole('button', { name: /^End session$/i }).click();
  await roomTab1.getByText('Are you sure you want to end this session?').waitFor({ state: 'visible', timeout: 5000 });
  await roomTab1.waitForTimeout(80);
  const focusedText = await roomTab1.evaluate(() => document.activeElement?.textContent?.trim() || '');
  assert(focusedText === 'Cancel', `default focus in End dialog must be Cancel, got "${focusedText}"`);
  await roomTab1.getByRole('button', { name: /^Cancel$/i }).click();

  // Duplicate tab guard
  const roomTab2 = await tutorCtx.newPage();
  await roomTab2.goto(`${BASE}/session/${sessionId}`, { waitUntil: 'networkidle' });
  await roomTab2.getByText('You are already in this session in another tab').waitFor({ state: 'visible', timeout: 5000 });
  await roomTab2.close();

  // Student sees Leave (not End session)
  const studentRoom = await learnerCtx.newPage();
  await studentRoom.goto(`${BASE}/session/${sessionId}`, { waitUntil: 'networkidle' });
  await studentRoom.getByRole('button', { name: /^Leave$/i }).waitFor({ state: 'visible', timeout: 10000 });
  const endBtnsForStudent = await studentRoom.getByRole('button', { name: /^End session$/i }).count();
  assert(endBtnsForStudent === 0, 'student must not see End session button');

  // Clean up: tutor ends session via API
  await tutorCtx.request.post(`${BASE}/api/sessions/${sessionId}/end`, {
    headers: { Authorization: `Bearer ${tutorToken}` },
  });
  await roomTab1.close();
  await studentRoom.close();
  await tutorCtx.close();
  await learnerCtx.close();
  console.log('✓ Dedicated /session/:id room, ConfirmDialog focus/copy, student Leave button, and duplicate-tab guard verified');
} finally {
  await browser.close();
}
