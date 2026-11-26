/* Tiny fetch wrapper for the LCCB Academix API. Auth rides in an HttpOnly
 * same-site cookie, so browser code never reads or stores the JWT. */
const BASE = '/api';

// In-memory only (never persisted to storage) for 10-minute Superadmin step-up confirmation.
let cachedStepUpToken = null;
let cachedStepUpExpiresAt = 0;

export class ApiError extends Error {
  constructor(status, message, body) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

const SKIP_UNAUTH_PATHS = new Set([
  '/auth/login',
  '/auth/google',
  '/auth/totp/verify-login',
  '/auth/step-up',
  '/auth/change-password',
  '/auth/totp/enable',
  '/auth/totp/disable',
]);

async function request(path, { method = 'GET', body, params, headers: extraHeaders } = {}) {
  const qs = params ? `?${new URLSearchParams(params)}` : '';
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const headers = { ...(extraHeaders || {}) };
  if (!isForm) headers['Content-Type'] = 'application/json';
  if (cachedStepUpToken && Date.now() < cachedStepUpExpiresAt && !headers['X-Step-Up-Token']) {
    headers['X-Step-Up-Token'] = cachedStepUpToken;
  }
  const isGet = method.toUpperCase() === 'GET';
  const signal = isGet && typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
    ? AbortSignal.timeout(30000)
    : undefined;
  let res;
  try {
    res = await fetch(`${BASE}${path}${qs}`, {
      method,
      headers,
      credentials: 'include',
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
      ...(signal ? { signal } : {}),
    });
  } catch (err) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      throw new ApiError(0, 'timeout');
    }
    throw new ApiError(0, err?.message || 'network');
  }
  const type = res.headers.get('content-type') || '';
  const payload = type.includes('json') ? await res.json().catch(() => ({})) : await res.text();
  if (!res.ok) {
    // A 401 outside auth/verification calls means the session expired or was revoked —
    // let the shell drop to the login screen instead of leaving broken pages.
    if (res.status === 401 && !SKIP_UNAUTH_PATHS.has(path)) {
      cachedStepUpToken = null;
      cachedStepUpExpiresAt = 0;
      window.dispatchEvent(new Event('academix:unauthorized'));
    }
    throw new ApiError(res.status, payload?.error || payload?.message || `HTTP ${res.status}`, payload);
  }
  return payload;
}

/** Fetches an authenticated binary response (supporting-document previews). */
async function requestBlob(path) {
  const headers = {};
  if (cachedStepUpToken && Date.now() < cachedStepUpExpiresAt) {
    headers['X-Step-Up-Token'] = cachedStepUpToken;
  }
  const res = await fetch(`${BASE}${path}`, { headers, credentials: 'include' });
  if (!res.ok) {
    if (res.status === 401) window.dispatchEvent(new Event('academix:unauthorized'));
    let message = `HTTP ${res.status}`;
    try {
      const payload = await res.json();
      message = payload?.error || message;
    } catch { /* binary or empty body */ }
    throw new ApiError(res.status, message);
  }
  return res.blob();
}

export default {
  get: (path, params) => request(path, { params }),
  post: (path, body, options) => request(path, { method: 'POST', body, ...options }),
  put: (path, body, options) => request(path, { method: 'PUT', body, ...options }),
  patch: (path, body, options) => request(path, { method: 'PATCH', body, ...options }),
  delete: (path, options) => request(path, { method: 'DELETE', ...options }),
  upload: (path, formData) => request(path, { method: 'POST', body: formData }),
  blob: requestBlob,
  setStepUpToken: (token, expiresInSeconds = 600) => {
    cachedStepUpToken = token || null;
    cachedStepUpExpiresAt = token ? Date.now() + expiresInSeconds * 1000 : 0;
  },
  clearStepUpToken: () => {
    cachedStepUpToken = null;
    cachedStepUpExpiresAt = 0;
  },
};
