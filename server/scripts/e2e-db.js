/* Shared direct-SQL target for the local API e2e scripts.
 *
 * These scripts drive the API on localhost, so their SQL fixtures must come
 * from the same database. .env is deliberately not read here: it may point at
 * hosted Supabase, which must never be mixed with local test writes.
 * Override with E2E_DATABASE_URL (preferred) or DATABASE_URL.
 *
 * Non-local targets are refused outright: these tests create applications,
 * referrals and sessions, and one of them probes destructive statements.
 */
const FALLBACK_URL = 'postgres://postgres:postgres@localhost:5432/lccb_academix';

export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ||
  process.env.DATABASE_URL ||
  FALLBACK_URL;

const host = (() => {
  try { return new URL(E2E_DATABASE_URL).hostname; } catch { return ''; }
})();

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
if (!LOCAL_HOSTS.has(host)) {
  throw new Error(
    `Refusing direct SQL against "${host || 'unknown host'}": API e2e scripts are local-only. ` +
    'Set E2E_DATABASE_URL to the scratch database on localhost.',
  );
}
