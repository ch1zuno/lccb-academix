-- 016: Enforce Cloudflare R2 object storage indexes and clear residual bytea
BEGIN;

CREATE INDEX IF NOT EXISTS idx_user_avatars_r2_key ON user_avatars(r2_key);
CREATE INDEX IF NOT EXISTS idx_application_documents_r2_key ON application_documents(r2_key);

-- Null out any residual bytea if r2_key is set
UPDATE user_avatars SET data = NULL WHERE r2_key IS NOT NULL AND data IS NOT NULL;
UPDATE application_documents SET data = NULL WHERE r2_key IS NOT NULL AND data IS NOT NULL;

COMMIT;
