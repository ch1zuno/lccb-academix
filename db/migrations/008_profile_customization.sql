-- 008: Profile customization — avatar URL, bio, and badges for tutor/faculty
-- The avatar column already exists (currently stores emojis). We repurpose it for image URLs.
-- Bio column already exists. We add badge earning for tutors/faculty.

BEGIN;

-- Add profile_picture_url column for explicit image URLs (avatar stays for backward compat with emojis)
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture_url text;

-- Add a comment to clarify avatar vs profile_picture_url
COMMENT ON COLUMN users.avatar IS 'Legacy emoji avatar for backward compatibility';
COMMENT ON COLUMN users.profile_picture_url IS 'Full URL to user profile picture (image)';

-- Index for faster badge lookups
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_badges_badge_code ON badges(badge_code);

-- Ensure badges table has proper seed data (already in seed.sql, but defensive)
INSERT INTO badges (badge_code, name, icon, description) VALUES
('BG-001', 'First Session', '🌟', 'Completed your first tutoring session'),
('BG-002', 'Faculty Certified', '🏅', 'Passed the qualification exam'),
('BG-003', 'Rising Star', '⭐', '10+ sessions with 4.5+ rating'),
('BG-004', 'Community Champion', '🏆', '50+ sessions completed'),
('BG-005', 'Perfect Score', '💯', '100% on qualification exam'),
('BG-006', 'Subject Master', '📘', 'Tutored 3+ subjects'),
('BG-007', 'Marathon Mentor', '🏃', '100+ total hours tutored'),
('BG-008', 'Consistency King', '👑', '20 sessions in one month'),
('BG-009', 'Peer Favorite', '💖', '5.0 rating for 10+ consecutive sessions'),
('BG-010', 'IT Specialist', '💻', 'Certified in 2+ IT subjects')
ON CONFLICT (badge_code) DO NOTHING;

COMMIT;