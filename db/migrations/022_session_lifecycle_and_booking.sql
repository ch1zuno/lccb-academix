-- Migration 022: Session lifecycle statuses (missed, auto-closed), explicit
-- Asia/Manila cutoff timestamps, tutor-only online end metadata, anti-abuse
-- faculty review & idempotent points posting flags, tutor languages, and
-- instant "Now" request expiration.
--
-- Enum additions MUST commit outside BEGIN/COMMIT before the backfill references them.
ALTER TYPE session_status ADD VALUE IF NOT EXISTS 'missed';
ALTER TYPE session_status ADD VALUE IF NOT EXISTS 'auto-closed';

BEGIN;

-- 1. Tutor offered languages (validated server-side on booking)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS languages text[] NOT NULL DEFAULT ARRAY['English', 'Tagalog', 'Hiligaynon'];

-- 2. Session requests: language, Now instant flag, expiry timestamp, expired status
ALTER TABLE session_requests
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'English',
  ADD COLUMN IF NOT EXISTS is_now boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

ALTER TABLE session_requests DROP CONSTRAINT IF EXISTS session_requests_status_check;
ALTER TABLE session_requests ADD CONSTRAINT session_requests_status_check
  CHECK (status IN ('pending', 'counter_proposed', 'accepted', 'declined', 'cancelled', 'expired'));

-- 3. Sessions: language, Now flag, Asia/Manila cutoff, end metadata, anti-abuse & idempotency guards
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'English',
  ADD COLUMN IF NOT EXISTS is_now boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cutoff_at timestamptz,
  ADD COLUMN IF NOT EXISTS ended_by text CHECK (ended_by IN ('tutor', 'system', 'participant')),
  ADD COLUMN IF NOT EXISTS ended_reason text,
  ADD COLUMN IF NOT EXISTS needs_faculty_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS points_posted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS both_present_seconds integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_sessions_active_cutoff
  ON sessions (cutoff_at)
  WHERE status IN ('upcoming', 'in-progress');

CREATE INDEX IF NOT EXISTS idx_session_requests_expiry
  ON session_requests (expires_at)
  WHERE status IN ('pending', 'counter_proposed');

-- 4. Backfill explicit Asia/Manila cutoffs & request expiries
UPDATE sessions
   SET cutoff_at = ((date + 1)::timestamp AT TIME ZONE 'Asia/Manila')
 WHERE cutoff_at IS NULL;

UPDATE session_requests
   SET expires_at = ((COALESCE(proposed_date, preferred_date) + 1)::timestamp AT TIME ZONE 'Asia/Manila')
 WHERE expires_at IS NULL;

-- Mark already-completed sessions as settled so historical ledger rows stay untouched
UPDATE sessions
   SET points_posted = true,
       ended_by = COALESCE(ended_by, 'tutor'),
       ended_reason = COALESCE(ended_reason, 'historical')
 WHERE status = 'completed';

-- 5. One-time backfill: close every existing stale request and session past its Asia/Manila date cutoff
UPDATE session_requests
   SET status = 'expired'
 WHERE status IN ('pending', 'counter_proposed')
   AND expires_at <= CURRENT_TIMESTAMP;

UPDATE sessions
   SET status = 'missed',
       ended_by = 'system',
       ended_reason = 'migration_backfill',
       ended_at = COALESCE(ended_at, cutoff_at)
 WHERE status = 'upcoming'
   AND cutoff_at <= CURRENT_TIMESTAMP;

UPDATE sessions
   SET status = 'auto-closed',
       ended_by = 'system',
       ended_reason = 'migration_backfill',
       ended_at = COALESCE(ended_at, cutoff_at)
 WHERE status = 'in-progress'
   AND cutoff_at <= CURRENT_TIMESTAMP;

COMMIT;
