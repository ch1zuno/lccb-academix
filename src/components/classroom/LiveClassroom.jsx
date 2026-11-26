import React, { useState, useRef, useEffect } from 'react';
import { PhoneOff, Clock, WifiOff, AlertTriangle, Video, LogOut, Minimize2 } from 'lucide-react';
import { Button } from '../ui/button';
import ConfirmDialog from '../ui/ConfirmDialog';
import { cn } from '../../lib/utils';
import { useRealtime } from '../../services/realtime';
import DualPurposeChat from './DualPurposeChat';
import JitsiMeetingRoom from './JitsiMeetingRoom';
import NativeVideoRoom from './NativeVideoRoom';

export default function LiveClassroom({
  session,
  user,
  role,
  seconds,
  onEnd,
  onLeave,
  onMinimize,
  onRemoteSessionEvent,
  ending = false,
  showToast,
}) {
  const [videoEngine, setVideoEngine] = useState('webrtc'); // 'webrtc' | 'jitsi'
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);
  const { isReconnecting, accessDenied, isOnline, isRoleOnline, onRoomEvent } = useRealtime(session?.id);
  const flushNotesRef = useRef(null);
  const jitsiRef = useRef(null);

  const isSessionTutor = user?.id && session?.tutor_id
    ? String(user.id) === String(session.tutor_id)
    : role === 'tutor';

  // Listen for tutor ending or system auto-closing the room
  useEffect(() => {
    const unsub = onRoomEvent((event) => {
      if (!event?.type) return;
      if (event.type === 'session.ended' || event.type === 'session.auto_closed') {
        flushNotesRef.current?.();
        jitsiRef.current?.leave?.();
        onRemoteSessionEvent?.(event);
      }
    });
    return () => unsub?.();
  }, [onRoomEvent, onRemoteSessionEvent]);

  const handleConfirmEnd = async () => {
    flushNotesRef.current?.();
    jitsiRef.current?.leave?.();
    await onEnd?.(seconds);
    setConfirmEndOpen(false);
  };

  const handleLeaveCall = () => {
    flushNotesRef.current?.();
    jitsiRef.current?.leave?.();
    onLeave?.();
  };

  const handleVideoHangup = () => {
    if (isSessionTutor) {
      setConfirmEndOpen(true);
    } else {
      handleLeaveCall();
    }
  };

  const peerId = isSessionTutor ? session?.learner_id : session?.tutor_id;
  const peerRole = isSessionTutor ? 'student' : 'tutor';
  const peerName = isSessionTutor ? session?.learner_name : session?.tutor_name;
  const isPeerOnline = peerId ? isOnline(peerId) : isRoleOnline(peerRole);

  const formatTimer = (totalSeconds = 0) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h > 0 ? `${h}:` : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full flex-1 flex flex-col min-w-0 min-h-0">
      {/* Session Banner */}
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2.5 border-2 border-ink bg-surface-quiet px-3.5 py-2 shadow-[var(--nb-shadow-sm)_var(--nb-shadow-sm)_0_var(--color-ink)] shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="grid h-9 w-9 shrink-0 place-items-center border-2 border-ink bg-gold font-display text-[12px] font-extrabold text-ink shadow-[2px_2px_0_var(--color-ink)]">
            LIVE
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-display text-[15px] font-bold leading-tight text-ink truncate">
                {session.subject} · {session.topic}
              </p>
              {isReconnecting && (
                <span className="inline-flex shrink-0 items-center gap-1 border border-amber-600 bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-900">
                  <WifiOff className="h-3 w-3 animate-pulse" /> Reconnecting
                </span>
              )}
              {accessDenied && (
                <span className="inline-flex shrink-0 items-center gap-1 border border-red-600 bg-red-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-red-900">
                  <AlertTriangle className="h-3 w-3" /> Access Denied
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-muted-foreground">
              <span>{session.session_code}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1.5">
                <span className="truncate">{isSessionTutor ? `Learner: ${peerName}` : `Tutor: ${peerName}`}</span>
                <span
                  title={isPeerOnline ? 'In room' : 'Not in room'}
                  className={cn(
                    'inline-flex items-center gap-1 border border-ink/30 px-1.5 py-0.5 text-[10px] font-bold uppercase',
                    isPeerOnline ? 'bg-emerald/15 text-emerald' : 'bg-paper text-muted-foreground',
                  )}
                >
                  <span className={cn('h-1.5 w-1.5 rounded-full', isPeerOnline ? 'bg-emerald' : 'bg-ink/30')} />
                  {isPeerOnline ? 'Joined' : 'Away'}
                </span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex min-h-[44px] items-center gap-2 border-2 border-ink bg-paper px-2.5 py-1 text-ink shadow-[2px_2px_0_var(--color-ink)]">
            <Clock className="h-4 w-4 text-emerald" aria-hidden="true" />
            <span className="num text-[15px] font-extrabold">{formatTimer(seconds)}</span>
          </div>

          {onMinimize && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onMinimize}
              className="min-h-[44px] bg-paper text-xs font-bold px-3"
              aria-label="Minimize call"
            >
              <Minimize2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
              Minimize
            </Button>
          )}

          {isSessionTutor ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={ending}
              onClick={() => setConfirmEndOpen(true)}
              className="min-h-[44px] text-xs font-extrabold px-3"
            >
              <PhoneOff className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              End session
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleLeaveCall}
              className="min-h-[44px] bg-paper text-xs font-bold px-3"
            >
              <LogOut className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
              Leave
            </Button>
          )}
        </div>
      </div>

      {/* Main Classroom Layout: Left Video Stage / Right Dual Chat */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 flex-1 min-h-0 min-w-0">
        <div className="flex flex-col border-2 border-ink bg-paper shadow-[var(--nb-shadow-sm)_var(--nb-shadow-sm)_0_var(--color-ink)] lg:col-span-7 xl:col-span-8 min-h-[340px] lg:min-h-0 min-w-0 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-ink bg-surface-quiet px-3 py-1.5 text-xs shrink-0">
            <span className="font-display font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
              <Video className="h-3.5 w-3.5 text-ink" /> Live Classroom Video
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setVideoEngine('webrtc')}
                className={cn(
                  'rounded px-2 py-1 text-[11px] font-bold border transition-colors',
                  videoEngine === 'webrtc'
                    ? 'border-ink bg-emerald text-ink shadow-[1px_1px_0_var(--color-ink)]'
                    : 'border-transparent text-muted-foreground hover:text-ink',
                )}
              >
                Direct WebRTC
              </button>
              <button
                type="button"
                onClick={() => setVideoEngine('jitsi')}
                className={cn(
                  'rounded px-2 py-1 text-[11px] font-bold border transition-colors',
                  videoEngine === 'jitsi'
                    ? 'border-ink bg-gold text-ink shadow-[1px_1px_0_var(--color-ink)]'
                    : 'border-transparent text-muted-foreground hover:text-ink',
                )}
              >
                Jitsi Meet
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 relative w-full overflow-hidden">
            {videoEngine === 'webrtc' ? (
              <NativeVideoRoom
                roomId={session.id}
                user={user}
                peerName={peerName}
                isPeerOnline={isPeerOnline}
                onHangup={handleVideoHangup}
              />
            ) : (
              <JitsiMeetingRoom
                ref={jitsiRef}
                roomId={session.id}
                user={{ displayName: user?.name || 'Participant' }}
                active={true}
                onHangup={handleVideoHangup}
                onError={() => {
                  showToast?.('Jitsi blocked or unavailable. Switched to Direct WebRTC.', 'warning');
                  setVideoEngine('webrtc');
                }}
                onSwitchEngine={setVideoEngine}
              />
            )}
          </div>
        </div>

        <div className="lg:col-span-5 xl:col-span-4 flex flex-col h-full min-h-[340px] lg:min-h-0 min-w-0 overflow-hidden">
          <DualPurposeChat
            sessionId={session.id}
            session={session}
            user={user}
            role={role}
            showToast={showToast}
            onRegisterNoteFlush={(fn) => {
              flushNotesRef.current = fn;
            }}
          />
        </div>
      </div>

      {/* Tutor-only End Session Confirmation Dialog (exact copy, focus-trapped, default Cancel) */}
      <ConfirmDialog
        open={confirmEndOpen}
        title="End session"
        description="Are you sure you want to end this session?"
        warning="This ends the call for both you and the student and records the final session duration."
        cancelLabel="Cancel"
        confirmLabel="End session"
        variant="destructive"
        busy={ending}
        onCancel={() => setConfirmEndOpen(false)}
        onConfirm={handleConfirmEnd}
      />
    </div>
  );
}
