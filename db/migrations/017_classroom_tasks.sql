-- 017: Classroom-style tasks, submissions, image attachments, and high-priority notifications
BEGIN;

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS entity_type text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS entity_id uuid;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal';
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_priority_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_priority_check CHECK (priority IN ('normal', 'high'));
CREATE INDEX IF NOT EXISTS idx_notifications_user_priority_created
  ON notifications (user_id, (priority = 'high') DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 200),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 4000),
  due_at timestamptz,
  form_url text,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tasks_tutor_created ON tasks (tutor_id, created_at DESC);
DROP TRIGGER IF EXISTS set_updated_at_tasks ON tasks;
CREATE TRIGGER set_updated_at_tasks BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS task_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  learner_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'assigned' CHECK (status IN ('assigned', 'submitted', 'reviewed')),
  submission_text text CHECK (submission_text IS NULL OR char_length(submission_text) <= 4000),
  form_completed boolean NOT NULL DEFAULT false,
  submitted_at timestamptz,
  is_late boolean NOT NULL DEFAULT false,
  reviewed_at timestamptz,
  feedback text CHECK (feedback IS NULL OR char_length(feedback) <= 2000),
  due_soon_notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (task_id, learner_id)
);
CREATE INDEX IF NOT EXISTS idx_task_assignments_learner ON task_assignments (learner_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_assignments_task ON task_assignments (task_id, status);
DROP TRIGGER IF EXISTS set_updated_at_task_assignments ON task_assignments;
CREATE TRIGGER set_updated_at_task_assignments BEFORE UPDATE ON task_assignments FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS task_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  assignment_id uuid REFERENCES task_assignments(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  mime_type text NOT NULL CHECK (mime_type IN ('image/png', 'image/jpeg', 'image/webp')),
  size_bytes int NOT NULL CHECK (size_bytes > 0),
  storage_driver text NOT NULL DEFAULT 'local' CHECK (storage_driver IN ('local', 'r2')),
  storage_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_task_attachments_task ON task_attachments (task_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_task_attachments_assignment ON task_attachments (assignment_id, created_at ASC);

COMMIT;
