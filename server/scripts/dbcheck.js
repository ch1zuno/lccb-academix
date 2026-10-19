import pg from 'pg';
const c = new pg.Client({ connectionString: 'postgres://postgres:postgres@localhost:5432/lccb_academix' });
await c.connect();
const r = (await c.query('SELECT referral_code, status, hours_required, hours_remaining FROM referrals WHERE referral_code=$1', ['REF-001'])).rows[0];
const l = (await c.query('SELECT amount, description FROM points_ledger ORDER BY created_at DESC LIMIT 1')).rows[0];
const s = (await c.query('SELECT session_code, status, rating, left(notes,30) AS notes FROM sessions WHERE session_code=$1', ['SES-228735'])).rows[0];
console.log(JSON.stringify({ r, l, s }));
await c.end();
