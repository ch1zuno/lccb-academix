import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  Users,
  Wifi,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { useRealtime } from '../../services/realtime';

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun.services.mozilla.com' },
  ],
};

export default function NativeVideoRoom({
  roomId,
  user,
  peerName = 'Peer',
  isPeerOnline = false,
  onHangup,
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const candidatesQueue = useRef([]);

  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [mediaError, setMediaError] = useState(null);

  const { sendSignal, onSignal } = useRealtime(roomId);

  // Initialize WebRTC PeerConnection
  const getOrCreatePC = useCallback(() => {
    if (pcRef.current) return pcRef.current;

    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcRef.current = pc;

    // Add local tracks to PC
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Handle remote track
    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setConnected(true);
        setConnecting(false);
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({
          type: 'candidate',
          candidate: event.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setConnected(true);
        setConnecting(false);
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setConnected(false);
      }
    };

    return pc;
  }, [sendSignal]);

  // Start local camera and mic
  useEffect(() => {
    let active = true;

    async function startMedia() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });

        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setMediaError(null);

        // Send a ping to let peers know we are ready to exchange video
        sendSignal({ type: 'ready', userId: user?.id });
      } catch (err) {
        if (!active) return;
        console.error('Camera/mic error:', err);
        setMediaError(
          err.name === 'NotAllowedError'
            ? 'Camera/microphone access was blocked in your browser. Please click the lock/camera icon in your address bar and allow permissions.'
            : `Could not access media devices: ${err.message}`
        );
        setConnecting(false);
      }
    }

    startMedia();

    return () => {
      active = false;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
    };
  }, [sendSignal, user?.id]);

  // Handle incoming signaling messages
  useEffect(() => {
    const unsub = onSignal(async (signal, sender) => {
      // Don't process self signals
      if (sender?.id && String(sender.id) === String(user?.id)) return;

      const pc = getOrCreatePC();

      try {
        if (signal.type === 'ready') {
          // Peer is ready, create and send offer if we have media
          if (localStreamRef.current) {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            sendSignal({ type: 'offer', sdp: offer.sdp });
          }
        } else if (signal.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp: signal.sdp }));
          // Drain queued candidates
          while (candidatesQueue.current.length) {
            const c = candidatesQueue.current.shift();
            await pc.addIceCandidate(new RTCIceCandidate(c));
          }
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendSignal({ type: 'answer', sdp: answer.sdp });
        } else if (signal.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: signal.sdp }));
          while (candidatesQueue.current.length) {
            const c = candidatesQueue.current.shift();
            await pc.addIceCandidate(new RTCIceCandidate(c));
          }
        } else if (signal.type === 'candidate') {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
          } else {
            candidatesQueue.current.push(signal.candidate);
          }
        }
      } catch (err) {
        console.warn('WebRTC signaling error:', err);
      }
    });

    return () => {
      unsub?.();
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
    };
  }, [onSignal, sendSignal, getOrCreatePC, user?.id]);

  // Toggle Mute Audio
  const toggleMic = () => {
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setMicMuted(!audioTrack.enabled);
    }
  };

  // Toggle Camera Video
  const toggleCamera = () => {
    if (!localStreamRef.current) return;
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setCameraOff(!videoTrack.enabled);
    }
  };

  return (
    <div
      id="video-container"
      className="relative flex h-full min-h-[440px] w-full flex-col items-center justify-center overflow-hidden bg-[#0c1f30] text-paper select-none"
    >
      {/* Media Device Permission Error */}
      {mediaError && (
        <div className="absolute top-4 left-4 right-4 z-30 flex items-center gap-3 border-2 border-crimson bg-red-950/90 p-3 text-xs text-red-200 shadow-lg">
          <AlertTriangle className="h-5 w-5 shrink-0 text-crimson" />
          <span className="flex-1">{mediaError}</span>
        </div>
      )}

      {/* Main Remote Video Stage */}
      <div className="relative h-full w-full flex items-center justify-center bg-[#07131e]">
        {/* Remote Video Stream */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={cn(
            'h-full w-full object-cover transition-opacity duration-300',
            connected ? 'opacity-100' : 'opacity-0 pointer-events-none absolute'
          )}
        />

        {/* Remote Peer Waiting Stage */}
        {!connected && (
          <div className="flex flex-col items-center justify-center p-6 text-center z-10">
            <div className="relative mb-4 flex h-20 w-20 items-center justify-center rounded-full border-2 border-gold/40 bg-ink/70 shadow-[0_0_20px_rgba(245,197,24,0.15)]">
              <Users className="h-9 w-9 text-gold animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald"></span>
              </span>
            </div>
            <h3 className="font-display text-base font-bold text-paper">
              {isPeerOnline ? `Connecting to ${peerName}...` : `Waiting for ${peerName} to join...`}
            </h3>
            <p className="mt-1.5 max-w-xs text-[11px] text-[#a0aec0]">
              Direct WebRTC peer connection active on local Wi-Fi. Your camera preview is live below.
            </p>
          </div>
        )}
      </div>

      {/* Local User Picture-in-Picture Preview (Bottom Right) */}
      <div className="absolute bottom-16 right-3 z-20 h-28 w-44 overflow-hidden rounded-md border-2 border-ink bg-black shadow-[3px_3px_0_#0f2942] sm:h-32 sm:w-48">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className={cn('h-full w-full object-cover -scale-x-100', cameraOff && 'hidden')}
        />
        {cameraOff && (
          <div className="flex h-full w-full flex-col items-center justify-center bg-ink/90 text-center">
            <VideoOff className="h-6 w-6 text-muted-foreground" />
            <span className="mt-1 text-[10px] text-muted-foreground">Camera off</span>
          </div>
        )}
        <div className="absolute bottom-1 left-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-paper">
          You ({user?.name ? user.name.split(' ')[0] : 'Me'})
        </div>
      </div>

      {/* Connection Status Pill (Top Left) */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 rounded-full border border-ink/40 bg-ink/80 px-2.5 py-1 text-[11px] font-semibold text-paper backdrop-blur-sm">
        <span
          className={cn(
            'h-2 w-2 rounded-full',
            connected ? 'bg-emerald animate-pulse' : 'bg-gold'
          )}
        />
        <span>{connected ? 'Direct LAN Video Active' : 'Waiting for Peer'}</span>
      </div>

      {/* Media Controls Toolbar (Bottom Center) */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full border-2 border-ink bg-[#0c1f30]/95 px-4 py-1.5 shadow-[2px_2px_0_#0f2942] backdrop-blur-sm">
        {/* Mic Button */}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={toggleMic}
          className={cn(
            'h-9 w-9 rounded-full p-0 border-2 border-ink transition-colors',
            micMuted ? 'bg-crimson text-white hover:bg-crimson/90' : 'bg-paper text-ink hover:bg-gold'
          )}
          title={micMuted ? 'Unmute Microphone' : 'Mute Microphone'}
        >
          {micMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>

        {/* Camera Button */}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={toggleCamera}
          className={cn(
            'h-9 w-9 rounded-full p-0 border-2 border-ink transition-colors',
            cameraOff ? 'bg-crimson text-white hover:bg-crimson/90' : 'bg-paper text-ink hover:bg-gold'
          )}
          title={cameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
        >
          {cameraOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
        </Button>

        {/* End Session Button */}
        <Button
          type="button"
          size="sm"
          variant="destructive"
          onClick={onHangup}
          className="h-9 rounded-full px-3 text-xs font-bold"
          title="End Video Call"
        >
          <PhoneOff className="mr-1.5 h-3.5 w-3.5" /> End Call
        </Button>
      </div>
    </div>
  );
}

