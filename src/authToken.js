/* JWT persistence shared between api.js and the React tree. */
export const TOKEN_KEY = 'academix-token';
export const USER_KEY = 'academix-user';

export function useToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function loadSession() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  try {
    return { token, user: JSON.parse(localStorage.getItem(USER_KEY) || 'null') };
  } catch {
    clearSession();
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
