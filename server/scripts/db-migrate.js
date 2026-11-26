/* npm run db:migrate — apply pending numbered migrations from db/migrations.
 *
 * Works against the embedded local cluster (boots if needed) and against a
 * hosted database (e.g. Supabase, SSL). Migration files carry their own
 * BEGIN/COMMIT, so each runs as one unit; the filename is recorded in
 * schema_migrations afterwards. db:reset embeds this DDL in schema.sql and
 * pre-marks the files, so a fresh reset has nothing left to migrate. */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import pg from 'pg';
import { ensurePostgres, stopEmbeddedPostgres } from '../pg-embed.js';

const here = path.dirname(url.fileURLToPath(import.meta.url));
const dbDir = path.resolve(here, '..', '..', 'db');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL missing. Copy .env.example to .env first.');
  process.exit(1);
}

const parsed = new URL(process.env.DATABASE_URL);
const local = /^(localhost|127\.0\.0\.1|::1)$/.test(parsed.hostname);
if (local) await ensurePostgres();

const ssl = local ? undefined : { rejectUnauthorized: false };
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ...(ssl ? { ssl } : {}) });

try {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    filename text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`);

  const files = fs.readdirSync(path.join(dbDir, 'migrations')).filter((f) => f.endsWith('.sql')).sort();
  const applied = new Set((await pool.query('SELECT filename FROM schema_migrations')).rows.map((r) => r.filename));
  let changed = 0;

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`• ${file} — already applied`);
      continue;
    }
    process.stdout.write(`• ${file} ... `);
    try {
      const sql = fs.readFileSync(path.join(dbDir, 'migrations', file), 'utf8');
      // PostgreSQL forbids referencing a newly added enum value in the same
      // implicit multi-statement transaction; execute leading ALTER TYPE
      // statements individually so they commit before the migration body runs.
      const beginIdx = sql.search(/^\s*BEGIN\s*;/im);
      if (beginIdx > 0 && /ALTER\s+TYPE\b[\s\S]*?\bADD\s+VALUE\b/i.test(sql.slice(0, beginIdx))) {
        const preamble = sql.slice(0, beginIdx);
        const body = sql.slice(beginIdx);
        for (const stmt of preamble.split(';')) {
          const clean = stmt.replace(/--[^\r\n]*/g, '').trim();
          if (clean) await pool.query(clean);
        }
        await pool.query(body);
      } else {
        await pool.query(sql);
      }
      await pool.query(
        'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING',
        [file],
      );
      changed += 1;
      console.log('applied');
    } catch (e) {
      console.log('FAILED');
      console.error(e.message);
      process.exitCode = 1;
      break;
    }
  }

  console.log(changed ? `\n${changed} migration(s) applied.` : '\nNothing to migrate — schema is current.');
} finally {
  await pool.end();
  if (local) await stopEmbeddedPostgres();
}
