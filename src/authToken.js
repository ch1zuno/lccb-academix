/* The JWT lives in an HttpOnly cookie and is never exposed to JavaScript.
 * Only the non-sensitive profile is cached so the shell can paint immediately;
 * the API revalidates the cookie on boot. */
export const USER_KEY = 'academix-user';
export const SESSION_TTL_MS = 48 * 60 * 60 * 1000;
const LEGACY_TOKEN_KEY = 'academix-token';

function readStoredExpiry() {
  try {
    const parsed = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    return typeof parsed?.expiresAt === 'number' ? parsed.expiresAt : null;
  } catch {
    return null;
  }
}

export function saveSession(user, expiresAt) {
  // Profile updates omit expiresAt; preserve the original 48h login ceiling.
  const resolvedExpiry = typeof expiresAt === 'number'
    ? expiresAt
    : (readStoredExpiry() ?? Date.now() + SESSION_TTL_MS);
  localStorage.setItem(USER_KEY, JSON.stringify({ user, expiresAt: resolvedExpiry }));
  localStorage.removeItem(LEGACY_TOKEN_KEY);
}

export function loadSession() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed) return null;
    const user = parsed.user ?? (parsed.id ? parsed : null);
    const expiresAt = typeof parsed.expiresAt === 'number' ? parsed.expiresAt : null;
    if (!user || (expiresAt && Date.now() >= expiresAt)) {
      clearSession();
      return null;
    }
    return { user, expiresAt };
  } catch {
    clearSession();
    return null;
  }
}

function clearSupabaseStorage(storage) {
  if (!storage) return;
  for (let i = storage.length - 1; i >= 0; i -= 1) {
    const key = storage.key(i);
    if (key && /^sb-.*-auth-token/i.test(key)) storage.removeItem(key);
  }
}

export function clearSession() {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  clearSupabaseStorage(localStorage);
  clearSupabaseStorage(sessionStorage);
}
