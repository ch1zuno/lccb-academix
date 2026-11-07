BEGIN;

CREATE TABLE IF NOT EXISTS session_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES users(id) ON DELETE SET NULL,
  sender_role text NOT NULL CHECK (sender_role IN ('student', 'tutor', 'ai')),
  sender_name text NOT NULL,
  recipient_role text NOT NULL DEFAULT 'all' CHECK (recipient_role IN ('all', 'tutor', 'student', 'ai')),
  content text NOT NULL,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_session_messages_session_id ON session_messages(session_id, created_at ASC);

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ai_summary text;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ai_quiz jsonb;

COMMIT;

