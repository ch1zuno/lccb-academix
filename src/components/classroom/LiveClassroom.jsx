import React, { useState } from 'react';
import { PhoneOff, Clock, Wifi, WifiOff, AlertTriangle, Video, Globe } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { useRealtime } from '../../services/realtime';
import DualPurposeChat from './DualPurposeChat';
import JitsiMeetingRoom from './JitsiMeetingRoom';
import NativeVideoRoom from './NativeVideoRoom';

export default function LiveClassroom({ session, user, role, seconds, onEnd, showToast }) {
  const [videoEngine, setVideoEngine] = useState('webrtc'); // 'webrtc' (instant direct peer-to-peer) | 'jitsi'
  const { isReconnecting, accessDenied, isOnline, isRoleOnline } = useRealtime(session?.id);

  const peerId = role === 'tutor' ? session?.learner_id : session?.tutor_id;
  const peerRole = role === 'tutor' ? 'learner' : 'tutor';
  const peerName = role === 'tutor' ? session?.learner_name : session?.tutor_name;

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
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2.5 border-2 border-ink bg-surface-quiet px-3.5 py-2 shadow-[3px_3px_0_var(--color-ink)] shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="grid h-9 w-9 shrink-0 place-items-center border-2 border-ink bg-gold font-display text-[13px] font-extrabold text-ink shadow-[2px_2px_0_var(--color-ink)]">
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
            <div className="flex items-center gap-2 text-[12px] text-muted-foreground truncate">
              <span>{session.session_code}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1.5 truncate">
                <span className="truncate">{role === 'tutor' ? `Learner: ${peerName}` : `Tutor: ${peerName}`}</span>
                <span
                  title={isPeerOnline ? 'Participant is online' : 'Participant is offline'}
                  className={cn(
                    'inline-block h-2 w-2 shrink-0 rounded-full border border-ink',
                    isPeerOnline ? 'bg-emerald' : 'bg-gray-300'
                  )}
                />
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-2 border-2 border-ink bg-paper px-2.5 py-1 text-ink shadow-[2px_2px_0_var(--color-ink)]">
            <Clock className="h-4 w-4 text-emerald" />
            <span className="num text-[16px] font-extrabold">{formatTimer(seconds)}</span>
          </div>
          <Button variant="destructive" size="sm" onClick={() => onEnd(seconds)} className="h-8 text-xs font-bold px-3">
            <PhoneOff className="mr-1.5 h-3.5 w-3.5" /> End Session
          </Button>
        </div>
      </div>

      {/* Main Classroom Layout: Left Video Stage / Right Dual Chat */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 flex-1 min-h-0 min-w-0">
        {/* Left Video Stage (7 cols on lg, 8 cols on xl) */}
        <div className="flex flex-col border-2 border-ink bg-paper shadow-[3px_3px_0_var(--color-ink)] lg:col-span-7 xl:col-span-8 min-h-[380px] lg:min-h-0 min-w-0 overflow-hidden">
          {/* Video Header & Mode Switcher */}
          <div className="flex flex-wrap items-center justify-between border-b-2 border-ink bg-surface-quiet px-3 py-1.5 text-xs shrink-0">
            <span className="font-display font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
              <Video className="h-3.5 w-3.5 text-ink" /> Live Classroom Video
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setVideoEngine('webrtc')}
                className={cn(
                  'rounded px-2 py-0.5 text-[11px] font-bold border transition-colors',
                  videoEngine === 'webrtc'
                    ? 'border-ink bg-emerald text-ink shadow-[1px_1px_0_var(--color-ink)]'
                    : 'border-transparent text-muted-foreground hover:text-ink'
                )}
                title="Direct WebRTC Peer-to-Peer over local Wi-Fi (instant connect, no third-party login)"
              >
                Direct WebRTC (Fast LAN)
              </button>
              <button
                type="button"
                onClick={() => setVideoEngine('jitsi')}
                className={cn(
                  'rounded px-2 py-0.5 text-[11px] font-bold border transition-colors',
                  videoEngine === 'jitsi'
                    ? 'border-ink bg-gold text-ink shadow-[1px_1px_0_var(--color-ink)]'
                    : 'border-transparent text-muted-foreground hover:text-ink'
                )}
                title="Jitsi Meet iframe external room"
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
                onHangup={() => onEnd(seconds)}
              />
            ) : (
              <JitsiMeetingRoom
                roomId={session.id}
                user={{ displayName: user?.name || 'Participant' }}
                active={true}
                onHangup={() => onEnd(seconds)}
                onError={() => {
                  showToast?.('Jitsi blocked or unavailable. Switched to Direct WebRTC.', 'warning');
                  setVideoEngine('webrtc');
                }}
                onSwitchEngine={setVideoEngine}
              />
            )}
          </div>
        </div>

        {/* Right Dual-Purpose Chat (5 cols on lg, 4 cols on xl) */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col h-full min-h-[380px] lg:min-h-0 min-w-0 overflow-hidden">
          <DualPurposeChat
            sessionId={session.id}
            user={user}
            role={role}
            showToast={showToast}
          />
        </div>
      </div>
    </div>
  );
}
