/* Ledger integrity e2e: the points ledger is append-only at the database level.
 * UPDATE and DELETE must be rejected by the trigger, not just by the API.
 * Read-only toward existing rows — it only attempts the blocked statements,
 * which roll back. */
import 'dotenv/config';
import pg from 'pg';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL missing — run with the scratch database URL in the environment.');
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

let bad = 0;

const probe = async (label, sql) => {
  try {
    await client.query(sql);
    console.log(`FAIL ${label} — statement was allowed`);
    bad += 1;
  } catch (e) {
    const blocked = /append-only/i.test(e.message);
    console.log(`${blocked ? 'ok  ' : 'FAIL'} ${label} — ${e.message}`);
    if (!blocked) bad += 1;
  }
};

const row = (await client.query('SELECT id FROM points_ledger ORDER BY created_at LIMIT 1')).rows[0];
if (!row) {
  console.log('FAIL no ledger rows available to probe');
  bad += 1;
} else {
  await probe('UPDATE points_ledger', `UPDATE points_ledger SET amount = amount + 1 WHERE id = '${row.id}'`);
  await probe('DELETE FROM points_ledger', `DELETE FROM points_ledger WHERE id = '${row.id}'`);
}

const trigger = (await client.query(
  `SELECT tgname FROM pg_trigger WHERE tgrelid = 'points_ledger'::regclass AND NOT tgisinternal`,
)).rows;
if (trigger.length === 0) {
  console.log('FAIL points_ledger_append_only trigger is missing');
  bad += 1;
} else {
  console.log(`ok   trigger present: ${trigger.map((t) => t.tgname).join(', ')}`);
}

await client.end();
if (bad) {
  console.log(`\n${bad} ledger-integrity check(s) FAILED`);
  process.exit(1);
}
console.log('\nLedger is append-only ✅');
