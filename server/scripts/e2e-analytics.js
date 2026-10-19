/* Analytics + notifications smoke test (superadmin only for /analytics). */
const BASE = 'http://localhost:4000/api';

async function request(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data; try { data = await res.json(); } catch { data = {}; }
  return { status: res.status, data };
}
const login = (loginId) => request('/auth/login', { method: 'POST', body: { loginId, password: 'demo1234' } });

(async () => {
  const sa = (await login('l.betita.admin@lccbacolod.edu.ph')).data;
  const learner = (await login('TE-128')).data;

  const asAdmin = (await request('/analytics', { token: sa.token })).status;
  const asLearner = (await request('/analytics', { token: learner.token })).status;
  const stats = (await request('/analytics', { token: sa.token })).data;
  console.log('analytics as superadmin ->', asAdmin);
  console.log('analytics as learner ->', asLearner, asLearner === 403 ? '(correctly rejected)' : '(ERROR: learner allowed)');
  console.log(JSON.stringify(stats, null, 1).slice(0, 700));

  const notif = (await request('/notifications', { token: learner.token })).data;
  console.log('learner notifications:', notif.notifications.length, 'unread:', notif.unread);
})();
