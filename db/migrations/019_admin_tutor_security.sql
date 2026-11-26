-- Migration 019: Superadmin TOTP 2FA, idle tracking, and tutor suspension metadata.

BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS totp_secret_enc text,
  ADD COLUMN IF NOT EXISTS totp_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS totp_recovery_hashes jsonb,
  ADD COLUMN IF NOT EXISTS suspended_at timestamptz,
  ADD COLUMN IF NOT EXISTS suspended_reason text,
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz;

COMMIT;
