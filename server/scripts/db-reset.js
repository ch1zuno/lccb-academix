/* db:reset → drop schema public, reapply schema.sql, migrations, seed.sql.
 * Usage: npm run db:reset */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import pg from 'pg';
import { ensurePostgres, stopEmbeddedPostgres } from '../pg-embed.js';

/* The force-stopped postmaster makes in-flight sockets emit ECONNRESET /
 * "Connection terminated unexpectedly" during cleanup. Ignore that noise while
 * we are shutting Postgres down; surface anything else. */
let cleaningUp = false;
function onFatal(err) {
  const text = String(err?.message ?? err);
  if (cleaningUp && /ECONNRESET|Connection terminated unexpectedly|EPIPE/i.test(text)) return;
  console.error(err);
  process.exit(1);
}
process.on('uncaughtException', onFatal);
process.on('unhandledRejection', onFatal);

const here = path.dirname(url.fileURLToPath(import.meta.url));
const dbDir = path.resolve(here, '..', '..', 'db');

function read(file) {
  const full = path.join(dbDir, file);
  return fs.readFileSync(full, 'utf8');
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL missing — refusing to reset an unknown database.');
    process.exit(1);
  }
  const url = new URL(process.env.DATABASE_URL);
  const local = /^(localhost|127\.0\.0\.1|::1)$/.test(url.hostname);
  if (!local && process.env.ALLOW_REMOTE_DB_RESET !== '1') {
    console.error(`Refusing to reset non-local database "${url.hostname}".`);
    console.error('Set ALLOW_REMOTE_DB_RESET=1 only for a disposable database, never for hosted Supabase.');
    process.exit(1);
  }
  await ensurePostgres();
  const ssl = local ? undefined : { rejectUnauthorized: false }; // remote providers (e.g. Supabase) enforce SSL
  const admin = new pg.Client({
    host: url.hostname,
    port: url.port || 5432,
    user: url.username,
    password: decodeURIComponent(url.password),
    database: 'postgres',
    ...(ssl ? { ssl } : {}),
  });
  const dbName = url.pathname.replace('/', '');
  await admin.connect();
  await admin.query(`CREATE DATABASE ${quoteIdent(dbName)}`).catch(() => { /* already exists */ });
  await admin.end();

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ...(ssl ? { ssl } : {}) });
  // The postmaster is force-stopped at the end; idle sockets can report a reset
  // after the reset has already succeeded. Keep that expected noise off-screen.
  pool.on('error', () => { if (!cleaningUp) console.error('Database connection error during reset.'); });
  const run = async (sql, label) => {
    process.stdout.write(`• ${label} ... `);
    try { await pool.query(sql); console.log('ok'); }
    catch (e) { console.log(`FAILED\n${e.message}`); process.exit(1); }
  };

  process.stdout.write('• dropping schema public ... ');
  await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  console.log('ok');

  await run(read('schema.sql'), 'schema');
  // schema.sql embeds the migrations' DDL (kept in sync); mark them applied so
  // the app never re-runs them against a freshly reset database.
  const migrations = fs.readdirSync(path.join(dbDir, 'migrations')).filter(f => f.endsWith('.sql')).sort();
  if (migrations.length) {
    const marks = migrations.map((_, i) => `($${i + 1})`).join(',');
    await pool.query(`INSERT INTO schema_migrations (filename) VALUES ${marks} ON CONFLICT DO NOTHING`, migrations)
      .catch(() => { /* older schema without schema_migrations */ });
  }
  await run(read('seed.sql'), 'seed');

  const { rows: [{ count }] } = await pool.query('SELECT count(*) FROM users');
  console.log(`\nReset complete — ${count} users, database "${dbName}".`);
  // This is a one-shot command: don't let a closing pool or the embedded
  // postmaster keep the terminal waiting. Close the pool with a short cap, then
  // wait for the postmaster to actually stop before exiting; otherwise Windows
  // can leave shared memory behind and the next API boot fails.
  cleaningUp = true;
  await Promise.race([
    pool.end().catch(() => {}),
    new Promise((resolve) => setTimeout(resolve, 3000)),
  ]);
  await stopEmbeddedPostgres();
  await new Promise((resolve) => setTimeout(resolve, 500));
  process.exit(0);
}

function quoteIdent(name) { return `"${name.replace(/"/g, '""')}"`; }

main().catch(e => { console.error(e); process.exit(1); });
