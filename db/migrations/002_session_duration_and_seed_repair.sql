-- 002: Numeric session duration + repair text damaged by an old seed pass.
--
-- session.duration_hours is the source for the public overview and the
-- mandatory-hours progress bar. Older rows only carried the human string
-- ("1.5 hrs"), and new bookings omitted the numeric column entirely. Backfill
-- the numeric value, give future rows a safe 1-hour default, and repair the
-- apostrophes that an earlier seed-generation pass replaced with "NULL".

BEGIN;

ALTER TABLE sessions ALTER COLUMN duration_hours SET DEFAULT 1;

UPDATE sessions
SET duration_hours = NULLIF(regexp_replace(duration, '[^0-9.]', '', 'g'), '')::numeric
WHERE duration_hours IS NULL
  AND duration IS NOT NULL;

UPDATE subjects
SET name = 'Filipino sa Iba''t Ibang Disiplina'
WHERE code = 'FIL 102' AND name = 'Filipino sa IbaNULLt Ibang Disiplina';

UPDATE users
SET bio = replace(bio, 'NULLs', '''s')
WHERE bio LIKE '%NULLs%';

UPDATE exam_questions
SET question = replace(question, 'NULLs', '''s')
WHERE question LIKE '%NULLs%';

UPDATE rewards
SET name = replace(name, 'NULLs', '''s')
WHERE name LIKE '%NULLs%';

UPDATE tutor_applications
SET achievements = replace(achievements::text, 'NULLs', '''s')::jsonb
WHERE achievements::text LIKE '%NULLs%';

COMMIT;
