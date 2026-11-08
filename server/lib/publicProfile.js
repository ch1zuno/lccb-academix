/**
 * PublicProfile accessor and validator.
 * Enforces that only public-safe fields are returned to other users.
 * Never exposes email, password_hash, token_version, or internal UUID.
 */

/**
 * Returns a sanitized public profile for a user.
 * @param {object} user - User record from DB or session
 * @param {Array<{code: string, name: string, department: string}>} [subjects] - Optional subjects array
 * @returns {object} Public-safe profile object
 */
export function toPublicProfile(user, subjects = []) {
  if (!user) return null;

  const publicProfile = {
    name: user.name || 'Anonymous',
    bio: typeof user.bio === 'string' ? user.bio.slice(0, 280) : '',
    avatar: user.has_avatar
      ? `/api/users/${user.id}/avatar`
      : user.avatar || null,
    role: user.role || 'learner',
    subjects: user.role === 'tutor'
      ? (Array.isArray(subjects) ? subjects : []).map(s => ({
          code: String(s.code || ''),
          name: String(s.name || ''),
          department: String(s.department || ''),
        }))
      : undefined,
  };

  return Object.freeze(publicProfile);
}
