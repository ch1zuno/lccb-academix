import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Loader2, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import api from '../api';

const fmt = (value) => new Intl.NumberFormat('en-US').format(Number(value) || 0);

export default function RewardCatalog({ showToast }) {
  const [rewards, setRewards] = useState(null);
  const [error, setError] = useState(null);
  const [balance, setBalance] = useState(0);
  const [voucher, setVoucher] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [filter, setFilter] = useState('All');

  const loadCatalog = () => {
    setError(null);
    api.get('/rewards')
      .then(({ rewards: rows }) => {
        setRewards(rows);
        setBalance(Number(rows[0]?.my_balance ?? 0));
      })
      .catch((e) => setError(e.message));
    api.get('/wallet')
      .then(({ balance: value }) => setBalance(Number(value) || 0))
      .catch(() => {});
  };

  useEffect(loadCatalog, []);

  const categories = ['All', ...new Set((rewards ?? []).map(reward => reward.category))];
  const filteredRewards = filter === 'All' ? (rewards ?? []) : (rewards ?? []).filter(reward => reward.category === filter);

  const handleRedeem = async (item) => {
    setBusyId(item.id);
    try {
      const res = await api.post(`/rewards/${item.id}/redeem`);
      setBalance(Number(res.balance) || 0);
      setVoucher({ ...item, voucher_code: res.voucher, stock: res.stock });
      setRewards(rows => rows.map(row => (row.id === item.id ? { ...row, stock: res.stock } : row)));
      showToast(`Redeemed ${item.name}. Voucher ${res.voucher}.`, 'success');
    } catch (e) {
      showToast(e.message || 'Redemption failed.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  if (voucher) {
    return (
      <div className="mx-auto w-full max-w-[560px]">
        <div className="section-head">
          <div>
            <h1 className="section-title">Claim voucher</h1>
            <p className="section-subtitle">Show this at the designated counter. Each code is issued once.</p>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} className="panel overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b-2 border-ink bg-gold px-5 py-3 text-ink">
            <span className="text-[13px] font-bold uppercase tracking-[0.02em]">LCCB Academix · claim slip</span>
            <span className="text-[13px] font-semibold">Redeemed</span>
          </div>
          <div className="p-6">
            <p className="text-[13px] font-semibold text-muted-foreground">Voucher code</p>
            <p className="num mt-1 inline-block border-2 border-ink bg-[#fff7d6] px-2 py-1 text-[28px] leading-tight tracking-[0.08em] text-ink shadow-[3px_3px_0_#0f2942]">{voucher.voucher_code}</p>

            <div className="mt-6 border-t-2 border-ink pt-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-[20px] font-extrabold tracking-[-0.03em]">{voucher.name}</h2>
                  <p className="mt-1 max-w-[42ch] text-[13px] leading-snug text-muted-foreground">{voucher.description}</p>
                </div>
                <span className="status-pill shrink-0"><span className="status-dot bg-emerald" /> Active</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 border-t-2 border-ink pt-4">
              <div>
                <p className="text-[13px] text-muted-foreground">Points spent</p>
                <p className="num mt-1 text-[16px]">−{fmt(voucher.cost)} pts</p>
              </div>
              <div className="text-right">
                <p className="text-[13px] text-muted-foreground">Remaining balance</p>
                <p className="num mt-1 text-[16px]">{fmt(balance)} pts</p>
              </div>
            </div>

            <p className="mt-5 flex items-start gap-2 text-[13px] leading-snug text-muted-foreground">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              Present this code to the designated claim counter. The deduction is already on the ledger.
            </p>
          </div>
        </motion.div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => { setVoucher(null); loadCatalog(); }}>Back to catalog</Button>
          <p className="text-[13px] text-muted-foreground">Keep this code until claimed.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="section-head">
        <div>
          <h1 className="section-title">Rewards catalog</h1>
          <p className="section-subtitle">Exchange earned points for campus perks, merchandise, and event passes.</p>
        </div>
        <div className="border-2 border-ink bg-gold px-4 py-2.5 text-right shadow-[3px_3px_0_#0f2942]">
          <p className="text-[13px] font-semibold text-ink/70">Available balance</p>
          <p className="num mt-0.5 text-[24px] leading-tight text-ink">
            {fmt(balance)} <span className="text-[13px] font-normal text-muted-foreground">pts</span>
          </p>
        </div>
      </div>

      {error && (
        <div className="panel mb-4 flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <p className="text-[14px] text-crimson">The catalog could not be read: {error}</p>
          <Button size="sm" variant="outline" onClick={loadCatalog}>Retry</Button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {categories.map(category => (
          <button
            key={category}
            type="button"
            onClick={() => setFilter(category)}
            className={cn(
              'h-9 border-2 border-ink px-3 text-[13px] font-bold shadow-[2px_2px_0_#0f2942] transition-[background-color,transform]',
              filter === category ? 'bg-gold text-ink' : 'bg-paper text-ink hover:-translate-y-0.5 hover:bg-[#fff7d6]',
            )}
          >
            {category}
          </button>
        ))}
        <p className="ml-auto text-[13px] text-muted-foreground">Points post after each completed session.</p>
      </div>

      {rewards === null && !error && <div className="panel empty">Reading the catalog…</div>}

      {rewards !== null && filteredRewards.length === 0 && (
        <div className="panel empty">No rewards in this category yet.</div>
      )}

      {filteredRewards.length > 0 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredRewards.map((item, index) => {
            const canRedeem = balance >= item.cost && item.stock > 0;
            return (
              <motion.article
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.15) }}
                className="panel flex flex-col p-5 transition-transform hover:-translate-y-1"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="border-2 border-ink bg-[#f8f1e2] px-1.5 py-0.5 text-[13px] font-semibold text-ink">{item.category}</span>
                  <span className="num border-2 border-ink bg-gold px-1.5 py-0.5 text-[13px] text-ink">{fmt(item.cost)} pts</span>
                </div>
                <h2 className="mt-3 font-display text-[19px] font-extrabold leading-tight tracking-[-0.03em]">{item.name}</h2>
                <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{item.description}</p>

                <div className="mt-auto flex items-end justify-between gap-3 pt-5">
                  <span className="text-[13px] text-muted-foreground">
                    {item.stock <= 0
                      ? 'Out of stock'
                      : item.stock <= 5
                        ? `Only ${item.stock} left`
                        : `${item.stock} in stock`}
                  </span>
                  <Button
                    variant={canRedeem ? 'default' : 'secondary'}
                    size="sm"
                    disabled={!canRedeem || busyId === item.id}
                    onClick={() => handleRedeem(item)}
                  >
                    {busyId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.8} /> : null}
                    {item.stock <= 0 ? 'Out of stock' : canRedeem ? 'Redeem' : `Need ${fmt(item.cost - balance)} pts`}
                  </Button>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}
    </div>
  );
}
