-- 012: Track real session call duration and start/end timestamps
BEGIN;

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS ended_at timestamptz,
  ADD COLUMN IF NOT EXISTS actual_duration_seconds integer DEFAULT 0;

COMMIT;

