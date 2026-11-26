import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Clock,
  MapPin,
  Loader2,
  AlertTriangle,
  Star,
  Check,
  Award,
  ArrowLeft,
  Minimize2,
  QrCode,
  Copy,
  ShieldAlert,
  ExternalLink,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { SessionModeBadge } from '../components/SessionModeArtwork';
import { buildQrMatrix } from '../lib/qrSvg';
import { cn } from '../lib/utils';
import api from '../api';

const LiveClassroom = React.lazy(() => import('../components/classroom/LiveClassroom'));

const formatTime = (totalSeconds = 0) => {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h > 0 ? `${h}:` : ''}${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
};

function notifySessionSync(payload) {
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('academix-session-sync');
      bc.postMessage(payload);
      bc.close();
    }
  } catch {
    // ignore
  }
}

function InPersonQr({ value }) {
  const qr = useMemo(() => {
    try { return buildQrMatrix(value); } catch { return null; }
  }, [value]);
  if (!qr) return null;
  const quiet = 3;
  const dim = qr.size + quiet * 2;
  return (
    <div className="mx-auto inline-block border-2 border-ink bg-white p-2.5 shadow-[3px_3px_0_var(--color-ink)]">
      <svg viewBox={`0 0 ${dim} ${dim}`} width="164" height="164" role="img" aria-label="In-person check-in QR code" shapeRendering="crispEdges">
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

/**
 * Dedicated session room page (`/session/:id`) — also mountable inside the
 * mobile/PWA root CallLayer (`embedded={true}`) so navigation never unmounts the call.
 */
export default function SessionRoom({
  sessionId: propSessionId,
  user,
  role,
  showToast,
  embedded = false,
  onMinimize,
  onLeaveEmbedded,
  onSessionEnded,
}) {
  const params = useParams();
  const navigate = useNavigate();
  const sessionId = propSessionId || params.id;

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accessError, setAccessError] = useState(null);
  const [duplicateTab, setDuplicateTab] = useState(false);

  const [seconds, setSeconds] = useState(0);
  const [ending, setEnding] = useState(false);
  const [endedNotice, setEndedNotice] = useState(null); // { title, detail, endedBy, pointsPosted, needsFacultyReview }
  const [f2fWrapMode, setF2fWrapMode] = useState(false);

  // Wrap-up rating/notes state
  const [wrapRating, setWrapRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [wrapNotes, setWrapNotes] = useState('');
  const [savingWrap, setSavingWrap] = useState(false);
  const [wrapSaved, setWrapSaved] = useState(null);

  // F2F check-in state (if opened while still upcoming)
  const [stagedToken, setStagedToken] = useState(null);
  const [otp, setOtp] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);

  const tabIdRef = useRef(`tab-${Math.random().toString(36).slice(2, 10)}`);

  // Duplicate-tab guard: one active room tab per user per session (standalone route)
  useEffect(() => {
    if (embedded || !sessionId || !user?.id || typeof BroadcastChannel === 'undefined') return undefined;
    const channelName = `academix-room-lock:${sessionId}:${user.id}`;
    const bc = new BroadcastChannel(channelName);
    let claimed = false;

    const onMessage = (e) => {
      const msg = e.data;
      if (!msg || msg.tabId === tabIdRef.current) return;
      if (msg.type === 'probe' && claimed) {
        bc.postMessage({ type: 'claimed', tabId: tabIdRef.current });
      } else if (msg.type === 'claimed' && !claimed) {
        setDuplicateTab(true);
      } else if (msg.type === 'focus' && claimed) {
        try { window.focus(); } catch { /* ignore */ }
      }
    };

    bc.addEventListener('message', onMessage);
    bc.postMessage({ type: 'probe', tabId: tabIdRef.current });

    const claimTimer = setTimeout(() => {
      setDuplicateTab((isDup) => {
        if (!isDup) claimed = true;
        return isDup;
      });
    }, 220);

    return () => {
      clearTimeout(claimTimer);
      bc.removeEventListener('message', onMessage);
      bc.close();
    };
  }, [embedded, sessionId, user?.id]);

  // Fetch and verify server-side access
  const loadSession = useCallback(async () => {
    if (!sessionId) return;
    setLoading(true);
    setAccessError(null);
    try {
      const { session: row } = await api.get(`/sessions/${encodeURIComponent(sessionId)}`);
      setSession(row);
      if (row.started_at) {
        const endRef = row.ended_at ? new Date(row.ended_at).getTime() : Date.now();
        setSeconds(Math.max(0, Math.floor((endRef - new Date(row.started_at).getTime()) / 1000)));
      }
      if (row.status === 'completed' || row.status === 'auto-closed') {
        const isTutor = user?.id && String(user.id) === String(row.tutor_id);
        setEndedNotice({
          title: row.status === 'auto-closed'
            ? 'Session auto-closed at day cutoff'
            : (isTutor ? 'Session ended' : 'Your tutor ended this session'),
          detail: row.needs_faculty_review
            ? 'Session duration was below the minimum threshold, so no points were posted and it was flagged for faculty review.'
            : 'Complete the wrap-up below to save your rating or session notes.',
          endedBy: row.ended_by || 'tutor',
          pointsPosted: Boolean(row.points_posted),
          needsFacultyReview: Boolean(row.needs_faculty_review),
        });
      }
    } catch (e) {
      setAccessError(e.message || 'You do not have access to this session room.');
    } finally {
      setLoading(false);
    }
  }, [sessionId, user?.id]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // Live elapsed timer while in-progress and not ended
  useEffect(() => {
    if (!session || session.status !== 'in-progress' || endedNotice || f2fWrapMode) return undefined;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [session?.status, endedNotice, f2fWrapMode]);

  const isSessionTutor = Boolean(user?.id && session?.tutor_id && String(user.id) === String(session.tutor_id));

  // Tutor ends Online session on the server (single transaction + Centrifugo/WS broadcast)
  const handleTutorEndOnline = async () => {
    if (!session || ending) return;
    setEnding(true);
    try {
      const res = await api.post(`/sessions/${session.id}/end`, {});
      const updated = res.session || { ...session, status: 'completed', ended_by: 'tutor' };
      setSession((prev) => ({ ...prev, ...updated }));
      if (typeof res.actualDurationSeconds === 'number') setSeconds(res.actualDurationSeconds);
      setEndedNotice({
        title: 'Session ended',
        detail: res.needsFacultyReview
          ? 'This session ended below the minimum duration. No points were posted and it was flagged for faculty review.'
          : res.points > 0
            ? `Session completed — +${res.points} community points posted.`
            : 'Session completed.',
        endedBy: 'tutor',
        pointsPosted: Boolean(res.pointsPosted),
        needsFacultyReview: Boolean(res.needsFacultyReview),
      });
      notifySessionSync({ type: 'session.ended', sessionId: session.id });
      onSessionEnded?.(updated);
      showToast?.('Session ended.', 'success');
    } catch (e) {
      showToast?.(e.message || 'Could not end session', 'error');
    } finally {
      setEnding(false);
    }
  };

  // Remote realtime event (tutor ended or system auto-closed)
  const handleRemoteEvent = useCallback((event) => {
    if (!event?.type) return;
    if (typeof event.actualDurationSeconds === 'number') setSeconds(event.actualDurationSeconds);
    if (event.type === 'session.ended') {
      setSession((prev) => (prev ? { ...prev, status: 'completed', ended_by: event.endedBy || 'tutor' } : prev));
      setEndedNotice({
        title: isSessionTutor ? 'Session ended' : 'Your tutor ended this session',
        detail: event.needsFacultyReview
          ? 'This session ended below the minimum duration, so no points were posted and it was flagged for faculty review.'
          : 'You can now submit your rating in the wrap-up below.',
        endedBy: event.endedBy || 'tutor',
        pointsPosted: Boolean(event.pointsPosted),
        needsFacultyReview: Boolean(event.needsFacultyReview),
      });
      notifySessionSync({ type: 'session.ended', sessionId: event.sessionId || session?.id });
      onSessionEnded?.(session);
    } else if (event.type === 'session.auto_closed') {
      setSession((prev) => (prev ? { ...prev, status: 'auto-closed', ended_by: 'system' } : prev));
      setEndedNotice({
        title: 'Session auto-closed at day cutoff',
        detail: 'Sessions cannot remain active past the end of their scheduled date (Asia/Manila time).',
        endedBy: 'system',
        pointsPosted: Boolean(event.pointsPosted),
        needsFacultyReview: Boolean(event.needsFacultyReview),
      });
      notifySessionSync({ type: 'session.auto_closed', sessionId: event.sessionId || session?.id });
      onSessionEnded?.(session);
    }
  }, [isSessionTutor, onSessionEnded, session]);

  // Student Leave (disconnects locally, NEVER ends the session)
  const handleStudentLeave = () => {
    showToast?.('You left the call. You can rejoin until your tutor ends the session.', 'info');
    if (embedded) {
      onLeaveEmbedded?.();
    } else {
      navigate('/dashboard');
    }
  };

  // Submit wrap-up rating / notes
  const handleSaveWrapUp = async () => {
    if (!session || savingWrap) return;
    const isF2F = session.mode === 'face_to_face';
    if (!isSessionTutor && wrapRating < 1) return;
    if (isF2F && wrapRating < 1) return;

    setSavingWrap(true);
    try {
      const res = await api.post(`/sessions/${session.id}/wrap-up`, {
        notes: isSessionTutor ? wrapNotes : undefined,
        rating: wrapRating >= 1 ? wrapRating : undefined,
      });
      setWrapSaved(res);
      if (isF2F) {
        setSession((prev) => ({ ...prev, status: 'completed' }));
        notifySessionSync({ type: 'session.ended', sessionId: session.id });
        onSessionEnded?.(res.session);
      }
      showToast?.('Wrap-up saved.', 'success');
    } catch (e) {
      showToast?.(e.message || 'Could not save wrap-up', 'error');
    } finally {
      setSavingWrap(false);
    }
  };

  // F2F check-in helpers (if opened while upcoming)
  const handleF2fStage = async () => {
    try {
      const res = await api.post(`/sessions/${session.id}/stage-token`, { method: 'qr' });
      setStagedToken(res.token);
      showToast?.('In-person QR and code ready.', 'success');
    } catch (e) {
      showToast?.(e.message || 'Could not issue code', 'error');
    }
  };

  const handleF2fCheckIn = async (tok) => {
    const code = String(tok || otp).trim();
    if (!code) return;
    setCheckingIn(true);
    try {
      const res = await api.post(`/sessions/${session.id}/check-in`, { token: code, method: 'qr' });
      if (res.sessionStarted) {
        showToast?.('Both devices verified — session started!', 'success');
        notifySessionSync({ type: 'session.started', sessionId: session.id });
      } else {
        showToast?.(`Verified (${res.confirmations}/2). Waiting for partner.`, 'info');
      }
      await loadSession();
    } catch (e) {
      showToast?.(e.message || 'Invalid code', 'error');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleFocusOtherTab = () => {
    if (typeof BroadcastChannel !== 'undefined' && user?.id) {
      const bc = new BroadcastChannel(`academix-room-lock:${sessionId}:${user.id}`);
      bc.postMessage({ type: 'focus', tabId: tabIdRef.current });
      bc.close();
    }
    try {
      window.open('', `academix-session-${sessionId}`)?.focus();
    } catch {
      // ignore
    }
  };

  // ── Duplicate tab blocked ──
  if (duplicateTab) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-stone p-4">
        <div className="panel w-full max-w-[460px] border-2 border-ink bg-paper p-6 text-center shadow-[5px_5px_0_var(--color-ink)]">
          <ShieldAlert className="mx-auto h-8 w-8 text-amber" />
          <h1 className="mt-3 font-display text-[22px] font-extrabold text-ink">
            You are already in this session in another tab
          </h1>
          <p className="mt-2 text-[14px] text-muted-foreground">
            To avoid audio echo and duplicate connections, only one active room tab is allowed per session.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button type="button" onClick={handleFocusOtherTab} className="min-h-[44px] font-bold">
              <ExternalLink className="mr-1.5 h-4 w-4" />
              Focus active tab
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate('/dashboard')} className="min-h-[44px]">
              Back to dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-stone p-4">
        <div className="panel border-2 border-ink bg-paper p-8 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-ink" />
          <p className="mt-3 text-[14px] font-semibold text-ink">Verifying room access…</p>
        </div>
      </div>
    );
  }

  if (accessError || !session) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-stone p-4">
        <div className="panel w-full max-w-[460px] border-2 border-ink bg-paper p-6 text-center shadow-[5px_5px_0_var(--color-ink)]">
          <AlertTriangle className="mx-auto h-8 w-8 text-destructive" />
          <h1 className="mt-3 font-display text-[22px] font-extrabold text-ink">Cannot open session room</h1>
          <p className="mt-2 text-[14px] text-muted-foreground">{accessError || 'Session not found.'}</p>
          <Button
            type="button"
            className="mt-5 min-h-[44px]"
            onClick={() => (embedded ? onLeaveEmbedded?.() : navigate('/dashboard'))}
          >
            Back to dashboard
          </Button>
        </div>
      </div>
    );
  }

  // ── Ended / Wrap-Up Screen (Online ended/auto-closed OR F2F wrap-up) ──
  if (endedNotice || f2fWrapMode || session.status === 'cancelled' || session.status === 'missed') {
    const isTerminalNoWrap = session.status === 'cancelled' || session.status === 'missed';
    const alreadyRatedByLearner = !isSessionTutor && session.rating != null;
    return (
      <div className={cn('min-h-[100dvh] bg-stone p-4 sm:p-6 overflow-y-auto', embedded && 'h-full')}>
        <div className="mx-auto w-full max-w-[680px]">
          <div className="panel border-2 border-ink bg-paper p-5 sm:p-7 shadow-[5px_5px_0_var(--color-ink)]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink pb-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <SessionModeBadge mode={session.mode} compact />
                  <span className="status-pill capitalize">{session.status}</span>
                </div>
                <h1 className="mt-2 font-display text-[24px] font-extrabold leading-tight text-ink">
                  {endedNotice?.title || (f2fWrapMode ? 'Face to Face session wrap-up' : `Session ${session.status}`)}
                </h1>
                <p className="mt-1 text-[14px] text-muted-foreground">
                  {endedNotice?.detail || `${session.subject} · ${session.topic}`}
                </p>
              </div>
              <div className="border-2 border-ink bg-surface-quiet px-3.5 py-2 text-right">
                <p className="text-[11px] font-extrabold uppercase text-muted-foreground">Duration</p>
                <p className="num text-[24px] font-extrabold text-ink">{formatTime(seconds)}</p>
              </div>
            </div>

            {!isTerminalNoWrap && !wrapSaved && !alreadyRatedByLearner && (
              <div className="mt-5 space-y-5">
                {(!isSessionTutor || session.mode === 'face_to_face') && (
                  <div>
                    <p className="font-display text-[16px] font-bold text-ink flex items-center gap-1.5">
                      <Star className="h-5 w-5 fill-gold text-ink" /> Rate this session
                    </p>
                    <div className="mt-2.5 flex items-center gap-2" role="radiogroup" aria-label="Session rating">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const lit = (hoverRating || wrapRating) >= star;
                        return (
                          <button
                            key={star}
                            type="button"
                            role="radio"
                            aria-checked={wrapRating === star}
                            aria-label={`${star} star${star > 1 ? 's' : ''}`}
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(0)}
                            onClick={() => setWrapRating(star)}
                            className={cn(
                              'grid h-12 w-12 min-h-[44px] min-w-[44px] place-items-center border-2 border-ink shadow-[2px_2px_0_var(--color-ink)]',
                              lit ? 'bg-gold' : 'bg-paper hover:bg-surface-highlight',
                            )}
                          >
                            <Star className={cn('h-6 w-6', lit ? 'fill-ink text-ink' : 'text-ink/30')} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {isSessionTutor && (
                  <div>
                    <label htmlFor="room-wrap-notes" className="field-label">
                      Session notes &amp; next steps (optional)
                    </label>
                    <textarea
                      id="room-wrap-notes"
                      rows={3}
                      value={wrapNotes}
                      onChange={(e) => setWrapNotes(e.target.value)}
                      placeholder="Summarize what you covered and what the student should practice next..."
                      className="textarea-field mt-1"
                    />
                  </div>
                )}

                <Button
                  type="button"
                  size="lg"
                  disabled={savingWrap || ((!isSessionTutor || session.mode === 'face_to_face') && wrapRating < 1)}
                  onClick={handleSaveWrapUp}
                  className="min-h-[44px] w-full font-extrabold"
                >
                  {savingWrap && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                  {savingWrap ? 'Saving wrap-up…' : 'Save wrap-up'}
                </Button>
              </div>
            )}

            {(wrapSaved || alreadyRatedByLearner) && (
              <div className="mt-5 flex items-center gap-2 border-2 border-ink bg-surface-highlight p-3.5 text-[14px] font-bold text-ink">
                <Check className="h-5 w-5 text-emerald" strokeWidth={2.6} />
                <span>Wrap-up saved to your session record.</span>
              </div>
            )}

            {endedNotice?.needsFacultyReview && (
              <div className="mt-4 flex items-start gap-2 border-l-4 border-amber bg-surface-quiet p-3 text-[13px] text-ink">
                <Award className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
                <span>Flagged for faculty review (duration under minimum threshold; 0 points posted).</span>
              </div>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-2 border-t-2 border-ink/15 pt-4">
              <Button
                type="button"
                variant="outline"
                className="min-h-[44px] bg-paper font-bold"
                onClick={() => (embedded ? onLeaveEmbedded?.() : navigate('/dashboard'))}
              >
                <ArrowLeft className="mr-1.5 h-4 w-4" />
                Back to dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Face to Face Dedicated Room (no video) ──
  if (session.mode === 'face_to_face') {
    const partnerName = isSessionTutor ? session.learner_name : session.tutor_name;
    const venueLine = [session.venue_name || session.location, session.venue_building, session.venue_room]
      .filter(Boolean)
      .join(' · ');
    return (
      <div className={cn('min-h-[100dvh] bg-stone p-4 sm:p-6 overflow-y-auto', embedded && 'h-full')}>
        <div className="mx-auto w-full max-w-[780px] space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-2 border-ink bg-surface-quiet px-4 py-2.5 shadow-[3px_3px_0_var(--color-ink)]">
            <div className="flex items-center gap-2">
              <SessionModeBadge mode="face_to_face" compact />
              <span className="font-display text-[14px] font-extrabold text-ink">{session.session_code}</span>
            </div>
            <div className="flex items-center gap-2">
              {onMinimize && (
                <Button type="button" variant="outline" size="sm" onClick={onMinimize} className="min-h-[44px] bg-paper">
                  <Minimize2 className="mr-1 h-3.5 w-3.5" /> Minimize
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => (embedded ? onLeaveEmbedded?.() : navigate('/dashboard'))}
                className="min-h-[44px] bg-paper"
              >
                <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Dashboard
              </Button>
            </div>
          </div>

          <div className="panel border-2 border-ink bg-card p-5 sm:p-7 shadow-[5px_5px_0_var(--color-ink)]">
            <h1 className="font-display text-[24px] font-extrabold leading-tight text-ink">
              {session.subject} — {session.topic}
            </h1>
            <p className="mt-1 text-[13px] text-muted-foreground">
              With <strong className="text-ink">{partnerName}</strong> · {session.language || 'English'}
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="border-2 border-ink bg-surface-quiet p-5 text-center shadow-[3px_3px_0_var(--color-ink)]">
                <p className="text-[12px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  {session.status === 'in-progress' ? 'Elapsed session time' : 'Awaiting 2/2 check-in'}
                </p>
                <p className="num mt-2 text-[44px] font-extrabold leading-none text-ink">
                  {formatTime(seconds)}
                </p>
                <p className="mt-2 text-[12px] text-muted-foreground">
                  {session.check_in_count || 0}/2 devices verified in person
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

            {session.status === 'upcoming' && (
              <div className="mt-5 border-2 border-ink bg-paper p-4">
                {isSessionTutor ? (
                  <div className="text-center">
                    {stagedToken ? (
                      <>
                        <p className="mb-2 flex items-center justify-center gap-1.5 text-[12px] font-bold uppercase text-ink">
                          <QrCode className="h-4 w-4" /> Show QR or code to student
                        </p>
                        <InPersonQr value={`${window.location.origin}/checkin?session=${session.id}&code=${stagedToken}`} />
                        <div className="mt-3 flex items-center justify-center gap-2">
                          <span className="num border-2 border-ink bg-gold px-3 py-1.5 text-[20px] font-extrabold tracking-widest text-ink">
                            {stagedToken}
                          </span>
                          <Button type="button" variant="ghost" size="icon" aria-label="Copy code" onClick={() => navigator.clipboard?.writeText(stagedToken)}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <Button type="button" className="mt-3 min-h-[44px]" disabled={checkingIn} onClick={() => handleF2fCheckIn(stagedToken)}>
                          Confirm tutor presence
                        </Button>
                      </>
                    ) : (
                      <Button type="button" className="min-h-[44px]" onClick={handleF2fStage}>
                        Generate in-person QR &amp; code
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="Enter tutor's one-time code"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="min-h-[44px]"
                    />
                    <Button type="button" disabled={checkingIn || !otp.trim()} onClick={() => handleF2fCheckIn(otp)} className="min-h-[44px] shrink-0">
                      Verify check-in
                    </Button>
                  </div>
                )}
              </div>
            )}

            {session.status === 'in-progress' && (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t-2 border-ink/15 pt-5">
                <p className="text-[13px] text-muted-foreground">
                  Either participant can finish the Face to Face session when done.
                </p>
                <Button
                  type="button"
                  variant="destructive"
                  size="lg"
                  onClick={() => setF2fWrapMode(true)}
                  className="min-h-[44px] font-extrabold"
                >
                  End session &amp; wrap up
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Online Dedicated Room (minimal layout, no sidebar) ──
  return (
    <div className={cn('flex h-[100dvh] flex-col bg-stone p-2.5 sm:p-4 overflow-hidden', embedded && 'h-full')}>
      <React.Suspense
        fallback={
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-ink" />
          </div>
        }
      >
        <LiveClassroom
          session={session}
          user={user}
          role={isSessionTutor ? 'tutor' : 'learner'}
          seconds={seconds}
          ending={ending}
          onEnd={handleTutorEndOnline}
          onLeave={handleStudentLeave}
          onMinimize={onMinimize}
          onRemoteSessionEvent={handleRemoteEvent}
          showToast={showToast}
        />
      </React.Suspense>
    </div>
  );
}
