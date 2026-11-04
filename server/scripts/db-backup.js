/*
 * Plain SQL backup. Uses pg_dump from PATH or PG_DUMP. Produces a portable
 * plain-text dump in backups/ (gitignored) that can be restored with psql.
 *
 *   npm run db:backup
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const raw = process.env.DATABASE_URL;
if (!raw) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const url = new URL(raw);
const database = decodeURIComponent(url.pathname.replace(/^\//, '')) || 'postgres';
const host = url.hostname;
const port = url.port || '5432';
const user = decodeURIComponent(url.username || 'postgres');
const password = decodeURIComponent(url.password || '');
const local = ['localhost', '127.0.0.1', '::1'].includes(host);

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const dir = path.resolve('backups');
fs.mkdirSync(dir, { recursive: true });
const target = path.join(dir, `lccb-academix-${stamp}.sql`);

const dump = process.env.PG_DUMP || 'pg_dump';
const args = [
  '--no-owner',
  '--no-privileges',
  '--format=plain',
  `--host=${host}`,
  `--port=${port}`,
  `--username=${user}`,
  `--file=${target}`,
  database,
];

console.log(`Backing up ${local ? 'local' : 'remote'} database ${database}@${host}:${port} ...`);
const result = spawnSync(dump, args, {
  stdio: ['ignore', 'inherit', 'inherit'],
  env: { ...process.env, PGPASSWORD: password },
  shell: process.platform === 'win32',
});

if (result.error || result.status !== 0) {
  if (result.error?.code === 'ENOENT') {
    console.error('pg_dump was not found. Install PostgreSQL client tools or set PG_DUMP to the full path.');
  } else {
    console.error(`pg_dump failed (${result.status ?? result.error?.message}).`);
  }
  fs.rmSync(target, { force: true });
  process.exit(1);
}

const bytes = fs.statSync(target).size;
console.log(`Wrote ${target} (${(bytes / 1024).toFixed(1)} KB).`);
console.log('Restore with: psql "$DATABASE_URL" < ' + path.relative(process.cwd(), target));
