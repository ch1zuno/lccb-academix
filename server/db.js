import 'dotenv/config';
import pg from 'pg';

const databaseUrl = process.env.DATABASE_URL;
const missingUrl = !databaseUrl;

const isLocal = !missingUrl && /^(localhost|127\.0\.0\.1|::1)$/.test(new URL(databaseUrl).hostname);

/* Pool is null when DATABASE_URL is absent: the API still boots (so the
 * /api/health endpoint can explain the misconfiguration instead of dying at
 * import time with an opaque 500 — the failure mode that hid the missing
 * Vercel environment variables). Queries reject with a 503 instead. */
export const pool = missingUrl ? null : new pg.Pool({
  connectionString: databaseUrl,
  // Remote hosts (e.g. Supabase) require SSL; localhost stays unencrypted.
  ...(isLocal ? {} : { ssl: { rejectUnauthorized: false } }),
  // Serverless-safe: every warm Vercel instance keeps a small pool, so stay
  // well inside the hosted session-pooler budget.
  max: Number(process.env.PG_POOL_MAX) || 3,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 8_000,
  statement_timeout: 8_000, // server-side cap per statement (ms)
  query_timeout: 8_000, // client-side cap per query (ms)
});

const missingUrlError = () => Object.assign(
  new Error('DATABASE_URL missing — set it in the environment.'),
  { status: 503 },
);

export async function query(text, params = []) {
  if (!pool) throw missingUrlError();
  const start = Date.now();
  const res = await pool.query(text, params);
  const ms = Date.now() - start;
  if (process.env.SQL_DEBUG === '1') console.log('SQL', `${res.rowCount} rows`, `${ms}ms`, text.split('\n')[0].slice(0, 90));
  return res;
}

/** Run `fn` inside a single transaction; rolls back and rethrows on failure. */
export async function withTransaction(fn) {
  if (!pool) throw missingUrlError();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
