-- 011: User avatar storage as bytea with metadata
BEGIN;

CREATE TABLE IF NOT EXISTS user_avatars (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  data bytea NOT NULL,
  mime_type text NOT NULL,
  size_bytes int NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_avatars_updated_at ON user_avatars(updated_at);

COMMENT ON TABLE user_avatars IS 'Resized 256x256 avatar binaries stored safely for ephemeral Render dynos';

COMMIT;
