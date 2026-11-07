/* Stage sample notifications across all entity types for the demo */

const BASE = (process.env.DEMO_API_BASE || 'http://localhost:4000').replace(/\/+/g, '');
const PASSWORD = 'demo1234';

async function request(path, { method = 'GET', token, body } = {}) {
  const url = `${BASE}/api${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data;
  try { data = await res.json(); } catch { data = {}; }
  return { status: res.status, data };
}

async function login(identity) {
  const res = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identity, password: PASSWORD }),
  });
  return res.data;
}