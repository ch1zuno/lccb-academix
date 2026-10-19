import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { QrCode, Smartphone, Play, Square, Star, Loader2, ClipboardCopy, CheckCircle2 } from 'lucide-react';
import api from '../api';

const formatTime = (totalSeconds) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h > 0 ? `${h}:` : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export default function SessionCheckIn({ role, showToast }) {
  const [active, setActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [sessions, setSessions] = useState(null); // from /sessions/mine
  const [sessionsError, setSessionsError] = useState(null);
  const [target, setTarget] = useState(null);     // picked upcoming session
  const [stagedToken, setStagedToken] = useState(null);
  const [staging, setStaging] = useState(false);
  const [otp, setOtp] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);
  const [confirmations, setConfirmations] = useState(0);
  const [finished, setFinished] = useState(false);
  const [wrapRating, setWrapRating] = useState(0);
  const [wrapNotes, setWrapNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [wrapResult, setWrapResult] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.get('/sessions/mine')
      .then(({ sessions }) => {
        if (cancelled) return;
        setSessions(sessions);
        const upcoming = sessions.find(s => s.status === 'upcoming');
        if (upcoming) setTarget(upcoming);
      })
      .catch((e) => { if (!cancelled) setSessionsError(e.message || 'Failed to load sessions'); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let interval = null;
    if (active) interval = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [active]);

  const reset = () => {
    setActive(false);
    setSeconds(0);
    setConfirmations(0);
    setStagedToken(null);
    setOtp('');
  };

  const handleStage = async () => {
    if (!target) return;
    setStaging(true);
    try {
      const res = await api.post(`/sessions/${target.id}/stage-token`, { method: 'otp' });
      setStagedToken(res.token);
      setConfirmations(res.confirmations ?? 0);
      showToast('Session token issued — share it with the learner', 'success');
    } catch (e) {
      showToast(e.message || 'Could not issue token', 'error');
    } finally {
      setStaging(false);
    }
  };

  const handleCheckIn = async () => {
    if (!target || !otp.trim()) return;
    setCheckingIn(true);
    try {
      const cleaned = otp.trim();
      const res = await api.post(`/sessions/${target.id}/check-in`, { token: cleaned, method: 'otp' });
      setConfirmations(res.confirmations);
      if (res.sessionStarted) {
        setActive(true);
        showToast('Both parties verified — session started!', 'success');
      } else {
        showToast(`Verified. Waiting for other party (${res.confirmations}/2).`, 'info');
      }
    } catch (e) {
      showToast(e.message || 'Invalid code', 'error');
    } finally {
      setCheckingIn(false);
      setTarget(t => t); // refresh visual state; counts come from API
      setSessions(null);
      api.get('/sessions/mine').then(({ sessions: rows }) => {
        setSessions(rows);
        const fresh = rows.find(s => s.id === target.id);
        if (fresh) setTarget(fresh);
      });
    }
  };

  const handleEnd = () => {
    setFinished(true);
    setActive(false);
    showToast(`Session ended (${formatTime(seconds)}). Complete the wrap-up.`, 'success');
  };

  const handleSubmitWrap = async () => {
    if (!target || wrapRating < 1) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/sessions/${target.id}/wrap-up`, {
        notes: role === 'tutor' ? wrapNotes : undefined,
        rating: wrapRating,
      });
      setWrapResult(res);
      showToast(res.referralResolved
        ? 'Session wrapped — referral fully resolved! 🎉'
        : `Session wrapped. +${res.points} points recorded.`, 'success');
    } catch (e) {
      showToast(e.message || 'Wrap-up failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (finished) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12">
        <h2 className="text-3xl font-bold text-primary mb-2">Session Completed!</h2>
        <p className="text-muted-foreground mb-8 text-lg">Total Time: <span className="font-mono font-bold text-charcoal">{formatTime(seconds)}</span></p>
        <Card className="w-full max-w-md shadow-lg border-border">
          <CardContent className="p-8 text-center space-y-6">
            <h3 className="text-xl font-semibold text-charcoal">
              {role === 'tutor' ? 'Leave session notes & rate' : 'Rate this session'}
            </h3>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map(star => (
                <Star
                  key={star}
                  className={`w-10 h-10 cursor-pointer transition-colors ${(wrapRating >= star) ? 'text-secondary fill-secondary' : 'text-slate-300 hover:text-secondary'}`}
                  onClick={() => setWrapRating(star)}
                />
              ))}
            </div>
            {role === 'tutor' && (
              <textarea
                className="input-field w-full min-h-[80px] text-sm"
                placeholder="Session notes for the student record…"
                value={wrapNotes}
                onChange={(e) => setWrapNotes(e.target.value)}
              />
            )}
            {Array.isArray(wrapResult?.badges) && wrapResult.badges.length > 0 && (
              <div className="bg-secondary/10 text-secondary-foreground p-3 rounded-lg border border-secondary/20 text-sm">
                🏅 Badge unlocked: <strong>{wrapResult.badges.join(', ')}</strong>
              </div>
            )}
            {role === 'tutor' && !wrapResult && (
              <div className="bg-secondary/10 text-secondary-foreground p-4 rounded-lg border border-secondary/20 mt-2">
                <p className="font-bold text-lg">+50 Community Points</p>
                <p className="text-sm">Added to your wallet on submit</p>
              </div>
            )}
            {wrapResult ? (
              <div className="text-sm text-emerald font-semibold pt-2">
                ✅ Wrap-up saved{wrapResult.referralResolved ? ' — referral resolved' : ''}
                {role === 'tutor' ? ` • wallet balance ${wrapResult.tutorBalance} pts` : ''}
              </div>
            ) : (
              <Button
                className="w-full mt-4"
                size="lg"
                disabled={submitting || wrapRating < 1}
                onClick={handleSubmitWrap}
              >
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {submitting ? 'Submitting…' : 'Submit Feedback'}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 flex flex-col h-full">
      <h2 className="text-3xl font-bold text-primary mb-8 text-center">Dual-Confirmation Check-In</h2>

      {sessionsError && (
        <Card><CardContent className="p-6 text-center text-crimson">Failed to load sessions: {sessionsError}</CardContent></Card>
      )}
      {sessions === null && !sessionsError && (
        <Card><CardContent className="p-6 text-center text-muted-foreground">Loading sessions…</CardContent></Card>
      )}
      {sessions !== null && !target && (
        <Card><CardContent className="p-6 text-center text-muted-foreground">
          No upcoming sessions. {role === 'learner' ? 'Book one in “Find a Tutor”.' : 'Accepted bookings will appear here.'}
        </CardContent></Card>
      )}

      {target && (
        <>
          <div className="text-center mb-6">
            <p className="text-sm text-muted-foreground">
              {target.session_code} • {target.subject} • {new Date(target.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} {target.time} •{' '}
              <span className={`ml-2 font-semibold ${target.status === 'in-progress' ? 'text-emerald' : 'text-amber'}`}>
                {target.status === 'in-progress' ? 'In Progress' : 'Awaiting Check-in'}
              </span>
            </p>
          </div>

          <div className="flex-1 grid md:grid-cols-2 gap-8 items-start">
            {/* Tutor Side */}
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
                    {stagedToken ? (
                      <div>
                        <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-2">Learner OTP Code</p>
                        <div className="flex items-center gap-2">
                          <p className="text-4xl font-mono font-bold tracking-widest text-primary bg-slate-100 py-3 px-6 rounded-lg border border-border inline-block shadow-inner">
                            {stagedToken}
                          </p>
                          <Button variant="ghost" size="icon" aria-label="copy" onClick={() => { navigator.clipboard?.writeText(stagedToken); }}>
                            <ClipboardCopy className="w-5 h-5" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald" />
                          {confirmations}/2 verified — waiting for learner
                          <span className="mx-1">•</span>
                          <Loader2 className="w-3 h-3 animate-spin" />
                        </p>
                      </div>
                    ) : (
                      <Button className="w-full mt-4" disabled={staging} onClick={handleStage}>
                        {staging ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                        {staging ? 'Generating…' : 'Generate Code'}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Learner Side */}
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
                        placeholder="6-6 digits"
                        className="text-center text-2xl font-mono tracking-widest h-16 shadow-inner bg-slate-50 border-2 focus-visible:border-primary focus-visible:ring-primary/20"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/[^0-9-]/g, '').slice(0, 13))}
                      />
                    </div>
                    <Button className="w-full" disabled={checkingIn || !otp.trim() || role !== 'learner'} onClick={handleCheckIn}>
                      {checkingIn ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                      {checkingIn ? 'Verifying…' : 'Verify Check-In'}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
