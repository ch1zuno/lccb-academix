-- Migration 020: Session modes (face_to_face / online), approved campus venues,
-- tutor counter-proposals, duration on requests, and venue double-booking guard.
BEGIN;

CREATE TABLE IF NOT EXISTS campus_venues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL CHECK (char_length(trim(name)) BETWEEN 2 AND 80),
  building text NOT NULL DEFAULT '',
  room text NOT NULL DEFAULT '',
  capacity int NOT NULL DEFAULT 6 CHECK (capacity > 0 AND capacity <= 200),
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS set_updated_at_campus_venues ON campus_venues;
CREATE TRIGGER set_updated_at_campus_venues
  BEFORE UPDATE ON campus_venues FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_campus_venues_active ON campus_venues(is_active, name);

INSERT INTO campus_venues (name, building, room, capacity) VALUES
  ('Library Study Room A', 'Main Library', 'Rm 101', 6),
  ('Library Study Room B', 'Main Library', 'Rm 102', 6),
  ('Learning Commons', 'Main Library', 'Ground Floor', 12),
  ('IT Building Rm 204', 'IT Building', 'Rm 204', 8),
  ('CS Lab 1', 'IT Building', 'Lab 1', 10),
  ('CS Lab 3', 'IT Building', 'Lab 3', 10),
  ('Study Hall A', 'Academic Wing', 'Hall A', 12),
  ('Study Hall B', 'Academic Wing', 'Hall B', 12)
ON CONFLICT (name) DO NOTHING;

ALTER TABLE session_requests
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'online' CHECK (mode IN ('face_to_face', 'online')),
  ADD COLUMN IF NOT EXISTS venue_id uuid REFERENCES campus_venues(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS duration_hours numeric NOT NULL DEFAULT 1 CHECK (duration_hours IN (0.5, 1, 1.5, 2)),
  ADD COLUMN IF NOT EXISTS proposed_date date,
  ADD COLUMN IF NOT EXISTS proposed_time text,
  ADD COLUMN IF NOT EXISTS proposed_venue_id uuid REFERENCES campus_venues(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS proposed_location text,
  ADD COLUMN IF NOT EXISTS proposal_note text;

ALTER TABLE session_requests DROP CONSTRAINT IF EXISTS session_requests_status_check;
ALTER TABLE session_requests ADD CONSTRAINT session_requests_status_check
  CHECK (status IN ('pending', 'counter_proposed', 'accepted', 'declined', 'cancelled'));

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'online' CHECK (mode IN ('face_to_face', 'online')),
  ADD COLUMN IF NOT EXISTS venue_id uuid REFERENCES campus_venues(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_sessions_active_venue_slot
  ON sessions (venue_id, date, time)
  WHERE venue_id IS NOT NULL AND mode = 'face_to_face' AND status IN ('upcoming', 'in-progress');

CREATE INDEX IF NOT EXISTS idx_sessions_mode ON sessions (mode);
CREATE INDEX IF NOT EXISTS idx_sessions_venue_date ON sessions (venue_id, date) WHERE venue_id IS NOT NULL;

DO $$
BEGIN
  ALTER TABLE public.campus_venues ENABLE ROW LEVEL SECURITY;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON public.campus_venues FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON public.campus_venues FROM authenticated;
  END IF;
END $$;

COMMIT;
