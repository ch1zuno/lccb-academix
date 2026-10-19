import 'dotenv/config';
import pg from 'pg';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL missing. Copy .env.example to .env first.');
  process.exit(1);
}

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

export async function query(text, params = []) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const ms = Date.now() - start;
  if (process.env.SQL_DEBUG === '1') console.log('SQL', `${res.rowCount} rows`, `${ms}ms`, text.split('\n')[0].slice(0, 90));
  return res;
}

/** Run `fn` inside a single transaction; rolls back and rethrows on failure. */
export async function withTransaction(fn) {
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
