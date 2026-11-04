-- 005: trust & integrity hardening.
--
--  * token_version lets a sign-out / password change revoke every existing JWT
--  * exam_started_at enforces the 30-minute window on the server, not the browser
--  * one pending accreditation application per user
--  * one active session per tutor at the same date/time
--  * an append-only audit trail for decisions that touch a student's record
--
-- Safe to run against a database that already has the 001-004 migrations.

BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version int NOT NULL DEFAULT 0;

ALTER TABLE tutor_applications ADD COLUMN IF NOT EXISTS exam_started_at timestamptz;
ALTER TABLE tutor_applications ADD COLUMN IF NOT EXISTS exam_submitted_at timestamptz;

-- A student can only have one application awaiting a decision. Concurrent
-- double-submits previously both passed the "SELECT ... pending" check.
CREATE UNIQUE INDEX IF NOT EXISTS uq_tutor_applications_one_pending
  ON tutor_applications(user_id)
  WHERE status = 'pending';

-- Exact-slot collision guard. The API also checks this inside the accept
-- transaction; the index is the final authority under concurrency.
CREATE UNIQUE INDEX IF NOT EXISTS uq_sessions_active_slot
  ON sessions(tutor_id, date, time)
  WHERE status IN ('upcoming', 'in-progress');

CREATE INDEX IF NOT EXISTS idx_points_ledger_user_created
  ON points_ledger(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS audit_log (
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

CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity, entity_id);

CREATE OR REPLACE FUNCTION forbid_audit_change() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_log_append_only ON audit_log;
CREATE TRIGGER audit_log_append_only
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION forbid_audit_change();

COMMIT;
