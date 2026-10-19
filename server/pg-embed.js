/* Boots an embedded Postgres (data dir .pgdata/) when the configured
 * DATABASE_URL (localhost only) is not reachable. No system Postgres needed. */
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import pgPkg from 'pg';
import EmbeddedPostgres from 'embedded-postgres';

const root = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const DATA_DIR = path.join(root, '.pgdata');

function urlParts() {
  const u = new URL(process.env.DATABASE_URL);
  return {
    host: u.hostname,
    port: +(u.port || 5432),
    user: u.username || 'postgres',
    password: decodeURIComponent(u.password || 'postgres'),
    database: u.pathname.replace('/', '') || 'postgres',
  };
}

export async function postgisReachable() {
  const { host, port, user, password, database } = urlParts();
  const c = new pgPkg.Client({ host, port, user, password, database, connectionTimeoutMillis: 2000 });
  try { await c.connect(); await c.end(); return true; }
  catch (e) {
    await c.end().catch(() => {});
    e.localPgHandled = /econnrefused|does not exist|20p000/i.test(e.message) || host === 'localhost' || host === '127.0.0.1';
    e.remote = !/econnrefused|authentication/i.test(e.message) && host !== 'localhost' && host !== '127.0.0.1';
    throw e;
  }
}

let booting;
let runningPg; // EmbeddedPostgres instance this process booted (null if reused an existing server)

/** Start embedded postgres if the local URL is unreachable; resolve true if booted. */
export function ensurePostgres() {
  if (booting) return booting;
  booting = (async () => {
    try { await postgisReachable(); return false; }
    catch (err) {
      if (err.remote) throw err;
      const { port, user, password } = urlParts();
      const pg = new EmbeddedPostgres({
        databaseDir: DATA_DIR,
        user, password, port,
        persistent: true,
        initdbFlags: ['-E', 'UTF8', '--locale=C'], // UTF8 for emoji/data in seed.sql
      });
      runningPg = pg;
      let started = false;
      try { await pg.start(); started = true; }
      catch { /* cluster not initialised yet */ }
      if (!started) {
        await pg.initialise();
        await pg.start();
      }
      const dbName = urlParts().database;
      if (dbName && dbName !== 'postgres') {
        const probe = new pgPkg.Client({ host: 'localhost', port, user, password, database: 'postgres' });
        try { await probe.connect(); await pg.createDatabase(dbName).catch(() => {}); await probe.end(); }
        catch { await probe.end().catch(() => {}); }
      }
      console.log(`▸ embedded postgres running on localhost:${port} (data: ${DATA_DIR})`);
      return true;
    }
  })();
  booting.catch(() => { booting = undefined; });
  return booting;
}

/** Stop the embedded server this process booted. One-shot scripts call this on
 * finish so the postmaster never outlives its parent (Windows keeps it attached).
 * pg.stop() can hang forever on Windows when a postgres io_worker forkchild
 * refuses to exit — race it with a short timeout, then force-kill the
 * postmaster tree listening on our port. */
export async function stopEmbeddedPostgres() {
  if (!runningPg) return;
  const pg = runningPg;
  const { port } = urlParts();
  runningPg = null;

  let stoppedCleanly = false;
  try {
    await Promise.race([
      pg.stop().then(() => { stoppedCleanly = true; }).catch(() => {}),
      new Promise((_, reject) => setTimeout(() => reject(new Error('pg.stop() timed out')), 6000)),
    ]);
  } catch { /* fall through to force-kill */ }
  if (stoppedCleanly) return;

  try {
    const { spawnSync } = await import('node:child_process');
    const out = spawnSync('powershell', ['-NoProfile', '-Command',
      `Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { taskkill /T /F /PID $_ }`],
      { encoding: 'utf8', timeout: 10000 });
    if (out.status !== 0) console.warn(`▸ could not force-stop embedded postgres: ${(out.stderr || '').trim()}`);
  } catch { /* best effort — next boot recovers via WAL replay */ }
}
