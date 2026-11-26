import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { PhoneCall, Maximize2, Clock, ExternalLink } from 'lucide-react';
import { Button } from '../components/ui/button';
import api from '../api';

const SessionRoom = React.lazy(() => import('../screens/SessionRoom'));

const ActiveSessionContext = createContext(null);

function isMobileOrPwa() {
  if (typeof window === 'undefined') return false;
  const standalone = window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator?.standalone === true;
  return standalone || window.innerWidth < 768;
}

const formatTimer = (totalSeconds = 0) => {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h > 0 ? `${h}:` : ''}${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
};

export function ActiveSessionProvider({ user, role, showToast, children }) {
  const location = useLocation();
  const [liveSession, setLiveSession] = useState(null);
  const [layerSession, setLayerSession] = useState(null);
  const [minimized, setMinimized] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const knownLiveIdRef = useRef(null);
  const onRoomRoute = location.pathname.startsWith('/session/');

  const refreshLiveSession = useCallback(async ({ announceNew = false } = {}) => {
    if (!user || (role !== 'learner' && role !== 'tutor')) {
      setLiveSession(null);
      return;
    }
    try {
      const { sessions } = await api.get('/sessions/mine', { scope: 'checkin' });
      const active = (sessions || []).find((s) => s.status === 'in-progress') || null;
      setLiveSession(active);

      if (active?.started_at) {
        setElapsed(Math.max(0, Math.floor((Date.now() - new Date(active.started_at).getTime()) / 1000)));
      }

      if (active && announceNew && knownLiveIdRef.current !== active.id && !onRoomRoute && !layerSession) {
        showToast?.(
          `Your ${active.mode === 'face_to_face' ? 'Face to Face' : 'Online'} session is live!`,
          'info',
          { label: 'Join now', onClick: () => openRoom(active) },
        );
      }
      knownLiveIdRef.current = active?.id || null;

      if (!active && layerSession) {
        // Let SessionRoom handle wrap-up UI if it's already showing ended state
      }
    } catch {
      // keep existing state on transient errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, role, onRoomRoute, layerSession?.id]);

  // Initial + periodic + focus sync
  useEffect(() => {
    if (!user || (role !== 'learner' && role !== 'tutor')) {
      setLiveSession(null);
      setLayerSession(null);
      knownLiveIdRef.current = null;
      return undefined;
    }
    refreshLiveSession({ announceNew: false });
    const poll = setInterval(() => refreshLiveSession({ announceNew: true }), 15_000);
    const onFocus = () => refreshLiveSession({ announceNew: true });
    window.addEventListener('focus', onFocus);

    let bc = null;
    if (typeof BroadcastChannel !== 'undefined') {
      bc = new BroadcastChannel('academix-session-sync');
      bc.onmessage = () => refreshLiveSession({ announceNew: true });
    }

    return () => {
      clearInterval(poll);
      window.removeEventListener('focus', onFocus);
      bc?.close();
    };
  }, [user?.id, role, refreshLiveSession]);

  // Live timer tick for the persistent bar / floating mini-bar
  useEffect(() => {
    const active = liveSession || layerSession;
    if (!active) return undefined;
    const t = setInterval(() => {
      if (active.started_at) {
        setElapsed(Math.max(0, Math.floor((Date.now() - new Date(active.started_at).getTime()) / 1000)));
      } else {
        setElapsed((s) => s + 1);
      }
    }, 1000);
    return () => clearInterval(t);
  }, [liveSession?.id, liveSession?.started_at, layerSession?.id, layerSession?.started_at]);

  /**
   * Must be called from a real user click (Join / Start / Return to call).
   * - Phones (< 768px) & installed PWAs: mounts persistent root CallLayer (default).
   * - Desktop browsers: opens named tab `academix-session-<id>`; falls back to CallLayer if blocked.
   */
  const openRoom = useCallback((session) => {
    if (!session?.id) return;
    if (isMobileOrPwa()) {
      setLayerSession(session);
      setMinimized(false);
      return;
    }
    const url = `/session/${encodeURIComponent(session.id)}`;
    const win = window.open(url, `academix-session-${session.id}`);
    if (win) {
      try { win.focus(); } catch { /* ignore */ }
    } else {
      // Popup blocked: seamlessly fall back to root CallLayer
      setLayerSession(session);
      setMinimized(false);
      showToast?.('Popup blocked — opened session room inline.', 'info');
    }
  }, [showToast]);

  const showPersistentBar = Boolean(
    liveSession && !onRoomRoute && !(layerSession && !minimized),
  );

  return (
    <ActiveSessionContext.Provider
      value={{
        liveSession,
        elapsed,
        openRoom,
        refreshLiveSession,
        hasExpandedLayer: Boolean(layerSession && !minimized),
      }}
    >
      {/* Persistent "Session in progress, Return to call" bar across the main app */}
      {showPersistentBar && (
        <div
          role="region"
          aria-label="Active tutoring session"
          className="sticky top-0 z-40 flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink bg-gold px-3 py-2 text-ink shadow-[0_3px_0_var(--color-ink)] sm:px-5"
        >
          <div className="flex min-w-0 items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 animate-pulse border border-ink bg-emerald" />
            <span className="truncate font-display text-[13px] font-extrabold sm:text-[14px]">
              Session in progress · {liveSession.subject || liveSession.session_code}
            </span>
            <span className="num inline-flex items-center gap-1 border border-ink bg-paper px-1.5 py-0.5 text-[12px] font-extrabold">
              <Clock className="h-3 w-3 text-emerald" aria-hidden="true" />
              {formatTimer(elapsed)}
            </span>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => (layerSession ? setMinimized(false) : openRoom(liveSession))}
            className="min-h-[36px] shrink-0 text-[12px] font-extrabold"
          >
            {layerSession ? <Maximize2 className="mr-1.5 h-3.5 w-3.5" /> : <ExternalLink className="mr-1.5 h-3.5 w-3.5" />}
            Return to call
          </Button>
        </div>
      )}

      {children}

      {/* Root CallLayer mounted outside <Routes> (phones/PWAs/popup fallback):
          stays mounted while minimized so sidebar navigation never drops video/audio. */}
      {layerSession && (
        <div
          className={
            minimized
              ? 'fixed bottom-4 left-3 right-3 z-[65] sm:left-auto sm:right-5 sm:w-[360px]'
              : 'fixed inset-0 z-[65] bg-stone'
          }
        >
          {minimized && (
            <div className="flex items-center justify-between gap-2 border-2 border-ink bg-ink px-3.5 py-2.5 text-paper shadow-[4px_4px_0_var(--color-gold)]">
              <div className="flex min-w-0 items-center gap-2">
                <PhoneCall className="h-4 w-4 shrink-0 text-gold" />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-extrabold">{layerSession.subject || 'Live session'}</p>
                  <p className="num text-[11px] text-gold">{formatTimer(elapsed)} · Live</p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => setMinimized(false)}
                className="min-h-[40px] shrink-0 bg-gold text-ink hover:bg-gold/90"
              >
                <Maximize2 className="mr-1 h-3.5 w-3.5" />
                Return
              </Button>
            </div>
          )}

          <div className={minimized ? 'hidden' : 'h-full w-full'}>
            <React.Suspense fallback={<div className="flex h-full items-center justify-center text-sm font-bold">Opening room…</div>}>
              <SessionRoom
                sessionId={layerSession.id}
                user={user}
                role={role}
                showToast={showToast}
                embedded
                onMinimize={() => setMinimized(true)}
                onLeaveEmbedded={() => {
                  setLayerSession(null);
                  setMinimized(false);
                  refreshLiveSession({ announceNew: false });
                }}
                onSessionEnded={() => {
                  setLiveSession(null);
                  refreshLiveSession({ announceNew: false });
                }}
              />
            </React.Suspense>
          </div>
        </div>
      )}
    </ActiveSessionContext.Provider>
  );
}

export function useActiveSession() {
  return useContext(ActiveSessionContext) || {
    liveSession: null,
    elapsed: 0,
    openRoom: (session) => {
      if (session?.id) window.open(`/session/${encodeURIComponent(session.id)}`, `academix-session-${session.id}`);
    },
    refreshLiveSession: () => {},
    hasExpandedLayer: false,
  };
}

export default ActiveSessionContext;
