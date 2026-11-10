BEGIN;

-- ASSUMPTION: Used UUIDs for primary keys to strictly follow constraints while keeping UUID generation simple.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TYPE user_role AS ENUM ('superadmin', 'faculty', 'tutor', 'learner');
CREATE TYPE referral_urgency AS ENUM ('low', 'medium', 'high');
CREATE TYPE referral_status AS ENUM ('flagged', 'assigned', 'in-progress', 'resolved', 'rejected');
CREATE TYPE session_status AS ENUM ('upcoming', 'in-progress', 'completed', 'cancelled');
CREATE TYPE application_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE check_in_method AS ENUM ('qr', 'fingerprint', 'otp');

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_id text UNIQUE,
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role user_role NOT NULL,
  avatar text,
  title text,
  department text,
  program text,
  bio text,
  is_verified boolean DEFAULT false,
  is_available boolean DEFAULT true,
  hourly_rate numeric,
  certified_by_id uuid REFERENCES users(id) ON DELETE SET NULL,
  token_version int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER set_updated_at_users BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  department text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER set_updated_at_subjects BEFORE UPDATE ON subjects FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE user_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  UNIQUE(user_id, subject_id)
);

CREATE TABLE referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code text UNIQUE,
  learner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  faculty_id uuid NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  assigned_tutor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  topic text NOT NULL,
  urgency referral_urgency NOT NULL,
  status referral_status NOT NULL DEFAULT 'flagged',
  notes text,
  hours_required numeric NOT NULL,
  hours_remaining numeric,
  date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER set_updated_at_referrals BEFORE UPDATE ON referrals FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_code text UNIQUE,
  tutor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  learner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  faculty_id uuid REFERENCES users(id) ON DELETE SET NULL,
  topic text NOT NULL,
  date date NOT NULL,
  time text NOT NULL,
  duration text,
  duration_hours numeric DEFAULT 1,
  started_at timestamptz,
  ended_at timestamptz,
  actual_duration_seconds integer DEFAULT 0,
  notes text,
  referral_id uuid REFERENCES referrals(id) ON DELETE SET NULL,
  status session_status NOT NULL DEFAULT 'upcoming',
  location text NOT NULL,
  rating numeric CHECK (rating >= 1 AND rating <= 5),
  cancel_reason text,
  ai_summary text,
  ai_quiz jsonb,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER set_updated_at_sessions BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE session_check_ins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  method check_in_method NOT NULL,
  check_in_time timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE exam_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_number int UNIQUE NOT NULL,
  question text NOT NULL,
  options jsonb NOT NULL,
  answer int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER set_updated_at_exam_questions BEFORE UPDATE ON exam_questions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reward_code text UNIQUE,
  name text NOT NULL,
  cost int NOT NULL,
  category text NOT NULL,
  icon text NOT NULL,
  stock int NOT NULL DEFAULT 0,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER set_updated_at_rewards BEFORE UPDATE ON rewards FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_code text UNIQUE,
  name text NOT NULL,
  icon text NOT NULL,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER set_updated_at_badges BEFORE UPDATE ON badges FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, badge_id)
);

CREATE TABLE tutor_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_code text UNIQUE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exam_score int,
  exam_started_at timestamptz,
  exam_submitted_at timestamptz,
  grades jsonb,
  achievements jsonb,
  status application_status NOT NULL DEFAULT 'pending',
  date_applied date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TRIGGER set_updated_at_tutor_applications BEFORE UPDATE ON tutor_applications FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE application_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES tutor_applications(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  UNIQUE(application_id, subject_id)
);

CREATE TABLE application_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES tutor_applications(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes int NOT NULL CHECK (size_bytes > 0),
  data bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE points_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount int NOT NULL,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE FUNCTION forbid_ledger_change() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'points_ledger is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER points_ledger_append_only
  BEFORE UPDATE OR DELETE ON points_ledger
  FOR EACH ROW EXECUTE FUNCTION forbid_ledger_change();

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

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 1000),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (sender_id <> recipient_id)
);
CREATE INDEX idx_messages_pair_created ON messages (sender_id, recipient_id, created_at DESC);
CREATE INDEX idx_messages_recipient_created ON messages (recipient_id, created_at DESC);
CREATE INDEX idx_messages_unread ON messages (recipient_id, read_at) WHERE read_at IS NULL;

