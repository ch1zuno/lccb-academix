-- 009: Notification deep links — every notification carries the entity it points at
-- so the feed can route a click back to what created it (referral, session,
-- session_request, tutor_application, conversation).

BEGIN;

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS entity_type text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS entity_id uuid;
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);

COMMENT ON COLUMN notifications.entity_type IS 'Kind of entity the notification points at: referral | session | session_request | tutor_application | conversation';
COMMENT ON COLUMN notifications.entity_id IS 'UUID of the referenced entity, when entity_type is set';

COMMIT;