/**
 * Client-side PublicProfile accessor and validator.
 * Ensures client components only access public-safe fields.
 */

/**
 * @typedef {Object} PublicProfile
 * @property {string} name - User's display name
 * @property {string} bio - User's public biography (max 280 chars)
 * @property {string|null} avatar - Avatar image URL or legacy emoji
 * @property {string} role - System role ('superadmin' | 'faculty' | 'tutor' | 'learner')
 * @property {Array<{code: string, name: string, department: string}>} [subjects] - Subjects taught (tutors only)
 */

/**
 * Sanitizes any user object down to its public-safe representation.
 * @param {object} rawUser
 * @returns {PublicProfile|null}
 */
export function toPublicProfile(rawUser) {
  if (!rawUser) return null;

  return {
    name: String(rawUser.name || 'Anonymous'),
    bio: typeof rawUser.bio === 'string' ? rawUser.bio.slice(0, 280) : '',
    avatar: rawUser.has_avatar && rawUser.id
      ? `/api/users/${rawUser.id}/avatar`
      : rawUser.avatar || null,
    role: rawUser.role || 'learner',
    subjects: rawUser.role === 'tutor' && Array.isArray(rawUser.subjects)
      ? rawUser.subjects.map((s) => ({
          code: String(s.code || ''),
          name: String(s.name || ''),
          department: String(s.department || ''),
        }))
      : undefined,
  };
}
