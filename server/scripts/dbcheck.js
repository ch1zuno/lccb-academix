/* Quick DB inspection helper. Boots the embedded Postgres if it isn't running. */
import 'dotenv/config';
import pg from 'pg';
import { ensurePostgres, stopEmbeddedPostgres } from '../pg-embed.js';

await ensurePostgres();
const c = new pg.Client({ connectionString: process.env.DATABASE_URL });
await c.connect();
const { rows } = await c.query(`SELECT role, department, program, count(*)::int AS n FROM users GROUP BY role, department, program ORDER BY role, n DESC LIMIT 20`);
console.table(rows);
await c.end();
/* One-shot script — if we booted the postmaster ourselves, stop it again. */
await stopEmbeddedPostgres();
