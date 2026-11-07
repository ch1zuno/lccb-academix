-- 007: text messaging between learners and tutors who share a booking.
--
-- A conversation is simply the pair (sender_id, recipient_id); no separate
-- conversation table yet. Eligibility is enforced in the API: both users must
-- be a learner/tutor pair with a pending/accepted session request or a
-- non-cancelled session between them.

BEGIN;

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (sender_id <> recipient_id)
);

CREATE INDEX IF NOT EXISTS idx_messages_pair_created
  ON messages (sender_id, recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_created
  ON messages (recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_unread
  ON messages (recipient_id, read_at) WHERE read_at IS NULL;

COMMIT;
