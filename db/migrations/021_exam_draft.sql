BEGIN;

ALTER TABLE tutor_applications
  ADD COLUMN IF NOT EXISTS exam_draft jsonb;

ALTER TABLE tutor_applications
  ADD COLUMN IF NOT EXISTS exam_draft_saved_at timestamptz;

COMMIT;
