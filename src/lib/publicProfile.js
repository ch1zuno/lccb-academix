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
 * @property {string} [program] - Academic program / course
 * @property {boolean} [is_available] - Whether tutor is available for bookings
 * @property {boolean} [is_verified] - Whether tutor accreditation is active
 * @property {Array<{id?: string, code: string, name: string, department: string}>} [subjects] - Subjects taught (tutors only)
 * @property {{completed_sessions: number}} [stats] - Real computed session stats
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
    program: typeof rawUser.program === 'string' ? rawUser.program : undefined,
    is_available: typeof rawUser.is_available === 'boolean' ? rawUser.is_available : undefined,
    is_verified: typeof rawUser.is_verified === 'boolean' ? rawUser.is_verified : undefined,
    subjects: rawUser.role === 'tutor' && Array.isArray(rawUser.subjects)
      ? rawUser.subjects.map((s) => ({
          id: s.id,
          code: String(s.code || ''),
          name: String(s.name || ''),
          department: String(s.department || ''),
        }))
      : undefined,
    stats: rawUser.stats && typeof rawUser.stats.completed_sessions === 'number'
      ? { completed_sessions: Math.max(0, Math.floor(rawStatsSession(rawUser.stats))) }
      : undefined,
  };
}

function rawStatsSession(stats) {
  return Number(stats.completed_sessions) || 0;
}

