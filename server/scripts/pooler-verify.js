/* Verify the DATABASE_URL from .env exactly, printing the raw PG error. */
import 'dotenv/config';
import pg from 'pg';

const c = new pg.Client({
  connectionString: process.env.DATABASE_URL.replace(/^postgresql:/, 'postgres:'),
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 6000,
});
const t0 = Date.now();
try {
  await c.connect();
  console.log('CONNECTED in', Date.now() - t0, 'ms');
  const { rows } = await c.query('select current_database(), current_user');
  console.log(rows[0]);
  await c.end();
} catch (e) {
  await c.end().catch(() => {});
  console.log('FAILED after', Date.now() - t0, 'ms —', e.code ?? '', e.message);
  process.exit(1);
}
