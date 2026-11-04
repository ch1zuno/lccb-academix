/*
 * Retention purge. Dry-run by default; refuses to touch a remote database
 * unless ALLOW_HOSTED_PURGE=1 is explicitly set.
 *
 *   npm run db:purge                  # show what would be deleted
 *   npm run db:purge -- --apply       # delete local rows
 *   ALLOW_HOSTED_PURGE=1 npm run db:purge -- --apply
 *
 * Policy: uploaded supporting documents for decided applications are kept for
 * RETENTION_DAYS (default 365), then deleted. Read notifications older than
 * NOTIFICATION_DAYS (default 365). Ledger rows, audit rows, sessions, and
 * referral/accreditation decisions are never deleted by this script.
 */
import 'dotenv/config';
import pg from 'pg';

const apply = process.argv.includes('--apply');
const days = Math.max(30, Number(process.env.RETENTION_DAYS) || 365);
const notificationDays = Math.max(30, Number(process.env.NOTIFICATION_DAYS) || 365);
const raw = process.env.DATABASE_URL;
if (!raw) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}
const host = new URL(raw).hostname;
const local = ['localhost', '127.0.0.1', '::1'].includes(host);
if (!local && process.env.ALLOW_HOSTED_PURGE !== '1') {
  console.error(`Refusing to purge ${host}. Set ALLOW_HOSTED_PURGE=1 only after a verified backup.`);
  process.exit(1);
}

const client = new pg.Client({ connectionString: raw });
await client.connect();
try {
  const docs = await client.query(
    `SELECT d.id, d.file_name, d.size_bytes
       FROM application_documents d JOIN tutor_applications a ON a.id = d.application_id
      WHERE a.status IN ('approved', 'rejected')
        AND COALESCE(a.updated_at, a.created_at) < now() - ($1 || ' days')::interval`,
    [days],
  );
  const notes = await client.query(
    `SELECT count(*)::int AS n FROM notifications
      WHERE created_at < now() - ($1 || ' days')::interval`,
    [notificationDays],
  );
  const bytes = docs.rows.reduce((sum, row) => sum + Number(row.size_bytes || 0), 0);
  console.log(`Retention ${days} days; notifications ${notificationDays} days.`);
  console.log(`Documents: ${docs.rows.length} rows, ${(bytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Notifications: ${notes.rows[0].n} rows`);

  if (!apply) {
    console.log('Dry run only. Re-run with --apply to delete.');
    process.exitCode = 0;
  } else {
    await client.query('BEGIN');
    const deletedDocs = await client.query(
      `DELETE FROM application_documents d
        USING tutor_applications a
        WHERE d.application_id = a.id
          AND a.status IN ('approved', 'rejected')
          AND COALESCE(a.updated_at, a.created_at) < now() - ($1 || ' days')::interval`,
      [days],
    );
    const deletedNotes = await client.query(
      `DELETE FROM notifications WHERE created_at < now() - ($1 || ' days')::interval`,
      [notificationDays],
    );
    await client.query('COMMIT');
    console.log(`Deleted ${deletedDocs.rowCount} documents and ${deletedNotes.rowCount} notifications.`);
  }
} catch (error) {
  await client.query('ROLLBACK').catch(() => {});
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
