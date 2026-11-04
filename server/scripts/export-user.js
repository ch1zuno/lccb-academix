/*
 * Data-subject export (read-only). Produces one JSON file with the user's
 * profile, ledger, sessions, referrals, applications, document metadata,
 * redemptions, and notifications. File bytes are intentionally omitted.
 *
 *   npm run db:export -- TE-128
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const identifier = process.argv[2];
if (!identifier) {
  console.error('Usage: npm run db:export -- <school-id-or-email>');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  const { rows: users } = await client.query(
    `SELECT id, custom_id, name, email, role, program, department, title, avatar,
            is_verified, certified_by_id, created_at, updated_at
       FROM users WHERE custom_id ILIKE $1 OR email ILIKE $1`,
    [identifier],
  );
  if (users.length !== 1) {
    console.error(users.length ? 'Identifier matched more than one user.' : 'User not found.');
    process.exitCode = 1;
  } else {
    const user = users[0];
    const q = (sql, params = [user.id]) => client.query(sql, params).then((r) => r.rows);
    const [ledger, sessions, referrals, applications, documents, redemptions, notifications] = await Promise.all([
      q(`SELECT id, amount, description, created_at FROM points_ledger WHERE user_id = $1 ORDER BY created_at`),
      q(`SELECT id, session_code, tutor_id, learner_id, subject_id, topic, date, time, duration, status,
                location, rating, notes, cancel_reason, created_at
           FROM sessions WHERE tutor_id = $1 OR learner_id = $1 ORDER BY date DESC`),
      q(`SELECT id, referral_code, learner_id, faculty_id, assigned_tutor_id, subject_id, topic, urgency,
                status, date, notes, hours_required, hours_remaining, created_at
           FROM referrals WHERE learner_id = $1 OR faculty_id = $1 OR assigned_tutor_id = $1 ORDER BY created_at DESC`),
      q(`SELECT id, application_code, exam_score, grades, achievements, status, date_applied,
                exam_started_at, exam_submitted_at, created_at
           FROM tutor_applications WHERE user_id = $1 ORDER BY created_at DESC`),
      q(`SELECT d.id, d.application_id, d.file_name, d.mime_type, d.size_bytes, d.created_at
           FROM application_documents d JOIN tutor_applications a ON a.id = d.application_id
          WHERE a.user_id = $1 ORDER BY d.created_at`),
      q(`SELECT r.id, r.voucher_code, r.reward_id, r.points_spent, r.status, r.redeemed_at, r.expires_at
           FROM redemptions r WHERE r.user_id = $1 ORDER BY r.redeemed_at DESC`),
      q(`SELECT id, title, message, type, is_read, created_at FROM notifications WHERE user_id = $1 ORDER BY created_at DESC`),
    ]);
    const balance = ledger.reduce((sum, row) => sum + Number(row.amount), 0);
    const payload = {
      exported_at: new Date().toISOString(),
      user,
      wallet: { balance, ledger },
      sessions,
      referrals,
      applications,
      application_documents: documents,
      redemptions,
      notifications,
      note: 'Read-only export. Uploaded document bytes are not included; request them through the review workflow if legally required.',
    };
    const dir = path.resolve('exports');
    fs.mkdirSync(dir, { recursive: true });
    const safe = String(user.custom_id || user.id).replace(/[^a-z0-9_-]/gi, '_');
    const target = path.join(dir, `${safe}-${new Date().toISOString().slice(0, 10)}.json`);
    fs.writeFileSync(target, JSON.stringify(payload, null, 2));
    console.log(`Wrote ${target} (${ledger.length} ledger rows, ${sessions.length} sessions).`);
  }
} finally {
  await client.end();
}
