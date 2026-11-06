"use client";
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Award, ShoppingBag, Coffee, Printer, Ticket, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const catalogItems = [
  { id: 1, title: 'Cafeteria Voucher', description: '₱100 off your next meal at the Main Canteen.', points: 200, icon: Coffee, color: 'bg-orange-100 text-orange-600' },
  { id: 2, title: 'Printing Credits', description: '50 pages of free printing at the Library.', points: 150, icon: Printer, color: 'bg-blue-100 text-blue-600' },
  { id: 3, title: 'LCCB Lanyard', description: 'Exclusive official LCCB Academix lanyard.', points: 500, icon: Award, color: 'bg-secondary/20 text-secondary-foreground' },
  { id: 4, title: 'Event Pass', description: 'VIP seating for the upcoming Tech Symposium.', points: 800, icon: Ticket, color: 'bg-purple-100 text-purple-600' },
];

export default function RewardCatalog({ showToast }) {
  const [balance, setBalance] = useState(1250);
  const [redeeming, setRedeeming] = useState(null);
  const [voucher, setVoucher] = useState(null);

  const handleRedeem = (item) => {
    if (balance >= item.points) {
      setBalance(b => b - item.points);
      setVoucher(item);
      showToast(`Successfully redeemed ${item.title}!`, 'success');
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
              <p className="font-semibold text-primary text-lg mb-6">{voucher.title}</p>
              
              <div className="w-48 h-24 bg-white border border-border flex flex-col items-center justify-center mb-6 shadow-inner">
                {/* Barcode Mock */}
                <div className="flex gap-1 h-12 items-end justify-center mb-2">
                  {[...Array(20)].map((_, i) => (
                    <div key={i} className="bg-charcoal" style={{ width: `${Math.random() * 4 + 1}px`, height: '100%' }} />
                  ))}
                </div>
                <span className="font-mono text-xs tracking-widest">LCCB-ACDX-094</span>
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
    <div className="pb-20">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-primary">Community Reward Catalog</h2>
        <p className="text-muted-foreground">Exchange your earned points for campus perks and exclusive merchandise.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {catalogItems.map(item => (
          <Card key={item.id} className="group hover:border-primary hover:shadow-lg transition-all flex flex-col relative overflow-hidden">
            <div className="p-6 pb-0 mb-4 flex justify-between items-start">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${item.color} shadow-sm group-hover:scale-110 transition-transform`}>
                <item.icon className="w-7 h-7" />
              </div>
              <Badge variant="secondary" className="font-bold text-sm px-3 py-1 bg-secondary text-secondary-foreground">
                {item.points} pts
              </Badge>
            </div>
            <CardHeader className="pt-0">
              <CardTitle className="text-xl group-hover:text-primary transition-colors">{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
            <CardFooter className="mt-auto pt-4 border-t border-border bg-slate-50">
              <Button 
                className="w-full" 
                variant={balance >= item.points ? 'default' : 'secondary'}
                disabled={balance < item.points}
                onClick={() => handleRedeem(item)}
              >
                {balance >= item.points ? 'Redeem Reward' : 'Need More Points'}
              </Button>
            </CardFooter>
          </Card>
        ))}
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
              <p className="text-2xl font-bold text-charcoal">{balance} <span className="text-sm font-normal text-muted-foreground">pts</span></p>
            </div>
          </div>
          <div className="hidden sm:block">
            <p className="text-sm text-muted-foreground text-right">Keep tutoring to earn more points!</p>
            <p className="text-xs text-primary font-medium text-right mt-1">+50 pts per completed session</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
