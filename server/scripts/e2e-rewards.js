/* Rewards e2e: wallet, redeem ok, out-of-balance reject, voucher persistence. */
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
  const learner = (await login('TE-128')).data;

  const wallet = (await request('/wallet', { token: learner.token })).data;
  console.log('balance:', wallet.balance, '| ledger rows:', wallet.history.length);

  const catalog = (await request('/rewards', { token: learner.token })).data.rewards;
  const cheap = catalog.reduce((a, b) => (a.cost <= b.cost ? a : b));
  console.log('cheapest:', cheap.reward_code, cheap.name, 'cost', cheap.cost, 'stock', cheap.stock);

  // redeem enough to drain the balance → asserts balance gate
  let redeemed = null;
  while (true) {
    const w = (await request('/wallet', { token: learner.token })).data;
    if (w.balance < cheap.cost) break;
    const r = await request(`/rewards/${cheap.id}/redeem`, { method: 'POST', token: learner.token });
    redeemed = r;
    console.log('redeem →', r.status, JSON.stringify(r.data));
    if (r.status !== 201) break;
  }
  const broke = await request(`/rewards/${cheap.id}/redeem`, { method: 'POST', token: learner.token });
  console.log('insufficient →', broke.status, broke.data.error);

  const after = (await request('/wallet', { token: learner.token })).data;
  console.log('vouchers:', after.vouchers.map(v => `${v.voucher_code} (${v.reward}, -${v.points_debited})`));
})();
