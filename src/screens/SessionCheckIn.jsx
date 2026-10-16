import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { QrCode, Smartphone, Play, Square, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SessionCheckIn({ role, showToast }) {
  const [active, setActive] = useState(false);
  const [otp, setOtp] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    let interval = null;
    if (active && !finished) {
      interval = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [active, finished]);

  const formatTime = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h > 0 ? `${h}:` : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    if (role === 'learner' && otp.length === 6) {
      setActive(true);
      showToast('Session verified and started!', 'success');
    } else if (role === 'tutor') {
      setActive(true);
      showToast('Session verified and started!', 'success');
    }
  };

  const handleEnd = () => {
    setFinished(true);
    setActive(false);
    if (role === 'tutor') {
      showToast('Session ended. +50 Community Points awarded!', 'success');
    }
  };

  if (finished) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12">
        <h2 className="text-3xl font-bold text-primary mb-2">Session Completed!</h2>
        <p className="text-muted-foreground mb-8 text-lg">Total Time: <span className="font-mono font-bold text-charcoal">{formatTime(seconds)}</span></p>
        
        <Card className="w-full max-w-md shadow-lg border-border">
          <CardContent className="p-8 text-center space-y-6">
            <h3 className="text-xl font-semibold text-charcoal">Rate this session</h3>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <Star key={star} className="w-10 h-10 text-slate-300 hover:text-secondary hover:fill-secondary cursor-pointer transition-colors" />
              ))}
            </div>
            {role === 'tutor' && (
              <div className="bg-secondary/10 text-secondary-foreground p-4 rounded-lg border border-secondary/20 mt-6">
                <p className="font-bold text-lg">+50 Community Points</p>
                <p className="text-sm">Added to your wallet</p>
              </div>
            )}
            <Button className="w-full mt-4" size="lg">Submit Feedback</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 flex flex-col h-full">
      <h2 className="text-3xl font-bold text-primary mb-8 text-center">Dual-Confirmation Check-In</h2>

      <div className="flex-1 grid md:grid-cols-2 gap-8 items-start">
        {/* Tutor Side Mock */}
        <Card className={`shadow-md border-2 transition-all ${role === 'tutor' ? 'border-primary shadow-xl ring-4 ring-primary/10' : 'border-border opacity-60 pointer-events-none'}`}>
          <CardContent className="p-8 text-center flex flex-col items-center h-full min-h-[400px]">
            <h3 className="text-xl font-bold text-charcoal mb-2">Tutor Device</h3>
            <p className="text-sm text-muted-foreground mb-8">Generate Code for Learner</p>
            
            {active ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-6 w-full">
                <div className="w-48 h-48 rounded-full border-8 border-emerald/20 flex items-center justify-center">
                  <span className="text-4xl font-mono font-bold text-emerald">{formatTime(seconds)}</span>
                </div>
                <p className="text-emerald font-semibold animate-pulse">Session Active</p>
                <Button variant="destructive" size="lg" className="w-full" onClick={handleEnd}>
                  <Square className="w-4 h-4 mr-2 fill-current" /> End Session
                </Button>
              </div>
            ) : (
              <div className="space-y-6 flex flex-col items-center">
                <div className="bg-white p-4 border border-border shadow-sm rounded-xl inline-block">
                  <QrCode className="w-32 h-32 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Or use OTP Code</p>
                  <p className="text-4xl font-mono font-bold tracking-widest text-primary bg-slate-100 py-3 px-6 rounded-lg border border-border inline-block shadow-inner">
                    842-195
                  </p>
                </div>
                {role === 'tutor' && <Button className="w-full mt-4" onClick={handleStart}>Simulate Learner Verify</Button>}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Learner Side Mock */}
        <Card className={`shadow-md border-2 transition-all ${role === 'learner' ? 'border-primary shadow-xl ring-4 ring-primary/10' : 'border-border opacity-60 pointer-events-none'}`}>
          <CardContent className="p-8 text-center flex flex-col items-center h-full min-h-[400px]">
            <h3 className="text-xl font-bold text-charcoal mb-2">Learner Device</h3>
            <p className="text-sm text-muted-foreground mb-8">Enter Code from Tutor</p>
            
            {active ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-6 w-full">
                <div className="w-48 h-48 rounded-full border-8 border-primary/10 flex items-center justify-center">
                  <span className="text-4xl font-mono font-bold text-primary">{formatTime(seconds)}</span>
                </div>
                <p className="text-primary font-semibold">Learning in Progress...</p>
                <Button variant="outline" size="lg" className="w-full border-crimson text-crimson hover:bg-crimson/10" onClick={handleEnd}>
                  Leave Session
                </Button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center space-y-8 w-full max-w-[250px]">
                <Smartphone className="w-16 h-16 text-muted-foreground" />
                <div className="w-full">
                  <Input 
                    type="text" 
                    placeholder="XXX-XXX" 
                    className="text-center text-3xl font-mono tracking-widest h-16 shadow-inner bg-slate-50 border-2 focus-visible:border-primary focus-visible:ring-primary/20"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9-]/g, '').slice(0, 7))}
                    maxLength={7}
                  />
                </div>
                <Button 
                  size="lg" 
                  className="w-full shadow-md text-lg h-14" 
                  disabled={otp.length < 6}
                  onClick={handleStart}
                >
                  Verify & Start
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
