/**
 * PublicProfile accessor and validator.
 * Enforces that only public-safe fields are returned to other users.
 * Never exposes email, password_hash, token_version, or internal UUID.
 */

/**
 * Returns a sanitized public profile for a user.
 * @param {object} user - User record from DB or session
 * @param {Array<{id?: string, code: string, name: string, department: string}>} [subjects] - Optional subjects array
 * @param {object} [stats] - Optional stats object (e.g. { completed_sessions: number })
 * @returns {object} Public-safe profile object
 */
export function toPublicProfile(user, subjects = [], stats = null) {
  if (!user) return null;

  const rawStats = stats || user.stats;
  const publicProfile = {
    name: user.name || 'Anonymous',
    bio: typeof user.bio === 'string' ? user.bio.slice(0, 280) : '',
    avatar: user.has_avatar
      ? `/api/users/${user.id}/avatar`
      : user.avatar || null,
    role: user.role || 'learner',
    program: typeof user.program === 'string' ? user.program : undefined,
    is_available: typeof user.is_available === 'boolean' ? user.is_available : undefined,
    is_verified: typeof user.is_verified === 'boolean' ? user.is_verified : undefined,
    subjects: user.role === 'tutor'
      ? (Array.isArray(subjects) ? subjects : []).map(s => {
          const item = {
            code: String(s.code || ''),
            name: String(s.name || ''),
            department: String(s.department || ''),
          };
          if (s.id) item.id = s.id;
          return item;
        })
      : undefined,
    stats: rawStats && typeof rawStats.completed_sessions === 'number'
      ? { completed_sessions: Math.max(0, Math.floor(rawStats.completed_sessions)) }
      : undefined,
  };

  return Object.freeze(publicProfile);
}

