import React, { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Copy, Check, Loader2, Star } from 'lucide-react';
import { cn } from '../lib/utils';
import api from '../api';

const formatTime = (totalSeconds) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h > 0 ? `${h}:` : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const fmtDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
};

const SessionStatus = ({ status, active }) => {
  const label = active ? 'in progress' : status === 'in-progress' ? 'in progress' : 'awaiting check-in';
  return (
    <span className="status-pill capitalize">
      <span className={cn('status-dot', active || status === 'in-progress' ? 'bg-emerald' : 'bg-amber')} />
      {label}
    </span>
  );
};

export default function SessionCheckIn({ role, showToast }) {
  const [active, setActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [sessions, setSessions] = useState(null);
  const [sessionsError, setSessionsError] = useState(null);
  const [target, setTarget] = useState(null);
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
      .then(({ sessions: rows }) => {
        if (cancelled) return;
        setSessions(rows);
        const next = rows.find(s => s.status === 'upcoming') || rows.find(s => s.status === 'in-progress');
        if (next) setTarget(next);
      })
      .catch((e) => { if (!cancelled) setSessionsError(e.message || 'Failed to load sessions'); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let interval = null;
    if (active) interval = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [active]);

  const eligible = (sessions ?? []).filter(s => s.status === 'upcoming' || s.status === 'in-progress');

  const handleStage = async () => {
    if (!target) return;
    setStaging(true);
    try {
      const res = await api.post(`/sessions/${target.id}/stage-token`, { method: 'otp' });
      setStagedToken(res.token);
      setConfirmations(res.confirmations ?? 0);
      showToast('Code issued. Share it with the learner.', 'success');
    } catch (e) {
      showToast(e.message || 'Could not issue a code', 'error');
    } finally {
      setStaging(false);
    }
  };

  const handleCheckIn = async () => {
    if (!target || !otp.trim()) return;
    setCheckingIn(true);
    try {
      const res = await api.post(`/sessions/${target.id}/check-in`, { token: otp.trim(), method: 'otp' });
      setConfirmations(res.confirmations);
      if (res.sessionStarted) {
        setActive(true);
        showToast('Both devices verified. The session timer has started.', 'success');
      } else {
        showToast(`Verified. Waiting for the other device (${res.confirmations}/2).`, 'info');
      }
    } catch (e) {
      showToast(e.message || 'Invalid code', 'error');
    } finally {
      setCheckingIn(false);
      api.get('/sessions/mine').then(({ sessions: rows }) => {
        setSessions(rows);
        const fresh = rows.find(s => s.id === target.id);
        if (fresh) setTarget(fresh);
      }).catch(() => {});
    }
  };

  const handleEnd = () => {
    setFinished(true);
    setActive(false);
    showToast(`Session ended at ${formatTime(seconds)}. Complete the wrap-up.`, 'success');
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
      showToast(res.referralResolved ? 'Session wrapped — the referral is now resolved.' : 'Session wrapped. The ledger is updated.', 'success');
    } catch (e) {
      showToast(e.message || 'Wrap-up failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (finished) {
    return (
      <div className="mx-auto w-full max-w-[760px]">
        <div className="section-head">
          <div>
            <h1 className="section-title">Session wrap-up</h1>
            <p className="section-subtitle">Close the record, rate the hour, and post the points.</p>
          </div>
          <span className="status-pill"><span className="status-dot bg-emerald" /> Ended</span>
        </div>

        <div className="panel p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b-2 border-ink pb-6">
            <div>
              <p className="text-[13px] font-semibold text-muted-foreground">Total time</p>
              <p className="num mt-1 text-[44px] leading-none text-ink">{formatTime(seconds)}</p>
            </div>
            <div className="text-right">
              <p className="text-[13px] text-muted-foreground">{target?.session_code}</p>
              <p className="mt-1 text-[14px] text-ink">{target?.subject} · {target?.topic}</p>
            </div>
          </div>

          <div className="mt-6">
            <p className="field-label">How was the session?</p>
            <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Session rating">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  role="radio"
                  aria-checked={wrapRating === star}
                  aria-label={`${star} out of 5`}
                  className={cn(
                    'grid h-10 w-10 place-items-center border-2 border-ink transition-colors',
                    wrapRating >= star ? 'bg-gold' : 'bg-paper hover:bg-[#fff7d6]'
                  )}
                  onClick={() => setWrapRating(star)}
                >
                  <Star
                    className={cn('h-6 w-6', wrapRating >= star ? 'fill-ink text-ink' : 'text-ink/30')}
                    strokeWidth={1.8}
                  />
                </button>
              ))}
              <span className="num ml-2 text-[13px] text-muted-foreground">{wrapRating ? `${wrapRating} / 5` : 'Not rated'}</span>
            </div>
            <p className="mt-1 text-[13px] text-muted-foreground">1 = not yet clear, 5 = clear and useful.</p>
          </div>

          {role === 'tutor' && (
            <div className="mt-5">
              <label className="field-label" htmlFor="wrap-notes">Session notes (optional)</label>
              <textarea
                id="wrap-notes"
                className="textarea-field"
                placeholder="What was covered, and what should the learner review next?"
                value={wrapNotes}
                onChange={(e) => setWrapNotes(e.target.value)}
              />
            </div>
          )}

          {Array.isArray(wrapResult?.badges) && wrapResult.badges.length > 0 && (
            <div className="mt-5 flex items-start gap-2.5 border-2 border-ink bg-[#f8f1e2] px-4 py-3 text-[13px] text-ink shadow-[3px_3px_0_#0f2942]">
              <span className="mt-1 h-2 w-2 shrink-0 border border-ink bg-gold" />
              Badge unlocked — {wrapResult.badges.join(', ')}.
            </div>
          )}

          {!wrapResult && (
            <div className="mt-5 flex flex-wrap items-baseline justify-between gap-2 border-2 border-ink bg-gold px-4 py-3">
              <p className="text-[13px] font-semibold text-ink">On submit: <span className="num">+50</span> points to the tutor, <span className="num">+25</span> attendance points to the learner.</p>
              <p className="text-[13px] text-ink/70">Entries are append-only.</p>
            </div>
          )}

          {wrapResult ? (
            <div className="mt-5 flex items-center gap-2 text-[14px] text-ink">
              <Check className="h-4 w-4" strokeWidth={2} />
              Wrap-up saved{wrapResult.referralResolved ? ' — the referral is resolved' : ''}.
              {role === 'tutor' && wrapResult.tutorBalance != null ? <span className="num text-muted-foreground">Balance {wrapResult.tutorBalance} pts.</span> : null}
            </div>
          ) : (
            <Button
              size="lg"
              className="mt-6 w-full"
              disabled={submitting || wrapRating < 1}
              onClick={handleSubmitWrap}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} /> : null}
              {submitting ? 'Saving…' : 'Save wrap-up'}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[980px]">
      <div className="section-head">
        <div>
          <h1 className="section-title">Session check-in</h1>
          <p className="section-subtitle">Two devices, one code. The hour starts only when both match.</p>
        </div>
        {target && <SessionStatus status={target.status} active={active} />}
      </div>

      {sessionsError && <div className="panel px-5 py-4 text-[14px] text-crimson">Sessions could not be read: {sessionsError}</div>}
      {sessions === null && !sessionsError && <div className="panel empty">Reading your sessions…</div>}
      {sessions !== null && !target && (
        <div className="panel empty">
          No upcoming sessions. {role === 'learner' ? 'Book one from Find a tutor.' : 'Confirmed bookings will appear here.'}
        </div>
      )}

      {target && (
        <>
          <div className="panel mb-4 border-t-8 border-t-gold p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[13px] font-semibold text-muted-foreground">{target.session_code}</p>
                <h2 className="mt-1 font-display text-[22px] font-extrabold leading-tight tracking-[-0.03em]">{target.subject} — {target.topic}</h2>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  {fmtDate(target.date)} · {target.time} · {target.location} · {target.duration}
                </p>
              </div>
              {eligible.length > 1 ? (
                <label className="text-[13px] text-muted-foreground">
                  Session
                  <select
                    className="select-field mt-1 min-w-[240px]"
                    value={target.id}
                    onChange={(event) => {
                      const next = eligible.find(s => s.id === event.target.value);
                      if (next) {
                        setTarget(next);
                        setStagedToken(null);
                        setOtp('');
                        setConfirmations(0);
                        setActive(false);
                        setSeconds(0);
                      }
                    }}
                  >
                    {eligible.map(session => (
                      <option key={session.id} value={session.id}>
                        {session.subject_code || session.subject} · {fmtDate(session.date)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="text-right">
                  <p className="text-[13px] text-muted-foreground">{target.learner_name && role === 'tutor' ? target.learner_name : target.tutor_name}</p>
                  <p className="mt-1 text-[13px] text-muted-foreground">Both parties must confirm</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Tutor device */}
            <div className={cn('panel p-5', role !== 'tutor' && 'bg-[#f4eedf]')}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-[18px] font-extrabold tracking-[-0.03em]">Tutor device</h2>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">Generate the shared code.</p>
                </div>
                <span className="status-pill">{role === 'tutor' ? 'This device' : 'Other device'}</span>
              </div>

              <div className="mt-6">
                {active ? (
                  <div className="py-4 text-center">
                    <p className="text-[13px] font-semibold text-muted-foreground">Elapsed</p>
                    <p className="num mt-2 text-[52px] leading-none text-ink">{formatTime(seconds)}</p>
                    <p className="mt-3 flex items-center justify-center gap-2 text-[13px] font-semibold text-muted-foreground">
                      <span className="h-2 w-2 border border-ink bg-emerald" /> Session in progress
                    </p>
                    <Button variant="outline" className="mt-6 w-full" onClick={handleEnd}>End session</Button>
                  </div>
                ) : role !== 'tutor' ? (
                  <div className="flex min-h-[200px] flex-col items-center justify-center text-center">
                    <p className="max-w-[30ch] text-[14px] text-muted-foreground">
                      The tutor opens this screen and generates a one-time code. It expires after ten minutes.
                    </p>
                  </div>
                ) : stagedToken ? (
                  <div className="text-center">
                    <p className="text-[13px] font-semibold text-muted-foreground">Learner code</p>
                    <div className="mt-2 flex items-center justify-center gap-2">
                      <p className="num border-2 border-ink bg-gold px-5 py-3 text-[28px] tracking-[0.16em] text-ink shadow-[3px_3px_0_#0f2942]">{stagedToken}</p>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Copy code"
                        onClick={() => { navigator.clipboard?.writeText(stagedToken); showToast('Code copied.', 'info'); }}
                      >
                        <Copy className="h-4 w-4" strokeWidth={1.6} />
                      </Button>
                    </div>
                    <p className="mt-3 text-[13px] text-muted-foreground" aria-live="polite">
                      {confirmations}/2 confirmed · waiting for the learner
                    </p>
                    <Button className="mt-5 w-full" variant="outline" onClick={handleStage} disabled={staging}>
                      {staging ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} /> : null}
                      Issue a new code
                    </Button>
                  </div>
                ) : (
                  <div className="flex min-h-[200px] flex-col items-center justify-center">
                    <p className="max-w-[30ch] text-center text-[14px] text-muted-foreground">
                      Issue a one-time code, show it to the learner, and both devices confirm before the clock starts.
                    </p>
                    <Button className="mt-5 w-full" onClick={handleStage} disabled={staging}>
                      {staging ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} /> : null}
                      Generate code
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Learner device */}
            <div className={cn('panel p-5', role !== 'learner' && 'bg-[#f4eedf]')}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-[18px] font-extrabold tracking-[-0.03em]">Learner device</h2>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">Enter the code from the tutor.</p>
                </div>
                <span className="status-pill">{role === 'learner' ? 'This device' : 'Other device'}</span>
              </div>

              <div className="mt-6">
                {active ? (
                  <div className="py-4 text-center">
                    <p className="text-[13px] font-semibold text-muted-foreground">Elapsed</p>
                    <p className="num mt-2 text-[52px] leading-none text-ink">{formatTime(seconds)}</p>
                    <p className="mt-3 flex items-center justify-center gap-2 text-[13px] font-semibold text-muted-foreground">
                      <span className="h-2 w-2 border border-ink bg-emerald" /> Learning in progress
                    </p>
                    <Button variant="outline" className="mt-6 w-full" onClick={handleEnd}>End session</Button>
                  </div>
                ) : role !== 'learner' ? (
                  <div className="flex min-h-[200px] flex-col items-center justify-center text-center">
                    <p className="max-w-[30ch] text-[14px] text-muted-foreground">
                      The learner enters the six-digit code on their own device. Both confirmations must land.
                    </p>
                  </div>
                ) : (
                  <div className="flex min-h-[200px] flex-col justify-center">
                    <label className="field-label" htmlFor="otp">One-time code</label>
                    <Input
                      id="otp"
                      type="text"
                      inputMode="numeric"
                      placeholder="000 000"
                      className="num h-14 text-center text-[24px] tracking-[0.22em]"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/[^0-9-]/g, '').slice(0, 13))}
                    />
                    <p className="mt-2 text-[13px] text-muted-foreground">Ask your tutor for the code. It expires after ten minutes.</p>
                    <Button className="mt-5 w-full" disabled={checkingIn || !otp.trim()} onClick={handleCheckIn}>
                      {checkingIn ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} /> : <Check className="h-4 w-4" strokeWidth={2} />}
                      {checkingIn ? 'Verifying…' : 'Verify check-in'}
                    </Button>
                    {confirmations > 0 && (
                      <p className="mt-2 text-[13px] text-muted-foreground" aria-live="polite">{confirmations}/2 confirmed.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <p className="mt-4 text-[13px] text-muted-foreground">
            The timer is shared. Either participant can end the session; the wrap-up posts the points.
          </p>
        </>
      )}
    </div>
  );
}
