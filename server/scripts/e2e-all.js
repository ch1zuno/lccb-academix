/* Runs every e2e script in order; fails fast reporting which one broke. */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const scripts = [
  'e2e-referrals.js',
  'e2e-matching.js',
  'e2e-checkin.js',
  'e2e-wrapup.js',
  'e2e-rewards.js',
  'e2e-accreditation.js',
  'e2e-analytics.js',
];

let failed = 0;
for (const s of scripts) {
  console.log(`\n━━━ ${s} ━━━`);
  const r = spawnSync(process.execPath, [path.join(here, s)], { stdio: 'inherit' });
  if (r.status !== 0) {
    failed++;
    console.log(`✗ FAILED: ${s}`);
  }
}
console.log(failed ? `\n${failed}/${scripts.length} script(s) FAILED` : `\nALL ${scripts.length} E2E GREEN ✅`);
process.exit(failed);
