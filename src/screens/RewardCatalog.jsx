import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Award, ShoppingBag, Coffee, Printer, Ticket, CheckCircle2, Gift, BookOpen, Star, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { REWARDS } from '../data';

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
  const [balance, setBalance] = useState(2450);
  const [voucher, setVoucher] = useState(null);
  const [filter, setFilter] = useState('All');

  const categories = ['All', ...new Set(REWARDS.map(r => r.category))];
  const filteredRewards = filter === 'All' ? REWARDS : REWARDS.filter(r => r.category === filter);

  const handleRedeem = (item) => {
    if (balance >= item.cost) {
      setBalance(b => b - item.cost);
      setVoucher(item);
      showToast(`Successfully redeemed ${item.name}!`, 'success');
    } else {
      showToast('Insufficient points.', 'error');
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
                <span className="font-mono text-xs tracking-widest">LCCB-ACDX-{String(Math.floor(Math.random() * 999)).padStart(3, '0')}</span>
              </div>
              
              <div className="bg-emerald/10 text-emerald border border-emerald/20 rounded-lg p-3 w-full mb-4">
                <p className="text-sm font-semibold">−{voucher.cost} pts deducted</p>
                <p className="text-xs">Remaining balance: {balance} pts</p>
              </div>
              
              <p className="text-sm text-muted-foreground">Present this voucher to the designated claim counter.</p>
            </CardContent>
          </Card>
          <div className="mt-8 text-center">
            <Button onClick={() => setVoucher(null)}>Back to Catalog</Button>
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
                    variant={balance >= item.cost ? 'default' : 'secondary'}
                    disabled={balance < item.cost}
                    onClick={() => handleRedeem(item)}
                  >
                    {balance >= item.cost ? 'Redeem Reward' : `Need ${item.cost - balance} more pts`}
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Sticky Wallet Footer */}
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
