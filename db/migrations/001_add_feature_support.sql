-- 001: Auth / check-in / rewards feature support missing from the base schema.
-- db:reset applies schema.sql (which contains the same DDL) and marks this file
-- applied in schema_migrations; db:migrate runs it on databases prepared before 001.

BEGIN;

-- Sessions link back to referrals and carry numeric duration + wrap-up notes.
ALTER TABLE sessions ADD COLUMN referral_id uuid REFERENCES referrals(id) ON DELETE SET NULL;
ALTER TABLE sessions ADD COLUMN duration_hours numeric;
ALTER TABLE sessions ADD COLUMN notes text;

-- Session milestone: both check-in confirmations recorded, session started.
ALTER TYPE session_status ADD VALUE 'in-progress';

-- Referrals track hours left; seeded to hours_required.
ALTER TABLE referrals ADD COLUMN hours_remaining numeric;

-- Short-lived QR/OTP tokens for the dual-confirmation check-in flow.
CREATE TABLE check_in_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  token text NOT NULL,
  method check_in_method NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- In-app notifications (feeds the header bell).
CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CSV-imported fingerprint roster for the biometric reader device endpoint.
CREATE TABLE device_fingerprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint_id text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'csv-import',
  enrolled_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Reward redemptions: unique voucher codes; the points debit lands in points_ledger.
CREATE TABLE redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_id uuid NOT NULL REFERENCES rewards(id) ON DELETE RESTRICT,
  points_debited int NOT NULL,
  voucher_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'issued',
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Weekly tutor availability (day 0 = Sunday).
CREATE TABLE tutor_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  UNIQUE (tutor_id, day_of_week, start_time)
);

-- Learner wizard booking requests → tutor accept/decline.
CREATE TABLE session_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tutor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  topic text NOT NULL,
  preferred_date date NOT NULL,
  preferred_time text NOT NULL,
  note text,
  location text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','declined')),
  session_id uuid REFERENCES sessions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- points_ledger is append-only: updates and deletes are rejected.
CREATE FUNCTION forbid_ledger_change() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'points_ledger is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER points_ledger_append_only
  BEFORE UPDATE OR DELETE ON points_ledger
  FOR EACH ROW EXECUTE FUNCTION forbid_ledger_change();

-- Bookkeeping for db:migrate.
CREATE TABLE schema_migrations (
  filename text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_referral_id ON sessions(referral_id);
CREATE INDEX idx_sessions_date_desc ON sessions(date DESC);
CREATE INDEX idx_sessions_subject_id ON sessions(subject_id);
CREATE INDEX idx_user_subjects_subject_id ON user_subjects(subject_id);
CREATE INDEX idx_check_in_tokens_session_id ON check_in_tokens(session_id);
CREATE INDEX idx_check_in_tokens_expires_at ON check_in_tokens(expires_at);
CREATE INDEX idx_notifications_user_id ON notifications(user_id, is_read);
CREATE INDEX idx_device_fingerprints_user_id ON device_fingerprints(user_id);
CREATE INDEX idx_redemptions_user_id ON redemptions(user_id);
CREATE INDEX idx_tutor_applications_status ON tutor_applications(status);
CREATE INDEX idx_tutor_availability_tutor_id ON tutor_availability(tutor_id);
CREATE INDEX idx_session_check_ins_user_id ON session_check_ins(user_id);
CREATE INDEX idx_session_requests_tutor_id ON session_requests(tutor_id);

COMMIT;
