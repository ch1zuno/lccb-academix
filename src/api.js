/* Tiny fetch wrapper for the LCCB Academix API. */
import { useToken } from './authToken.js';

const BASE = '/api';

export class ApiError extends Error {
  constructor(status, message, body) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

async function request(path, { method = 'GET', body, params } = {}) {
  const qs = params ? `?${new URLSearchParams(params)}` : '';
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const headers = {};
  if (!isForm) headers['Content-Type'] = 'application/json';
  const token = useToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}${qs}`, {
    method,
    headers,
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
  });
  const type = res.headers.get('content-type') || '';
  const payload = type.includes('json') ? await res.json().catch(() => ({})) : await res.text();
  if (!res.ok) {
    // A 401 outside the login call means the token expired or was revoked —
    // let the shell drop to the login screen instead of leaving broken pages.
    if (res.status === 401 && path !== '/auth/login') {
      window.dispatchEvent(new Event('academix:unauthorized'));
    }
    throw new ApiError(res.status, payload?.error || payload?.message || `HTTP ${res.status}`, payload);
  }
  return payload;
}

/** Fetches an authenticated binary response (supporting-document previews). */
async function requestBlob(path) {
  const headers = {};
  const token = useToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { headers });
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
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
  upload: (path, formData) => request(path, { method: 'POST', body: formData }),
  blob: requestBlob,
};