CREATE TABLE device_fingerprints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint_id text NOT NULL UNIQUE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'csv-import',
  enrolled_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_id uuid NOT NULL REFERENCES rewards(id) ON DELETE RESTRICT,
  points_debited int NOT NULL,
  voucher_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'issued',
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tutor_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  UNIQUE (tutor_id, day_of_week, start_time)
);

CREATE TABLE schema_migrations (
  filename text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_log (
  id bigserial PRIMARY KEY,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  actor_role text,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id text,
  detail jsonb,
  ip text,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);
CREATE INDEX idx_audit_log_entity ON audit_log(entity, entity_id);

CREATE FUNCTION forbid_audit_change() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_log_append_only
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION forbid_audit_change();

CREATE VIEW user_wallet_balances AS
SELECT user_id, COALESCE(SUM(amount), 0) AS balance
FROM points_ledger
GROUP BY user_id;

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_custom_id ON users(custom_id);
CREATE INDEX idx_referrals_learner_id ON referrals(learner_id);
CREATE INDEX idx_referrals_faculty_id ON referrals(faculty_id);
CREATE INDEX idx_referrals_tutor_id ON referrals(assigned_tutor_id);
CREATE INDEX idx_referrals_status ON referrals(status);
CREATE INDEX idx_sessions_tutor_id ON sessions(tutor_id);
CREATE INDEX idx_sessions_learner_id ON sessions(learner_id);
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_date ON sessions(date);
CREATE INDEX idx_points_ledger_user_id ON points_ledger(user_id);
CREATE INDEX idx_check_ins_session_id ON session_check_ins(session_id);
CREATE INDEX idx_user_subjects_user_id ON user_subjects(user_id);
CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);

CREATE INDEX idx_sessions_subject_id ON sessions(subject_id);
CREATE INDEX idx_user_subjects_subject_id ON user_subjects(subject_id);
CREATE INDEX idx_tutor_applications_status ON tutor_applications(status);
CREATE INDEX idx_application_documents_application ON application_documents(application_id);
CREATE INDEX idx_sessions_referral_id ON sessions(referral_id);
CREATE INDEX idx_points_ledger_user_created ON points_ledger(user_id, created_at DESC);

-- Integrity guards (mirrored by migration 005).
CREATE UNIQUE INDEX uq_tutor_applications_one_pending
  ON tutor_applications(user_id)
  WHERE status = 'pending';
CREATE UNIQUE INDEX uq_sessions_active_slot
  ON sessions(tutor_id, date, time)
  WHERE status IN ('upcoming', 'in-progress');
CREATE INDEX idx_sessions_date_desc ON sessions(date DESC);
CREATE INDEX idx_check_in_tokens_session_id ON check_in_tokens(session_id);
CREATE INDEX idx_check_in_tokens_expires_at ON check_in_tokens(expires_at);
CREATE INDEX idx_notifications_user_id ON notifications(user_id, is_read);
CREATE INDEX idx_device_fingerprints_user_id ON device_fingerprints(user_id);
CREATE INDEX idx_redemptions_user_id ON redemptions(user_id);
CREATE INDEX idx_tutor_availability_tutor_id ON tutor_availability(tutor_id);
CREATE INDEX idx_session_check_ins_user_id ON session_check_ins(user_id);

-- ── Tutor booking requests (learner wizard → tutor accept) ──
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
    CHECK (status IN ('pending','accepted','declined','cancelled')),
  session_id uuid REFERENCES sessions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_session_requests_tutor_id ON session_requests(tutor_id);
CREATE INDEX idx_session_requests_learner_id ON session_requests(learner_id);
CREATE INDEX idx_session_requests_status ON session_requests(status);

-- ── Real-time session chat & Antigravity AI assistant logs ──
CREATE TABLE session_messages (
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
CREATE INDEX idx_session_messages_session_id ON session_messages(session_id, created_at ASC);

COMMIT;
