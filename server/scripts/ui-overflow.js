/* Mobile-first layout & overflow gate (Playwright).
 *
 * Loads every role's screens at 320, 360, 390, 412, 768 portrait and 915x412
 * landscape against a running server serving `dist/` (npm run build && npm run server).
 * Fails if any viewport has horizontal overflow (scrollWidth > clientWidth).
 * Saves screenshots to ui-shots/<UI_SHOTS_TAG|latest>/ (gitignored), plus one
 * forced-.dark screenshot per key screen.
 *
 * Usage:
 *   npm run test:ui
 *   UI_BASE_URL=http://127.0.0.1:4000 UI_SHOTS_TAG=baseline npm run test:ui
 *   UI_ALLOW_OVERFLOW=1 UI_SHOTS_TAG=baseline npm run test:ui   (audit mode) */

import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const BASE = (process.env.UI_BASE_URL || 'http://127.0.0.1:4000').replace(/\/+$/, '');
const TAG = process.env.UI_SHOTS_TAG || 'latest';
const ALLOW_OVERFLOW = process.env.UI_ALLOW_OVERFLOW === '1';
const PASSWORD = process.env.DEMO_PASSWORD || 'demo1234';
const SHOT_DIR = path.resolve(process.cwd(), 'ui-shots', TAG);

const VIEWPORTS = [
  { name: '320', width: 320, height: 640 },
  { name: '360', width: 360, height: 740 },
  { name: '390', width: 390, height: 844 },
  { name: '412', width: 412, height: 915 },
  { name: '768', width: 768, height: 1024 },
  { name: '412-land', width: 915, height: 412 },
];

const KEY_ROUTES = new Set(['learner:/wizard', 'learner:/dashboard', 'applicant:/tutor-pending', 'learner:/exam']);

const ROLE_PLANS = [
  {
    key: 'learner',
    loginId: 'TE-128',
    routes: ['/dashboard', '/wizard', '/my-tutors', '/exam', '/checkin', '/rewards', '/messages', '/tasks'],
  },
  {
    key: 'applicant',
    loginIds: ['24-0870-131', '25-0870-142', '25-0870-155', '25-0870-168'],
    routes: ['/tutor-pending'],
  },
  {
    key: 'tutor',
    loginId: 'TU-042',
    routes: ['/dashboard', '/checkin', '/messages', '/tasks'],
  },
  {
    key: 'faculty',
    loginId: 'b.tisuela@lccbacolod.edu.ph',
    routes: ['/dashboard', '/referral'],
  },
  {
    key: 'superadmin',
    loginId: 'l.betita.admin@lccbacolod.edu.ph',
    routes: ['/dashboard', '/approvals'],
  },
];

async function launchBrowser() {
  for (const channel of ['chrome', 'msedge', undefined]) {
    try {
      return await chromium.launch({ headless: true, ...(channel ? { channel } : {}) });
    } catch { /* try next */ }
  }
  throw new Error('No Chromium/Chrome browser available for Playwright');
}

async function loginContext(browser, rolePlan) {
  const candidates = rolePlan.loginIds ?? [rolePlan.loginId];
  for (const loginId of candidates) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const res = await context.request.post(`${BASE}/api/auth/login`, {
      data: { loginId, password: PASSWORD },
    });
    if (res.status() !== 200) {
      await context.close();
      continue;
    }
    if (rolePlan.key === 'applicant') {
      const mine = await context.request.get(`${BASE}/api/accreditation/mine`);
      const body = await mine.json().catch(() => ({}));
      if (!body.application || body.application.status !== 'pending') {
        await context.close();
        continue;
      }
    }
    return { context, loginId };
  }
  return null;
}

