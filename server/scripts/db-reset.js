/* db:reset → drop schema public, reapply schema.sql, migrations, seed.sql.
 * Usage: npm run db:reset */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import pg from 'pg';
import { ensurePostgres, stopEmbeddedPostgres } from '../pg-embed.js';

/* The force-stopped postmaster makes in-flight sockets emit ECONNRESET /
 * "Connection terminated unexpectedly" AFTER the work is done — treat that
 * post-completion noise as success, surface anything else. */
process.on('uncaughtException', (err) => {
  if (/ECONNRESET|Connection terminated unexpectedly|EPIPE/i.test(String(err?.message ?? err))) process.exit(0);
  console.error(err);
  process.exit(1);
});

const here = path.dirname(url.fileURLToPath(import.meta.url));
const dbDir = path.resolve(here, '..', '..', 'db');

function read(file) {
  const full = path.join(dbDir, file);
  return fs.readFileSync(full, 'utf8');
}

async function main() {
  await ensurePostgres();
  const url = new URL(process.env.DATABASE_URL);
  const local = /^(localhost|127\.0\.0\.1|::1)$/.test(url.hostname);
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
  await pool.end();
  await stopEmbeddedPostgres(); // one-shot script: never outlive the postmaster
}

function quoteIdent(name) { return `"${name.replace(/"/g, '""')}"`; }

main().catch(e => { console.error(e); process.exit(1); });
