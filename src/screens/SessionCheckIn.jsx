import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Copy, Check, Loader2, Star, Clock, Award, CheckCircle2, UserCheck, ShieldCheck, MapPin, QrCode } from 'lucide-react';
import { cn } from '../lib/utils';
import ErrorBanner from '../components/ui/ErrorBanner';
import { SessionModeBadge } from '../components/SessionModeArtwork';
import { buildQrMatrix } from '../lib/qrSvg';
import { useDraftState } from '../lib/ux';
import api from '../api';

const LiveClassroom = React.lazy(() => import('../components/classroom/LiveClassroom'));

const formatTime = (totalSeconds = 0) => {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h > 0 ? `${h}:` : ''}${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
};

const formatDurationVerbose = (totalSeconds = 0) => {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts = [];
  if (h > 0) parts.push(`${h} hr${h > 1 ? 's' : ''}`);
  if (m > 0) parts.push(`${m} min${m > 1 ? 's' : ''}`);
  if (sec > 0 || parts.length === 0) parts.push(`${sec} sec${sec !== 1 ? 's' : ''}`);
  return parts.join(' ');
};

const RATING_DESCRIPTIONS = {
  1: '1 Star · Poor — Needs significant review and clarification',
  2: '2 Stars · Fair — Fundamental concepts partially grasped',
  3: '3 Stars · Good — Solid progress and helpful review',
  4: '4 Stars · Very Good — Thorough, engaging, and clear instruction',
  5: '5 Stars · Excellent — Outstanding, fully mastered concepts',
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

function InPersonQrCode({ value }) {
  const qr = useMemo(() => {
    try { return buildQrMatrix(value); } catch { return null; }
  }, [value]);
  if (!qr) return null;
  const quiet = 3;
  const dim = qr.size + quiet * 2;
  return (
    <div className="mx-auto inline-block border-2 border-ink bg-white p-2.5 shadow-[3px_3px_0_var(--color-ink)]">
      <svg
        viewBox={`0 0 ${dim} ${dim}`}
        width="164"
        height="164"
        role="img"
        aria-label="In-person session check-in QR code"
        shapeRendering="crispEdges"
      >
        <rect x="0" y="0" width={dim} height={dim} fill="#ffffff" />
        {qr.matrix.map((row, r) =>
          row.map((cell, c) =>
            cell ? <rect key={`${r}-${c}`} x={c + quiet} y={r + quiet} width="1" height="1" fill="#0f2942" /> : null,
          ),
        )}
      </svg>
    </div>
  );
}

export default function SessionCheckIn({ role, user, showToast }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const deepSessionId = searchParams.get('session') || '';
  const deepCode = searchParams.get('code') || '';
  const [active, setActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [sessions, setSessions] = useState(null);
  const [sessionsError, setSessionsError] = useState(null);
  const [target, setTarget] = useState(null);
  const [stagedToken, setStagedToken] = useState(null);
  const [staging, setStaging] = useState(false);
  const [otp, setOtp] = useState(deepCode);
  const [checkingIn, setCheckingIn] = useState(false);
  const [confirmations, setConfirmations] = useState(0);
  const [finished, setFinished] = useState(false);
  const [wrapRating, setWrapRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [wrapNotes, setWrapNotes, clearWrapNotes] = useDraftState('wrapup-notes', '');
  const [submitting, setSubmitting] = useState(false);
  const [wrapResult, setWrapResult] = useState(null);

  const loadSessions = () => {
    setSessionsError(null);
    api.get('/sessions/mine')
      .then(({ sessions: rows }) => {
        setSessions(rows);
        const byParam = deepSessionId ? rows.find((s) => s.id === deepSessionId && (s.status === 'upcoming' || s.status === 'in-progress')) : null;
        const next = byParam || rows.find(s => s.status === 'in-progress') || rows.find(s => s.status === 'upcoming');
        if (next) {
          setTarget(next);
          setConfirmations(Number(next.check_in_count) || 0);
        }
      })
      .catch((e) => { setSessionsError(e.message || 'Failed to load sessions'); });
  };

  useEffect(() => {
    loadSessions();
  }, []);

  // Synchronize timer from backend started_at when target is in-progress
  useEffect(() => {
    if (target?.status === 'in-progress' && !finished) {
      setActive(true);
      if (target.started_at) {
        const startTs = new Date(target.started_at).getTime();
        setSeconds(Math.max(0, Math.floor((Date.now() - startTs) / 1000)));
      }
    }
  }, [target?.id, target?.status, target?.started_at, finished]);

  useEffect(() => {
    let interval = null;
    if (active) interval = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [active]);

  const eligible = (sessions ?? []).filter(s => s.status === 'upcoming' || s.status === 'in-progress');

  const isFaceToFace = target?.mode === 'face_to_face';
  const checkInMethod = isFaceToFace ? 'qr' : 'otp';

  const handleStage = async () => {
    if (!target) return;
    setStaging(true);
    try {
      const res = await api.post(`/sessions/${target.id}/stage-token`, { method: checkInMethod });
      setStagedToken(res.token);
      showToast(
        isFaceToFace
          ? 'In-person QR and code ready. Show this screen to the student.'
          : 'Code issued. Share it with the learner.',
        'success',
      );
    } catch (e) {
      showToast(e.message || 'Could not issue a code', 'error');
    } finally {
      setStaging(false);
    }
  };

  const handleCheckIn = async (explicitToken, { refreshAfterTutor = false } = {}) => {
    let tokenValue = typeof explicitToken === 'string' ? explicitToken.trim() : otp.trim();
    if (!target || !tokenValue) return;
    setCheckingIn(true);
    try {
      let res;
      try {
        res = await api.post(`/sessions/${target.id}/check-in`, { token: tokenValue, method: checkInMethod });
      } catch (firstErr) {
        // If the learner already consumed the displayed one-time code, mint a fresh
        // tutor confirmation token automatically so strict single-use tokens stay smooth.
        if (role === 'tutor' && firstErr?.status === 400) {
          const fresh = await api.post(`/sessions/${target.id}/stage-token`, { method: checkInMethod });
          tokenValue = fresh.token;
          res = await api.post(`/sessions/${target.id}/check-in`, { token: tokenValue, method: checkInMethod });
        } else {
          throw firstErr;
        }
      }
      setConfirmations(res.confirmations);
      if (res.sessionStarted) {
        setActive(true);
        showToast('Both devices verified. The session timer has started.', 'success');
      } else {
        // Tutor confirmed first: mint a fresh one-time code for the learner so the
        // displayed code/QR is always unused and ready.
        if (role === 'tutor' && refreshAfterTutor) {
          const next = await api.post(`/sessions/${target.id}/stage-token`, { method: checkInMethod }).catch(() => null);
          if (next?.token) setStagedToken(next.token);
        }
        showToast(`Verified. Waiting for the other device (${res.confirmations}/2).`, 'info');
      }
    } catch (e) {
      showToast(e.message || 'Invalid code', 'error');
    } finally {
      setCheckingIn(false);
      api.get('/sessions/mine').then(({ sessions: rows }) => {
        setSessions(rows);
        const fresh = rows.find(s => s.id === target.id);
        if (fresh) {
          setTarget(fresh);
          setConfirmations(Number(fresh.check_in_count) || 0);
        }
      }).catch(() => {});
    }
  };

  const handleEnd = (reportedSeconds) => {
    const finalSec = typeof reportedSeconds === 'number' && reportedSeconds > 0 ? reportedSeconds : seconds;
    setSeconds(finalSec);
    setFinished(true);
    setActive(false);
    showToast(`Session call ended at ${formatTime(finalSec)}. View the report below.`, 'success');
  };

  const handleSubmitWrap = async () => {
    if (!target || wrapRating < 1) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/sessions/${target.id}/wrap-up`, {
        notes: role === 'tutor' ? wrapNotes : undefined,
        rating: wrapRating,
        durationSeconds: seconds,
      });
      clearWrapNotes();
      setWrapResult(res);
      showToast(res.referralResolved ? 'Session report saved — referral resolved.' : 'Session report and rating saved to ledger.', 'success');
    } catch (e) {
      showToast(e.message || 'Wrap-up failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (finished) {
    return (
      <div className="mx-auto w-full max-w-[820px]">
        {/* Section Header */}
        <div className="section-head mb-6">
          <div>
            <h1 className="section-title">Session Call Report</h1>
            <p className="section-subtitle">Official tutoring session summary & ledger record.</p>
          </div>
          <span className="status-pill">
            <span className="status-dot bg-emerald" /> {wrapResult ? 'Recorded on Ledger' : 'Call Completed'}
          </span>
        </div>

        {/* Main Report Card */}
        <div className="panel p-6 shadow-[5px_5px_0_var(--color-ink)]">
          {/* Call Duration & Timing Banner */}
          <div className="border-2 border-ink bg-surface-quiet p-5 shadow-[3px_3px_0_var(--color-ink)] mb-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b-2 border-ink/20 pb-4">
              <div>
                <p className="meta uppercase tracking-[0.08em] text-muted-foreground flex items-center gap-1.5 font-bold">
                  <Clock className="h-4 w-4 text-emerald" /> Actual Logged Call Duration
                </p>
                <p className="num mt-1 text-[40px] font-extrabold leading-none text-ink">
                  {formatTime(seconds)}
                </p>
                <p className="text-[13px] font-semibold text-muted-foreground mt-1">
                  {formatDurationVerbose(seconds)}
                </p>
              </div>
              <div className="text-right">
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <SessionModeBadge mode={target?.mode} compact />
                  <span className="status-pill inline-block border-2 border-ink bg-gold text-ink font-bold shadow-[2px_2px_0_var(--color-ink)]">
                    2/2 Devices Verified
                  </span>
                </div>
                <p className="text-[12px] text-muted-foreground mt-2 font-mono">
                  Code: <span className="font-bold text-ink">{target?.session_code}</span> · {target?.venue_name || target?.location}
                </p>
              </div>
            </div>

            {/* Time & Session Details Subgrid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-[13px]">
              <div>
                <p className="text-muted-foreground font-semibold">Subject & Topic</p>
                <p className="font-bold text-ink truncate">{target?.subject}</p>
                <p className="text-muted-foreground text-[12px] truncate">{target?.topic}</p>
              </div>
              <div>
                <p className="text-muted-foreground font-semibold">Tutor</p>
                <p className="font-bold text-ink">{target?.tutor_name || target?.tutor_custom_id}</p>
                <p className="text-muted-foreground text-[12px]">Accredited Peer Tutor</p>
              </div>
              <div>
                <p className="text-muted-foreground font-semibold">Learner</p>
                <p className="font-bold text-ink">{target?.learner_name || target?.learner_custom_id}</p>
                <p className="text-muted-foreground text-[12px]">Student (Learner)</p>
              </div>
            </div>
          </div>

          {/* Points & Ledger Attribution Breakdown */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-2 border-ink bg-surface-highlight p-4 text-[13px]">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-gold-ink shrink-0" />
              <div>
                <p className="font-bold text-ink">Ledger Credit & Attribution</p>
                <p className="text-muted-foreground">
                  Tutor earns <strong className="text-ink">+50 community points</strong> · Learner earns <strong className="text-ink">+25 attendance points</strong>
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider border border-ink/30 px-2 py-0.5 bg-paper">
              Append-only
            </span>
          </div>

          {/* Star Rating Section (Replaces AI Review Survey) */}
          <div className="border-t-2 border-ink pt-6">
            <div className="mb-3">
              <p className="font-display text-[16px] font-bold leading-tight text-ink flex items-center gap-1.5">
                <Star className="h-5 w-5 fill-gold text-ink" /> Session Quality Rating
              </p>
              <p className="text-[13px] text-muted-foreground mt-0.5">
                {wrapResult ? 'Official rating recorded for this session:' : 'Select a rating from 1 to 5 stars to record on the ledger.'}
              </p>
            </div>

            {wrapResult ? (
              <div className="flex items-center gap-2 p-3 border-2 border-ink bg-paper shadow-[2px_2px_0_var(--color-ink)]">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star
                      key={star}
                      className={cn('h-6 w-6', (wrapResult.session?.rating || wrapRating) >= star ? 'fill-gold text-ink' : 'text-ink/20')}
                    />
                  ))}
                </div>
                <span className="num font-bold text-ink text-[16px] ml-2">
                  {wrapResult.session?.rating || wrapRating} / 5 Stars
                </span>
              </div>
            ) : (
              <div className="space-y-3">
                <div
                  className="flex items-center gap-2"
                  role="radiogroup"
                  aria-label="Session rating"
                >
                  {[1, 2, 3, 4, 5].map(star => {
                    const isLit = (hoverRating || wrapRating) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        role="radio"
                        aria-checked={wrapRating === star}
                        aria-label={`${star} star${star > 1 ? 's' : ''}`}
                        className={cn(
                          'grid h-12 w-12 min-h-[44px] min-w-[44px] place-items-center border-2 border-ink shadow-[2px_2px_0_var(--color-ink)] transition-all',
                          isLit ? 'bg-gold -translate-y-0.5 shadow-[3px_3px_0_var(--color-ink)]' : 'bg-paper hover:bg-surface-highlight'
                        )}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        onClick={() => setWrapRating(star)}
                      >
                        <Star
                          className={cn('h-7 w-7 transition-transform', isLit ? 'fill-ink text-ink scale-110' : 'text-ink/30')}
                          strokeWidth={1.8}
                        />
                      </button>
                    );
                  })}
                  <span className="num ml-3 text-[15px] font-bold text-ink">
                    {wrapRating ? `${wrapRating} / 5 Stars` : 'Select a rating'}
                  </span>
                </div>

                <p className="text-[13px] font-medium text-muted-foreground min-h-[20px]">
                  {RATING_DESCRIPTIONS[hoverRating || wrapRating] || 'Click a star to rate the session.'}
                </p>
              </div>
            )}
          </div>

          {/* Tutor Notes */}
          {role === 'tutor' && !wrapResult && (
            <div className="mt-6 border-t border-ink/20 pt-5">
              <label className="field-label" htmlFor="wrap-notes">Session Notes & Next Steps (Optional)</label>
              <textarea
                id="wrap-notes"
                className="textarea-field"
                placeholder="Summarize key topics covered and exercises for the learner to review before the next meeting..."
                value={wrapNotes}
                onChange={(e) => setWrapNotes(e.target.value)}
                rows={3}
              />
            </div>
          )}

          {/* If already submitted and tutor notes existed */}
          {wrapResult && wrapNotes && (
            <div className="mt-5 border-2 border-ink bg-surface-quiet p-4 text-[13px]">
              <p className="font-bold text-ink">Tutor Session Notes</p>
              <p className="mt-1 text-muted-foreground whitespace-pre-wrap">{wrapNotes}</p>
            </div>
          )}

          {/* Badges unlocked */}
          {Array.isArray(wrapResult?.badges) && wrapResult.badges.length > 0 && (
            <div className="mt-5 flex items-start gap-2.5 border-2 border-ink bg-gold px-4 py-3 text-[13px] font-bold text-ink shadow-[3px_3px_0_var(--color-ink)]">
              <Award className="h-5 w-5 shrink-0" />
              <span>Badge unlocked — {wrapResult.badges.join(', ')}!</span>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 border-t-2 border-ink pt-6">
            {wrapResult ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[14px] font-bold text-emerald">
                  <Check className="h-5 w-5 border border-emerald rounded-full p-0.5" strokeWidth={3} />
                  Session report saved to ledger{wrapResult.referralResolved ? ' — referral resolved!' : '.'}
                  {role === 'tutor' && wrapResult.tutorBalance != null ? (
                    <span className="num text-muted-foreground font-normal ml-1">New Balance: {wrapResult.tutorBalance} pts</span>
                  ) : null}
                </div>
                <Button
                  size="lg"
                  className="w-full font-bold shadow-[3px_3px_0_var(--color-ink)]"
                  onClick={() => navigate('/dashboard')}
                >
                  Return to Dashboard
                </Button>
              </div>
            ) : (
              <Button
                size="lg"
                className="w-full font-bold shadow-[4px_4px_0_var(--color-ink)]"
                disabled={submitting || wrapRating < 1}
                onClick={handleSubmitWrap}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> : null}
                {submitting ? 'Recording to ledger…' : 'Confirm & Save Session Report'}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Active Live Session View (In-Person card for Face to Face; LiveClassroom video for Online)
  if ((active || target?.status === 'in-progress') && !finished && target) {
    if (target.mode === 'face_to_face') {
      const partnerName = role === 'tutor' ? target.learner_name : target.tutor_name;
      const venueLine = [target.venue_name || target.location, target.venue_building, target.venue_room]
        .filter(Boolean)
        .join(' · ');
      return (
        <div className="mx-auto w-full max-w-[780px] py-4">
          <div className="panel border-2 border-ink bg-card p-6 sm:p-8 shadow-[5px_5px_0_var(--color-ink)]">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-ink pb-5">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <SessionModeBadge mode="face_to_face" />
                  <span className="status-pill">
                    <span className="status-dot bg-emerald" /> In progress
                  </span>
                </div>
                <h1 className="mt-3 font-display text-[24px] font-extrabold leading-tight tracking-[-0.03em] text-ink">
                  {target.subject} — {target.topic}
                </h1>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  {target.session_code} · With <strong className="text-ink">{partnerName}</strong>
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="border-2 border-ink bg-surface-quiet p-5 text-center shadow-[3px_3px_0_var(--color-ink)]">
                <p className="text-[12px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  Elapsed session time
                </p>
                <p className="num mt-2 text-[48px] font-extrabold leading-none text-ink">
                  {formatTime(seconds)}
                </p>
                <p className="mt-2 text-[12px] text-muted-foreground">
                  Both devices verified in person (2/2)
                </p>
              </div>

              <div className="flex flex-col justify-between border-2 border-ink bg-surface-highlight p-5 shadow-[3px_3px_0_var(--color-ink)]">
                <div>
                  <p className="flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-wider text-ink">
                    <MapPin className="h-4 w-4" aria-hidden="true" /> Confirmed campus venue
                  </p>
                  <p className="mt-2 font-display text-[18px] font-extrabold text-ink">
                    {venueLine || 'Approved Campus Venue'}
                  </p>
                </div>
                <p className="mt-3 text-[12px] text-ink/80">
                  +50 tutor points and +25 learner attendance points post after wrap-up.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t-2 border-ink/15 pt-5">
              <p className="text-[13px] text-muted-foreground">
                Either participant can finish the session when you are done reviewing.
              </p>
              <Button
                variant="destructive"
                size="lg"
                onClick={() => handleEnd(seconds)}
                className="min-h-[44px] font-extrabold shadow-[3px_3px_0_var(--color-ink)]"
              >
                End session &amp; wrap up
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <React.Suspense fallback={<div className="panel empty p-12 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-ink" />Opening classroom…</div>}>
        <LiveClassroom
          session={target}
          user={user}
          role={role}
          seconds={seconds}
          onEnd={handleEnd}
          showToast={showToast}
        />
      </React.Suspense>
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

      {sessionsError && (
        <ErrorBanner
          message={`Sessions could not be read: ${sessionsError}`}
          onRetry={loadSessions}
          className="mb-4"
        />
      )}
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
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[13px] font-semibold text-muted-foreground">{target.session_code}</p>
                  <SessionModeBadge mode={target.mode} compact />
                </div>
                <h2 className="mt-1 font-display text-[22px] font-extrabold leading-tight tracking-[-0.03em]">{target.subject} — {target.topic}</h2>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  {fmtDate(target.date)} · {target.time} · {target.venue_name || target.location} · {target.duration}
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
                  <p className="text-[13px] text-muted-foreground">
                    Partner:{' '}
                    <button
                      type="button"
                      onClick={() => {
                        const partnerId = role === 'tutor'
                          ? (target.learner_custom_id || target.learner_id)
                          : (target.tutor_custom_id || target.tutor_id);
                        if (partnerId) navigate(`/profile/${partnerId}`);
                      }}
                      className="font-bold text-ink underline decoration-gold decoration-2 underline-offset-2 hover:decoration-ink"
                    >
                      {target.learner_name && role === 'tutor' ? target.learner_name : target.tutor_name}
                    </button>
                  </p>
                  <p className="mt-1 text-[13px] text-muted-foreground">Both parties must confirm</p>
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Tutor device */}
            <div className={cn('panel p-5', role !== 'tutor' && 'bg-surface-quiet/60')}>
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
                    {isFaceToFace && (
                      <div className="mb-4">
                        <p className="mb-2 flex items-center justify-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-ink">
                          <QrCode className="h-4 w-4" aria-hidden="true" /> Have the student scan in person
                        </p>
                        <InPersonQrCode
                          value={`${typeof window !== 'undefined' ? window.location.origin : ''}/checkin?session=${target.id}&code=${stagedToken}`}
                        />
                      </div>
                    )}
                    <p className="text-[13px] font-semibold text-muted-foreground">
                      {isFaceToFace ? 'Or enter this one-time code' : 'Learner code'}
                    </p>
                    <div className="mt-2 flex items-center justify-center gap-2">
                      <p className="num border-2 border-ink bg-gold px-4 py-2.5 text-[22px] sm:text-[26px] tracking-[0.12em] text-ink shadow-[3px_3px_0_var(--color-ink)]">{stagedToken}</p>
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
                      {confirmations}/2 confirmed · both devices must verify
                    </p>
                    <Button className="mt-4 w-full" onClick={() => handleCheckIn(stagedToken, { refreshAfterTutor: true })} disabled={checkingIn || active}>
                      {checkingIn ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} /> : <Check className="h-4 w-4" strokeWidth={2} />}
                      {checkingIn ? 'Verifying…' : isFaceToFace ? 'Confirm in-person presence' : 'Confirm on tutor device'}
                    </Button>
                    <Button className="mt-2.5 w-full" variant="outline" onClick={handleStage} disabled={staging}>
                      {staging ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} /> : null}
                      Issue a new code
                    </Button>
                  </div>
                ) : (
                  <div className="flex min-h-[200px] flex-col items-center justify-center">
                    <p className="max-w-[30ch] text-center text-[14px] text-muted-foreground">
                      {isFaceToFace
                        ? 'Generate an in-person QR code and one-time code to show the student across the table.'
                        : 'Issue a one-time code, show it to the learner, and both devices confirm before the clock starts.'}
                    </p>
                    <Button className="mt-5 w-full" onClick={handleStage} disabled={staging}>
                      {staging ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} /> : null}
                      {isFaceToFace ? 'Generate QR & check-in code' : 'Generate code'}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Learner device */}
            <div className={cn('panel p-5', role !== 'learner' && 'bg-surface-quiet/60')}>
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
                    <Button className="mt-5 w-full" disabled={checkingIn || !otp.trim()} onClick={() => handleCheckIn()}>
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
