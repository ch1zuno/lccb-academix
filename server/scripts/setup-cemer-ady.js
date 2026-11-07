import 'dotenv/config';
import crypto from 'node:crypto';
import { query, pool } from '../db.js';

async function main() {
  console.log('Connecting to database...');

  // 1. Fetch Cemer and Ady
  const cemerRes = await query(
    `SELECT id, custom_id, name, email, role FROM users WHERE custom_id = '24-0870-103' OR name ILIKE '%Cemer%'`
  );
  const adyRes = await query(
    `SELECT id, custom_id, name, email, role FROM users WHERE custom_id = '24-0870-118' OR name ILIKE '%Jose Ady%'`
  );

  if (!cemerRes.rows[0]) throw new Error('Cemer Miranda not found in users table');
  if (!adyRes.rows[0]) throw new Error('Jose Ady Tornea not found in users table');

  const cemer = cemerRes.rows[0];
  const ady = adyRes.rows[0];

  console.log('Found Cemer:', cemer.name, cemer.custom_id, cemer.role);
  console.log('Found Ady:', ady.name, ady.custom_id, ady.role);

  // 2. Update Cemer as Tutor
  await query(
    `UPDATE users
     SET role = 'tutor',
         is_verified = true,
         is_available = true,
         bio = 'Peer Tutor & Lead Developer | Web & Software Engineering',
         hourly_rate = '15',
         avatar = '👨‍💻'
     WHERE id = $1`,
    [cemer.id]
  );
  console.log('Updated Cemer Miranda as Tutor (verified & available).');

  // 3. Ensure Ady is Learner
  await query(
    `UPDATE users
     SET role = 'learner',
         is_verified = true,
         is_available = true,
         avatar = '👨‍💻'
     WHERE id = $1`,
    [ady.id]
  );
  console.log('Ensured Jose Ady Tornea as Learner (verified & available).');

  // 4. Assign subjects to Cemer (WEB 301, PROG 201, IT 101, DBMS 301)
  const subjectsRes = await query(`SELECT id, code, name FROM subjects`);
  for (const sub of subjectsRes.rows) {
    await query(
      `INSERT INTO user_subjects (id, user_id, subject_id)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [crypto.randomUUID(), cemer.id, sub.id]
    );
  }
  console.log('Assigned all subjects to Cemer for peer tutoring catalogue.');

  // 5. Add availability for Cemer (every day of the week, 00:00 to 23:59)
  await query(`DELETE FROM tutor_availability WHERE tutor_id = $1`, [cemer.id]);
  for (let day = 0; day <= 6; day++) {
    await query(
      `INSERT INTO tutor_availability (id, tutor_id, day_of_week, start_time, end_time)
       VALUES ($1, $2, $3, '00:00:00', '23:59:59')`,
      [crypto.randomUUID(), cemer.id, day]
    );
  }
  console.log('Created 7-day 24/7 availability for Cemer.');

  // 6. Find a subject for the active session (e.g., WEB 301 or first subject)
  const webSubject = subjectsRes.rows.find((s) => s.code.includes('WEB')) || subjectsRes.rows[0];

  // 7. Check if there is already an active or upcoming session between them
  const existingSession = await query(
    `SELECT id, session_code, status FROM sessions
     WHERE tutor_id = $1 AND learner_id = $2 AND status IN ('upcoming', 'in-progress')
     ORDER BY created_at DESC LIMIT 1`,
    [cemer.id, ady.id]
  );

  let sessionId;
  let sessionCode;

  if (existingSession.rows[0]) {
    sessionId = existingSession.rows[0].id;
    sessionCode = existingSession.rows[0].session_code;
    // Update to in-progress so checkin immediately opens LiveClassroom
    await query(
      `UPDATE sessions
       SET status = 'in-progress',
           topic = 'Peer Developer Voice Call & Realtime Collaboration',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [sessionId]
    );
    console.log(`Reactivated existing session ${sessionCode} to 'in-progress'.`);
  } else {
    sessionId = crypto.randomUUID();
    sessionCode = `SES-${Math.floor(100000 + Math.random() * 900000)}`;

    await query(
      `INSERT INTO sessions (
         id, session_code, tutor_id, learner_id, subject_id,
         topic, date, time, duration, duration_hours,
         status, location, created_at, updated_at
       ) VALUES (
         $1, $2, $3, $4, $5,
         'Peer Developer Voice Call & Realtime Collaboration',
         CURRENT_DATE, '12:00 AM', '1 hr', '1',
         'in-progress', 'Online / Live Video Room', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
       )`,
      [sessionId, sessionCode, cemer.id, ady.id, webSubject.id]
    );
    console.log(`Created new live session ${sessionCode} (${sessionId}).`);
  }

  // 8. Create / ensure accepted session request
  await query(
    `INSERT INTO session_requests (
       id, learner_id, tutor_id, subject_id, topic,
       preferred_date, preferred_time, note, location, status, session_id, created_at
     ) VALUES (
       $1, $2, $3, $4, 'Peer Developer Voice Call & Realtime Collaboration',
       CURRENT_DATE, '12:00 AM', 'Testing WebRTC voice call & chat for developers',
       'Online / Live Video Room', 'accepted', $5, CURRENT_TIMESTAMP
     ) ON CONFLICT DO NOTHING`,
    [crypto.randomUUID(), ady.id, cemer.id, webSubject.id, sessionId]
  );
  console.log('Recorded accepted session request from Ady to Cemer.');

  // 9. Seed message thread in messages table so they can also use /messages
  await query(
    `INSERT INTO messages (id, sender_id, recipient_id, body, created_at)
     VALUES
       ($1, $2, $3, 'Hey Cemer! Ready to test our voice call and realtime chat.', CURRENT_TIMESTAMP - INTERVAL '2 minutes'),
       ($4, $3, $2, 'Hey Ady! Session is open. Jump into Session Check-In to start the call!', CURRENT_TIMESTAMP - INTERVAL '1 minute')
     ON CONFLICT DO NOTHING`,
    [crypto.randomUUID(), ady.id, cemer.id, crypto.randomUUID()]
  );
  console.log('Seeded initial messages between Cemer and Ady.');

  console.log('\n--- SETUP COMPLETE ---');
  console.log('Tutor: Cemer Daniel L. Miranda (ID: ' + cemer.custom_id + ')');
  console.log('Learner: Jose Ady Tornea (ID: ' + ady.custom_id + ')');
  console.log('Active Session Code: ' + sessionCode);
  console.log('Status: in-progress (Ready to join voice call & chat at /checkin)');

  await pool.end();
}

main().catch((err) => {
  console.error('Setup failed:', err);
  process.exit(1);
});
