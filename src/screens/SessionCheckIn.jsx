import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Copy, Check, Loader2, Star, Clock, Award, CheckCircle2, UserCheck, ShieldCheck, MapPin, QrCode, ExternalLink, Video, PhoneOff } from 'lucide-react';
import { cn } from '../lib/utils';
import ErrorBanner from '../components/ui/ErrorBanner';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { SessionModeBadge } from '../components/SessionModeArtwork';
import { useActiveSession } from '../context/ActiveSessionContext';
import DemoSessionModal from '../components/DemoSessionModal';
import { buildQrMatrix } from '../lib/qrSvg';
import { useDraftState } from '../lib/ux';
import api from '../api';

const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === '1'
  || (import.meta.env.DEV && import.meta.env.VITE_DEMO_MODE !== '0');

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

const formatCheckInCodeInput = (raw = '') => {
  const digits = String(raw).replace(/\D/g, '').slice(0, 12);
  if (digits.length > 6) return `${digits.slice(0, 6)}-${digits.slice(6)}`;
  return digits;
};

export default function SessionCheckIn({ role, user, showToast }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { openRoom, refreshLiveSession } = useActiveSession();
  const deepSessionId = searchParams.get('session') || '';
  const deepCode = searchParams.get('code') || '';
  const [active, setActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [sessions, setSessions] = useState(null);
  const [nextUpcoming, setNextUpcoming] = useState(null);
  const [sessionsError, setSessionsError] = useState(null);
  const [target, setTarget] = useState(null);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [stagedToken, setStagedToken] = useState(null);
  const [staging, setStaging] = useState(false);
  const [otp, setOtp] = useState(() => formatCheckInCodeInput(deepCode));
  const [checkingIn, setCheckingIn] = useState(false);
  const [confirmations, setConfirmations] = useState(0);
  const [myCheckedIn, setMyCheckedIn] = useState(false);
  const [finished, setFinished] = useState(false);
  const [endSummary, setEndSummary] = useState(null); // { endedBy, needsFacultyReview, pointsPosted, alreadySettled }
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);
  const [endingOnline, setEndingOnline] = useState(false);
  const [wrapRating, setWrapRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [wrapNotes, setWrapNotes, clearWrapNotes] = useDraftState('wrapup-notes', '');
  const [submitting, setSubmitting] = useState(false);
  const [wrapResult, setWrapResult] = useState(null);

  const loadSessions = () => {
    setSessionsError(null);
    // Check-in tab strictly loads today's upcoming and in-progress sessions only (never stale/expired)
    api.get('/sessions/mine', { scope: 'checkin' })
      .then(({ sessions: rows, nextUpcoming: upcomingFuture }) => {
        const list = (rows || []).filter((s) => s.status === 'upcoming' || s.status === 'in-progress');
        setSessions(list);
        setNextUpcoming(upcomingFuture || null);
        const byParam = deepSessionId ? list.find((s) => s.id === deepSessionId) : null;
        const next = byParam || list.find((s) => s.status === 'in-progress') || list.find((s) => s.status === 'upcoming') || null;
        setTarget(next);
        setConfirmations(next ? (Number(next.check_in_count) || 0) : 0);
        setMyCheckedIn(Boolean(next?.my_checked_in));
        setActive(next?.status === 'in-progress');
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
    } else if (target?.status !== 'in-progress') {
      setActive(false);
    }
  }, [target?.id, target?.status, target?.started_at, finished]);

  // Live sync while waiting for partner check-in (upcoming) or tutor session end (in-progress)
  useEffect(() => {
    if (!target?.id || finished) return undefined;
    if (target.status !== 'upcoming' && target.status !== 'in-progress') return undefined;

    let cancelled = false;
    const syncTarget = async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      try {
        const { session: fresh } = await api.get(`/sessions/${encodeURIComponent(target.id)}`);
        if (cancelled || !fresh) return;
        setTarget(fresh);
        setConfirmations(Number(fresh.check_in_count) || 0);
        setMyCheckedIn(Boolean(fresh.my_checked_in));

        if (target.status === 'upcoming' && fresh.status === 'in-progress') {
          setActive(true);
          refreshLiveSession?.({ announceNew: false });
          showToast('Both devices verified. The session timer has started.', 'success');
        } else if (fresh.status === 'completed' || fresh.status === 'auto-closed') {
          if (typeof fresh.actual_duration_seconds === 'number') setSeconds(fresh.actual_duration_seconds);
          setEndSummary({
            endedBy: fresh.ended_by || 'tutor',
            needsFacultyReview: Boolean(fresh.needs_faculty_review),
            pointsPosted: Boolean(fresh.points_posted),
            alreadySettled: true,
          });
          setActive(false);
          setFinished(true);
          refreshLiveSession?.({ announceNew: false });
        }
      } catch {
        // transient network hiccup — next poll will retry
      }
    };

    const poll = setInterval(syncTarget, 3000);
    let bc = null;
    if (typeof BroadcastChannel !== 'undefined') {
      bc = new BroadcastChannel('academix-session-sync');
      bc.onmessage = () => syncTarget();
    }
    return () => {
      cancelled = true;
      clearInterval(poll);
      bc?.close();
    };
  }, [target?.id, target?.status, finished, refreshLiveSession, showToast]);

  useEffect(() => {
    let interval = null;
    if (active) interval = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [active]);

  const eligible = (sessions ?? []).filter(s => s.status === 'upcoming' || s.status === 'in-progress');

  const isFaceToFace = target?.mode === 'face_to_face';
  const checkInMethod = isFaceToFace ? 'qr' : 'otp';
  const isTutorDevice = user?.id && target?.tutor_id
    ? String(user.id) === String(target.tutor_id)
    : (role === 'tutor' || role === 'faculty');

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

  const handleCheckIn = async (explicitToken) => {
    const tokenValue = typeof explicitToken === 'string' ? explicitToken.trim() : otp.trim();
    if (!target || !tokenValue) return;
    setCheckingIn(true);
    try {
      const res = await api.post(`/sessions/${target.id}/check-in`, { token: tokenValue, method: checkInMethod });
      setConfirmations(res.confirmations);
      setMyCheckedIn(true);
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
      api.get('/sessions/mine', { scope: 'checkin' }).then(({ sessions: rows }) => {
        const list = (rows || []).filter((s) => s.status === 'upcoming' || s.status === 'in-progress');
        setSessions(list);
        const fresh = list.find((s) => s.id === target.id);
        if (fresh) {
          setTarget(fresh);
          setConfirmations(Number(fresh.check_in_count) || 0);
          setMyCheckedIn(Boolean(fresh.my_checked_in));
        }
        refreshLiveSession?.({ announceNew: false });
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
    const onlineAlreadySettled = Boolean(endSummary?.alreadySettled && target?.mode === 'online');
    const needsRating = !(onlineAlreadySettled && isTutorDevice);
    if (!target || (needsRating && wrapRating < 1)) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/sessions/${target.id}/wrap-up`, {
        notes: isTutorDevice ? wrapNotes : undefined,
        rating: wrapRating >= 1 ? wrapRating : undefined,
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
    const onlineAlreadySettled = Boolean(endSummary?.alreadySettled && target?.mode === 'online');
    const showRatingPicker = !(onlineAlreadySettled && isTutorDevice);
    const isFlaggedShort = Boolean(endSummary?.needsFacultyReview || wrapResult?.needsFacultyReview);
    return (
      <div className="mx-auto w-full max-w-[820px]">
        {/* Section Header */}
        <div className="section-head mb-6">
          <div>
            <h1 className="section-title">
              {onlineAlreadySettled && !isTutorDevice ? 'Your tutor ended this session' : 'Session Call Report'}
            </h1>
            <p className="section-subtitle">Official tutoring session summary &amp; ledger record.</p>
          </div>
          <span className="status-pill">
            <span className="status-dot bg-emerald" /> {wrapResult || onlineAlreadySettled ? 'Recorded on Ledger' : 'Call Completed'}
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
                <p className="font-bold text-ink">
                  {isFlaggedShort ? 'Flagged for Faculty Review' : 'Ledger Credit & Attribution'}
                </p>
                <p className="text-muted-foreground">
                  {isFlaggedShort ? (
                    'Session duration was below the minimum threshold — 0 points were posted.'
                  ) : (
                    <>Tutor earns <strong className="text-ink">+50 community points</strong> · Learner earns <strong className="text-ink">+25 attendance points</strong></>
                  )}
                </p>
              </div>
            </div>
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider border border-ink/30 px-2 py-0.5 bg-paper">
              Append-only
            </span>
          </div>

          {/* Star Rating Section (hidden for tutors on already-settled Online sessions) */}
          {showRatingPicker && (
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
          )}

          {/* Tutor Notes */}
          {isTutorDevice && !wrapResult && (
            <div className="mt-6 border-t border-ink/20 pt-5">
              <label className="field-label" htmlFor="wrap-notes">Session Notes &amp; Next Steps (Optional)</label>
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
                  {isTutorDevice && wrapResult.tutorBalance != null ? (
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
              <div className="flex flex-col gap-2.5 sm:flex-row">
                <Button
                  size="lg"
                  className="w-full font-bold shadow-[4px_4px_0_var(--color-ink)]"
                  disabled={submitting || (showRatingPicker && wrapRating < 1)}
                  onClick={handleSubmitWrap}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} /> : null}
                  {submitting ? 'Saving…' : showRatingPicker ? 'Confirm & Save Session Report' : 'Save Notes'}
                </Button>
                {onlineAlreadySettled && isTutorDevice && (
                  <Button
                    type="button"
                    size="lg"
                    variant="outline"
                    className="w-full bg-paper font-bold sm:w-auto"
                    onClick={() => navigate('/dashboard')}
                  >
                    Return to Dashboard
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Active Live Session View: launch card for dedicated room tab / mobile CallLayer
  if ((active || target?.status === 'in-progress') && !finished && target) {
    const isSessionTutor = user?.id && target?.tutor_id
      ? String(user.id) === String(target.tutor_id)
      : role === 'tutor';
    const partnerName = isSessionTutor ? target.learner_name : target.tutor_name;
    const venueLine = [target.venue_name || target.location, target.venue_building, target.venue_room]
      .filter(Boolean)
      .join(' · ');

    const handleTutorEndFromCheckIn = async () => {
      setEndingOnline(true);
      try {
        const res = await api.post(`/sessions/${target.id}/end`, {});
        if (typeof res.actualDurationSeconds === 'number') setSeconds(res.actualDurationSeconds);
        setEndSummary({
          endedBy: 'tutor',
          needsFacultyReview: Boolean(res.needsFacultyReview),
          pointsPosted: Boolean(res.pointsPosted),
          alreadySettled: true,
        });
        setConfirmEndOpen(false);
        setFinished(true);
        setActive(false);
        refreshLiveSession?.({ announceNew: false });
        showToast(
          res.needsFacultyReview
            ? 'Session ended below minimum duration — flagged for faculty review (0 pts).'
            : 'Session ended. Add optional notes below.',
          res.needsFacultyReview ? 'warning' : 'success',
        );
      } catch (e) {
        showToast(e.message || 'Could not end session', 'error');
      } finally {
        setEndingOnline(false);
      }
    };

    return (
      <div className="mx-auto w-full max-w-[780px] py-4">
        <div className="panel border-2 border-ink bg-card p-5 sm:p-8 shadow-[var(--nb-shadow)_var(--nb-shadow)_0_var(--color-ink)]">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-ink pb-5">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <SessionModeBadge mode={target.mode} />
                <span className="status-pill">
                  <span className="status-dot bg-emerald" /> Live now
                </span>
              </div>
              <h1 className="mt-3 font-display text-[clamp(20px,5vw+4px,26px)] font-extrabold leading-tight tracking-[-0.03em] text-ink">
                {target.subject} — {target.topic}
              </h1>
              <p className="mt-1 text-[13px] text-muted-foreground">
                {target.session_code} · With <strong className="text-ink">{partnerName}</strong>
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="border-2 border-ink bg-surface-quiet p-5 text-center shadow-[3px_3px_0_var(--color-ink)]">
              <p className="text-[12px] font-extrabold uppercase tracking-wider text-muted-foreground">
                Elapsed session time
              </p>
              <p className="num mt-2 text-[44px] font-extrabold leading-none text-ink">
                {formatTime(seconds)}
              </p>
              <p className="mt-2 text-[12px] text-muted-foreground">
                2/2 devices verified
              </p>
            </div>

            <div className="flex flex-col justify-between border-2 border-ink bg-surface-highlight p-5 shadow-[3px_3px_0_var(--color-ink)]">
              <div>
                <p className="flex items-center gap-1.5 text-[12px] font-extrabold uppercase tracking-wider text-ink">
                  {target.mode === 'face_to_face'
                    ? <><MapPin className="h-4 w-4" aria-hidden="true" /> Confirmed campus venue</>
                    : <><Video className="h-4 w-4" aria-hidden="true" /> Dedicated online room</>}
                </p>
                <p className="mt-2 font-display text-[17px] font-extrabold text-ink">
                  {target.mode === 'face_to_face' ? (venueLine || 'Approved Campus Venue') : 'LCCB Live Classroom'}
                </p>
              </div>
              <p className="mt-3 text-[12px] text-ink/80">
                {target.mode === 'face_to_face'
                  ? 'Open the dedicated session room to track time and finish wrap-up.'
                  : 'Opens in a dedicated session room so you can browse other tabs without dropping the call.'}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-2.5 border-t-2 border-ink/15 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              size="lg"
              onClick={() => openRoom(target)}
              className="min-h-[44px] w-full font-extrabold shadow-[3px_3px_0_var(--color-ink)] sm:w-auto"
            >
              <ExternalLink className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {target.mode === 'face_to_face' ? 'Open session room' : 'Join live room'}
            </Button>

            {target.mode === 'face_to_face' ? (
              <Button
                type="button"
                variant="destructive"
                size="lg"
                onClick={() => handleEnd(seconds)}
                className="min-h-[44px] w-full font-extrabold sm:w-auto"
              >
                End session &amp; wrap up
              </Button>
            ) : isSessionTutor ? (
              <Button
                type="button"
                variant="destructive"
                size="lg"
                disabled={endingOnline}
                onClick={() => setConfirmEndOpen(true)}
                className="min-h-[44px] w-full font-extrabold sm:w-auto"
              >
                <PhoneOff className="mr-1.5 h-4 w-4" aria-hidden="true" />
                End session
              </Button>
            ) : (
              <p className="text-[12px] text-muted-foreground">
                Your tutor will end the session when you finish. You can leave and rejoin anytime.
              </p>
            )}
          </div>
        </div>

        <ConfirmDialog
          open={confirmEndOpen}
          title="End session"
          description="Are you sure you want to end this session?"
          warning="This ends the Online session for both participants and records the final duration."
          cancelLabel="Cancel"
          confirmLabel="End session"
          variant="destructive"
          busy={endingOnline}
          onCancel={() => setConfirmEndOpen(false)}
          onConfirm={handleTutorEndFromCheckIn}
        />
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
        <div className="flex items-center gap-2">
          {DEMO_MODE && (
            <button
              type="button"
              onClick={() => setShowDemoModal(true)}
              className="flex items-center gap-1.5 border-2 border-ink bg-gold px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-ink shadow-[2px_2px_0_var(--color-ink)] transition-transform hover:-translate-y-px hover:shadow-[3px_3px_0_var(--color-ink)] active:translate-y-0"
            >
              <span>⚡</span>
              <span>Quick Demo</span>
            </button>
          )}
          {target && <SessionStatus status={target.status} active={active} />}
        </div>
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
        <div className="panel empty space-y-2">
          <p className="font-bold text-ink">No sessions scheduled for today.</p>
          {nextUpcoming ? (
            <p className="text-[13px] text-muted-foreground">
              Your next upcoming session is <strong>{nextUpcoming.subject_code || nextUpcoming.subject}</strong> on{' '}
              <strong>{fmtDate(nextUpcoming.date)}</strong> at <strong>{nextUpcoming.time}</strong>. Check-in opens on the scheduled date.
            </p>
          ) : (
            <p className="text-[13px] text-muted-foreground">
              {role === 'learner' ? 'Book one from Find a tutor.' : 'Confirmed bookings for today will appear here.'}
            </p>
          )}
          {DEMO_MODE && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowDemoModal(true)}
                className="inline-flex items-center gap-1.5 border-2 border-ink bg-gold px-3 py-1.5 text-[12px] font-bold text-ink shadow-[2px_2px_0_var(--color-ink)] transition-transform hover:-translate-y-px hover:shadow-[3px_3px_0_var(--color-ink)]"
              >
                <span>⚡ Boot Quick Demo Session</span>
              </button>
            </div>
          )}
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
                        setConfirmations(Number(next.check_in_count) || 0);
                        setMyCheckedIn(Boolean(next.my_checked_in));
                        setActive(next.status === 'in-progress');
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
            <div className={cn('panel p-5', !isTutorDevice && 'bg-surface-quiet/60')}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-[18px] font-extrabold tracking-[-0.03em]">Tutor device</h2>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">Generate the shared code.</p>
                </div>
                <span className="status-pill">{isTutorDevice ? 'This device' : 'Other device'}</span>
              </div>

              <div className="mt-6">
                {!isTutorDevice ? (
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
                      {isFaceToFace ? 'Or enter this one-time code' : 'Shared check-in code'}
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
                      {myCheckedIn
                        ? `You confirmed (${confirmations}/2) · waiting for learner to enter this code`
                        : `${confirmations}/2 confirmed · both devices must verify`}
                    </p>
                    <Button
                      className="mt-4 w-full"
                      onClick={() => handleCheckIn(stagedToken)}
                      disabled={checkingIn || active || myCheckedIn}
                    >
                      {checkingIn ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.8} /> : <Check className="h-4 w-4" strokeWidth={2} />}
                      {myCheckedIn
                        ? 'Confirmed on tutor device'
                        : checkingIn
                          ? 'Verifying…'
                          : isFaceToFace ? 'Confirm in-person presence' : 'Confirm on tutor device'}
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
                        : 'Issue a one-time code, share it with the learner, and both devices confirm before the clock starts.'}
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
            <div className={cn('panel p-5', isTutorDevice && 'bg-surface-quiet/60')}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-[18px] font-extrabold tracking-[-0.03em]">Learner device</h2>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">Enter the code from the tutor.</p>
                </div>
                <span className="status-pill">{!isTutorDevice ? 'This device' : 'Other device'}</span>
              </div>

              <div className="mt-6">
                {isTutorDevice ? (
                  <div className="flex min-h-[200px] flex-col items-center justify-center text-center">
                    <p className="max-w-[30ch] text-[14px] text-muted-foreground">
                      The learner enters the one-time code on their own device. Both confirmations must land.
                    </p>
                  </div>
                ) : myCheckedIn ? (
                  <div className="flex min-h-[200px] flex-col items-center justify-center text-center space-y-2">
                    <CheckCircle2 className="h-8 w-8 text-emerald" />
                    <p className="font-display text-[16px] font-extrabold text-ink">Your device is verified</p>
                    <p className="max-w-[30ch] text-[13px] text-muted-foreground" aria-live="polite">
                      {confirmations}/2 confirmed · waiting for your tutor to confirm so the session starts automatically.
                    </p>
                  </div>
                ) : (
                  <div className="flex min-h-[200px] flex-col justify-center">
                    <label className="field-label" htmlFor="otp">One-time code</label>
                    <Input
                      id="otp"
                      type="text"
                      inputMode="numeric"
                      placeholder="000000-000000"
                      className="num h-14 text-center text-[20px] sm:text-[22px] tracking-[0.12em]"
                      value={otp}
                      onChange={(e) => setOtp(formatCheckInCodeInput(e.target.value))}
                    />
                    <p className="mt-2 text-[13px] text-muted-foreground">Enter the 12-digit code shown on your tutor’s screen. It expires after ten minutes.</p>
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
            {isFaceToFace
              ? 'The timer is shared. Either participant can end the Face to Face session and submit wrap-up.'
              : 'The timer is shared. Only the tutor can end an Online session; students can leave and rejoin anytime.'}
          </p>
        </>
      )}

      {showDemoModal && (
        <DemoSessionModal
          isOpen={showDemoModal}
          onClose={() => {
            setShowDemoModal(false);
            loadSessions();
          }}
          user={user}
          role={role}
          showToast={showToast}
        />
      )}
    </div>
  );
}
