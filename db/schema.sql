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
CREATE TYPE referral_status AS ENUM ('flagged', 'assigned', 'in-progress', 'resolved');
CREATE TYPE session_status AS ENUM ('upcoming', 'completed', 'cancelled');
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
  status session_status NOT NULL DEFAULT 'upcoming',
  location text NOT NULL,
  rating numeric CHECK (rating >= 1 AND rating <= 5),
  cancel_reason text,
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

CREATE TABLE points_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount int NOT NULL,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

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

COMMIT;
