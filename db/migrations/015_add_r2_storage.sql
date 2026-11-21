-- 015: Support for Cloudflare R2 object storage for avatars and application documents
BEGIN;

-- Allow data (bytea) to be null when file is stored in Cloudflare R2
ALTER TABLE user_avatars ALTER COLUMN data DROP NOT NULL;
ALTER TABLE user_avatars ADD COLUMN IF NOT EXISTS r2_key text;
ALTER TABLE user_avatars ADD COLUMN IF NOT EXISTS r2_url text;

ALTER TABLE application_documents ALTER COLUMN data DROP NOT NULL;
ALTER TABLE application_documents ADD COLUMN IF NOT EXISTS r2_key text;
ALTER TABLE application_documents ADD COLUMN IF NOT EXISTS r2_url text;

COMMIT;