async function checkOverflow(page) {
  return page.evaluate(() => {
    const doc = document.documentElement;
    const sw = doc.scrollWidth;
    const cw = doc.clientWidth;
    const offenders = [];
    if (sw > cw) {
      const all = document.querySelectorAll('*');
      for (const el of all) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.right > cw + 1) {
          const id = el.id ? `#${el.id}` : '';
          const cls = typeof el.className === 'string' && el.className.trim()
            ? `.${el.className.trim().split(/\s+/).slice(0, 3).join('.')}`
            : '';
          offenders.push({
            tag: `${el.tagName.toLowerCase()}${id}${cls}`,
            right: Math.round(r.right),
            over: Math.round(r.right - cw),
            text: (el.textContent || '').trim().slice(0, 40),
          });
          if (offenders.length >= 6) break;
        }
      }
    }
    return { scrollWidth: sw, clientWidth: cw, overflow: sw - cw, offenders };
  });
}

fs.mkdirSync(SHOT_DIR, { recursive: true });

// Preflight server check
const health = await fetch(`${BASE}/api/health`).catch((e) => ({ ok: false, error: e.message }));
if (!health.ok) {
  console.error(`Server unreachable at ${BASE}/api/health — start the server after npm run build.`);
  process.exit(1);
}

const browser = await launchBrowser();
const failures = [];
let checks = 0;

try {
  // Public login screen first
  const pubCtx = await browser.newContext({ viewport: { width: 360, height: 740 } });
  const pubPage = await pubCtx.newPage();
  await pubPage.addInitScript(() => sessionStorage.setItem('academix-splash-seen', '1'));
  for (const vp of VIEWPORTS) {
    await pubPage.setViewportSize({ width: vp.width, height: vp.height });
    await pubPage.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    await pubPage.waitForTimeout(250);
    const res = await checkOverflow(pubPage);
    checks += 1;
    if (res.overflow > 0) {
      failures.push({ screen: 'public:/', viewport: vp.name, ...res });
      console.log(`✗ public / @ ${vp.name} — overflow +${res.overflow}px (${res.offenders.map((o) => `${o.tag} +${o.over}px`).join(', ')})`);
    }
  }
  await pubCtx.close();

  for (const plan of ROLE_PLANS) {
    const auth = await loginContext(browser, plan);
    if (!auth) {
      console.log(`! skipped ${plan.key} (no matching demo account)`);
      continue;
    }
    const { context, loginId } = auth;
    const page = await context.newPage();
    await page.addInitScript(() => sessionStorage.setItem('academix-splash-seen', '1'));
    console.log(`\n[${plan.key}] ${loginId}`);

    for (const route of plan.routes) {
      const routeId = `${plan.key}:${route}`;
      const isKey = KEY_ROUTES.has(routeId);
      const slug = `${plan.key}_${route.replace(/^\//, '').replace(/\//g, '_') || 'home'}`;

      for (const vp of VIEWPORTS) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(300);

        const res = await checkOverflow(page);
        checks += 1;
        if (res.overflow > 0) {
          failures.push({ screen: routeId, viewport: vp.name, ...res });
          console.log(`  ✗ ${route} @ ${vp.name} — overflow +${res.overflow}px (${res.offenders.map((o) => `${o.tag} +${o.over}px`).join(', ')})`);
        } else {
          console.log(`  ✓ ${route} @ ${vp.name}`);
        }

        if (isKey) {
          await page.screenshot({ path: path.join(SHOT_DIR, `${slug}_${vp.name}.png`), fullPage: false });
        }
      }

      if (isKey) {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.evaluate(() => document.documentElement.classList.add('dark'));
        await page.waitForTimeout(150);
        await page.screenshot({ path: path.join(SHOT_DIR, `${slug}_390_dark.png`), fullPage: false });
        await page.evaluate(() => document.documentElement.classList.remove('dark'));
      }
    }

    await context.close();
  }
} finally {
  await browser.close();
}

console.log(`\nChecked ${checks} viewport renders. Overflows: ${failures.length}. Shots: ${SHOT_DIR}`);
if (failures.length > 0 && !ALLOW_OVERFLOW) {
  process.exit(1);
}
