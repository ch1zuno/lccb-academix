-- 004: file attachments for tutor applications.
-- Files are stored in Postgres because the API runs on serverless functions
-- with a read-only filesystem and no object-storage credentials. Limits
-- (4 MB per file, 5 files per application) are enforced in the API.
BEGIN;

CREATE TABLE application_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES tutor_applications(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  mime_type text NOT NULL,
  size_bytes int NOT NULL CHECK (size_bytes > 0),
  data bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_application_documents_application ON application_documents(application_id);

COMMIT;
