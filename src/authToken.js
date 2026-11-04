/* The JWT lives in an HttpOnly cookie and is never exposed to JavaScript.
 * Only the non-sensitive profile is cached so the shell can paint immediately;
 * the API revalidates the cookie on boot. */
export const USER_KEY = 'academix-user';
const LEGACY_TOKEN_KEY = 'academix-token';

export function saveSession(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  localStorage.removeItem(LEGACY_TOKEN_KEY);
}

export function loadSession() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    const user = JSON.parse(raw);
    return user ? { user } : null;
  } catch {
    clearSession();
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
}
