import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Award, ShoppingBag, Coffee, Printer, Ticket, CheckCircle2, Gift, BookOpen, Star, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api';

const CATEGORY_ICONS = {
  'Campus Perks': Coffee,
  'Merchandise': Gift,
  'Exclusive': Star,
  'Events': Ticket,
};

const CATEGORY_COLORS = {
  'Campus Perks': 'bg-blue-100 text-blue-600',
  'Merchandise': 'bg-purple-100 text-purple-600',
  'Exclusive': 'bg-secondary/20 text-secondary-foreground',
  'Events': 'bg-orange-100 text-orange-600',
};

export default function RewardCatalog({ showToast }) {
  const [rewards, setRewards] = useState(null); // live catalog
  const [error, setError] = useState(null);
  const [balance, setBalance] = useState(0);
  const [voucher, setVoucher] = useState(null); // {name, description, cost, voucher_code, stock}
  const [busyId, setBusyId] = useState(null);
  const [filter, setFilter] = useState('All');

  const loadCatalog = () => {
    api.get('/rewards')
      .then(({ rewards: rows }) => { setRewards(rows); setBalance(rows[0]?.my_balance ?? 0); })
      .catch((e) => { setError(e.message); });
    api.get('/wallet')
      .then(({ balance: b }) => setBalance(b))
      .catch(() => {});
  };

  useEffect(loadCatalog, []);

  const categories = ['All', ...new Set((rewards ?? []).map(r => r.category))];
  const filteredRewards = filter === 'All' ? (rewards ?? []) : (rewards ?? []).filter(r => r.category === filter);

  const handleRedeem = async (item) => {
    setBusyId(item.id);
    try {
      const res = await api.post(`/rewards/${item.id}/redeem`);
      setBalance(res.balance);
      setVoucher({ ...item, voucher_code: res.voucher, stock: res.stock });
      // refresh stock display without refetch
      setRewards(rows => rows.map(r => (r.id === item.id ? { ...r, stock: res.stock } : r)));
      showToast(`Redeemed ${item.name} — voucher ${res.voucher}`, 'success');
    } catch (e) {
      showToast(e.message || 'Redemption failed.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  if (voucher) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12">
        <h2 className="text-3xl font-bold text-primary mb-8">Redemption Successful!</h2>
        
        <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-sm">
          <Card className="border-2 border-dashed border-primary bg-slate-50 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 left-0 w-full h-4 bg-primary" />
            <CardContent className="p-8 text-center flex flex-col items-center">
              <CheckCircle2 className="w-16 h-16 text-emerald mb-4" />
              <h3 className="text-2xl font-bold text-charcoal mb-2">Digital Claim Voucher</h3>
              <p className="font-semibold text-primary text-lg mb-2">{voucher.name}</p>
              <p className="text-sm text-muted-foreground mb-6">{voucher.description}</p>
              
              <div className="w-48 h-24 bg-white border border-border flex flex-col items-center justify-center mb-6 shadow-inner rounded-md">
                {/* Barcode Mock */}
                <div className="flex gap-1 h-12 items-end justify-center mb-2">
                  {[...Array(20)].map((_, i) => (
                    <div key={i} className="bg-charcoal" style={{ width: `${Math.random() * 4 + 1}px`, height: '100%' }} />
                  ))}
                </div>
                <span className="font-mono text-xs tracking-widest">{voucher.voucher_code}</span>
              </div>

              <div className="bg-emerald/10 text-emerald border border-emerald/20 rounded-lg p-3 w-full mb-4">
                <p className="text-sm font-semibold">−{voucher.cost} pts deducted</p>
                <p className="text-xs">Remaining balance: {balance} pts</p>
              </div>
              
              <p className="text-sm text-muted-foreground">Present this voucher to the designated claim counter.</p>
            </CardContent>
          </Card>
          <div className="mt-8 text-center">
            <Button onClick={() => { setVoucher(null); loadCatalog(); }}>Back to Catalog</Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="pb-24">
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-primary">Community Reward Catalog</h2>
        <p className="text-muted-foreground">Exchange your earned points for campus perks and exclusive merchandise.</p>
      </div>

      {/* Category Filter */}
      {error && (
        <Card>
          <CardContent className="p-4 text-center text-crimson flex items-center justify-center gap-3">
            <span>Failed to load the live catalog: {error}</span>
            <Button size="sm" variant="outline" onClick={() => { setError(null); loadCatalog(); }}>Retry</Button>
          </CardContent>
        </Card>
      )}
      <div className="flex gap-2 mb-6 flex-wrap">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filter === cat ? 'bg-primary text-white shadow-md' : 'bg-white border border-border text-charcoal hover:border-primary'}`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRewards.map((item, i) => {
          const IconComp = CATEGORY_ICONS[item.category] || Gift;
          const colorClass = CATEGORY_COLORS[item.category] || 'bg-slate-100 text-slate-600';
          
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className="group hover:border-primary hover:shadow-lg transition-all flex flex-col relative overflow-hidden h-full">
                {item.stock <= 5 && (
                  <div className="absolute top-3 right-3 z-10">
                    <Badge variant="destructive" className="bg-crimson text-xs">Only {item.stock} left</Badge>
                  </div>
                )}
                <div className="p-6 pb-0 mb-4 flex justify-between items-start">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${colorClass} shadow-sm group-hover:scale-110 transition-transform`}>
                    <span className="text-2xl">{item.icon}</span>
                  </div>
                  <Badge variant="secondary" className="font-bold text-sm px-3 py-1 bg-secondary text-secondary-foreground">
                    {item.cost} pts
                  </Badge>
                </div>
                <CardHeader className="pt-0">
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">{item.name}</CardTitle>
                  <CardDescription className="text-xs">{item.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0 pb-2">
                  <Badge variant="outline" className="text-xs text-muted-foreground">{item.category}</Badge>
                </CardContent>
                <CardFooter className="mt-auto pt-4 border-t border-border bg-slate-50">
                  <Button
                    className="w-full"
                    variant={balance >= item.cost && item.stock > 0 ? 'default' : 'secondary'}
                    disabled={balance < item.cost || item.stock <= 0 || busyId === item.id}
                    onClick={() => handleRedeem(item)}
                  >
                    {busyId === item.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    {item.stock <= 0 ? 'Out of stock' : (balance >= item.cost ? 'Redeem Reward' : `Need ${item.cost - balance} more pts`)}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {rewards !== null && filteredRewards.length === 0 && (
        <Card><CardContent className="p-8 text-center text-muted-foreground">No rewards in this category yet.</CardContent></Card>
      )}
      <motion.div 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-border shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] p-4 md:left-[260px] z-30"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="bg-primary p-2 rounded-lg text-primary-foreground">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Available Balance</p>
              <p className="text-2xl font-bold text-charcoal">{balance.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">pts</span></p>
            </div>
          </div>
          <div className="hidden sm:block text-right">
            <p className="text-sm text-muted-foreground">Keep tutoring to earn more points!</p>
            <p className="text-xs text-primary font-medium mt-1">+50 pts per completed session • +25 bonus for 5★ rating</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
