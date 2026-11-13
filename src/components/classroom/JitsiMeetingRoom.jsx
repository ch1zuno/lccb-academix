import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from 'react';
import { Loader2, ShieldAlert, AlertTriangle, RefreshCw, Video } from 'lucide-react';
import { Button } from '../ui/button';
import api from '../../api';
import { loadJitsiScript } from '../../lib/jitsi-script-loader';

/**
 * JitsiMeetingRoom Component
 * Mounts Jitsi Meet External API iframe inside the exact #video-container element.
 */
const JitsiMeetingRoom = forwardRef(function JitsiMeetingRoom(
  {
    roomId,
    user,
    active = true,
    jwt,
    onReady,
    onParticipantJoined,
    onParticipantLeft,
    onHangup,
    onError,
    onSwitchEngine,
  },
  ref
) {
  const containerRef = useRef(null);
  const apiRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [error, setError] = useState(null);
  const [deviceWarning, setDeviceWarning] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // Keep latest callbacks in ref to avoid re-triggering init effect on callback prop identity change
  const callbacksRef = useRef({
    onReady,
    onParticipantJoined,
    onParticipantLeft,
    onHangup,
    onError,
  });

  useEffect(() => {
    callbacksRef.current = {
      onReady,
      onParticipantJoined,
      onParticipantLeft,
      onHangup,
      onError,
    };
  });

  const dispose = useCallback(() => {
    if (apiRef.current) {
      try {
        apiRef.current.dispose();
      } catch (e) {
        // Safe to ignore double disposal
      }
      apiRef.current = null;
    }
  }, []);

  // Expose imperative leave method to parent
  useImperativeHandle(
    ref,
    () => ({
      leave: () => {
        if (apiRef.current) {
          try {
            apiRef.current.executeCommand('hangup');
          } catch (e) {
            // ignore
          }
        }
        dispose();
      },
    }),
    [dispose]
  );

  // Auto-dismiss loading overlay after 3.5s so Jitsi prompt or prejoin is never covered
  useEffect(() => {
    if (loading) {
      const timer = setTimeout(() => setLoading(false), 3500);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  useEffect(() => {
    if (!active) {
      dispose();
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setAccessDenied(false);
    setError(null);
    setDeviceWarning(null);

    async function initRoom() {
      try {
        // 1. Fetch authorized unguessable room name from backend
        const roomData = await api.get(`/video/room?roomId=${encodeURIComponent(roomId)}`);
        if (!isMounted) return;

        const { roomName, domain = 'meet.jit.si' } = roomData;

        // 2. Load Jitsi external_api.js dynamically
        const JitsiAPI = await loadJitsiScript(domain);
        if (!isMounted || !containerRef.current) return;

        // Dispose existing session if any
        dispose();

        // 3. Configure Jitsi Meet External API
        const displayName = user?.displayName || user?.name || 'Participant';

        const options = {
          roomName,
          width: '100%',
          height: '100%',
          parentNode: containerRef.current,
          jwt: jwt || undefined,
          userInfo: {
            displayName,
            // User email deliberately omitted by default to safeguard student privacy
          },
          configOverwrite: {
            prejoinConfig: {
              enabled: false,
            },
            prejoinPageEnabled: false,
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            disableDeepLinking: true,
            toolbarButtons: [
              'microphone',
              'camera',
              'desktop',
              'hangup',
              'videoquality',
            ],
            notifications: [],
          },
          interfaceConfigOverwrite: {
            TOOLBAR_BUTTONS: [
              'microphone',
              'camera',
              'desktop',
              'hangup',
              'videoquality',
            ],
            SHOW_JITSI_WATERMARK: false,
            SHOW_WATERMARK_FOR_GUESTS: false,
          },
        };

        const jitsi = new JitsiAPI(domain, options);
        apiRef.current = jitsi;
        setLoading(false);

        // 4. Attach event listeners
        jitsi.addListener('videoConferenceJoined', () => {
          if (!isMounted) return;
          setLoading(false);
          callbacksRef.current.onReady?.();
        });

        jitsi.addListener('participantJoined', (p) => {
          if (!isMounted) return;
          callbacksRef.current.onParticipantJoined?.({
            id: p?.id || 'unknown',
            displayName: p?.displayName || 'Participant',
          });
        });

        jitsi.addListener('participantLeft', (p) => {
          if (!isMounted) return;
          callbacksRef.current.onParticipantLeft?.({
            id: p?.id || 'unknown',
          });
        });

        jitsi.addListener('videoConferenceLeft', () => {
          if (!isMounted) return;
          callbacksRef.current.onHangup?.();
          dispose();
        });

        jitsi.addListener('readyToClose', () => {
          if (!isMounted) return;
          callbacksRef.current.onHangup?.();
          dispose();
        });

        jitsi.addListener('cameraError', (err) => {
          if (!isMounted) return;
          setDeviceWarning('Camera is unavailable or permission was blocked in your browser.');
          callbacksRef.current.onError?.(err);
        });

        jitsi.addListener('micError', (err) => {
          if (!isMounted) return;
          setDeviceWarning('Microphone is unavailable or permission was blocked in your browser.');
          callbacksRef.current.onError?.(err);
        });
      } catch (err) {
        if (!isMounted) return;
        setLoading(false);
        if (err.status === 403 || err.response?.status === 403) {
          setAccessDenied(true);
        } else {
          setError(err.message || 'Failed to connect to the video conference');
          callbacksRef.current.onError?.(err);
        }
      }
    }

    initRoom();

    return () => {
      isMounted = false;
      dispose();
    };
  }, [roomId, active, jwt, retryCount, dispose, user?.displayName, user?.name]);

  return (
    <div
      id="video-container"
      ref={containerRef}
      className="relative flex h-full min-h-0 w-full flex-col items-center justify-center overflow-hidden bg-[#0c1f30] text-paper"
    >
      {/* Access Denied State */}
      {accessDenied && (
        <div className="flex max-w-sm flex-col items-center p-6 text-center">
          <ShieldAlert className="mb-3 h-12 w-12 text-crimson" />
          <h3 className="font-display text-lg font-bold text-paper">Video Access Denied</h3>
          <p className="mt-1 text-xs text-[#a0aec0]">
            You are not an assigned participant or accredited supervisor for this session.
          </p>
        </div>
      )}

      {/* Script or Connection Error Fallback */}
      {!accessDenied && error && (
        <div className="flex max-w-sm flex-col items-center p-6 text-center">
          <AlertTriangle className="mb-3 h-12 w-12 text-gold" />
          <h3 className="font-display text-lg font-bold text-paper">Connection Failed</h3>
          <p className="mt-1 text-xs text-[#a0aec0]">{error}</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRetryCount((c) => c + 1)}
              className="border-paper bg-transparent text-paper hover:bg-paper hover:text-ink"
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Retry Jitsi
            </Button>
            {onSwitchEngine && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onSwitchEngine('webrtc')}
                className="border-gold bg-gold text-ink font-bold hover:bg-gold/90 shadow-[2px_2px_0_#000]"
              >
                Switch to Direct WebRTC
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Initializing Spinner */}
      {!accessDenied && !error && loading && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-[#0c1f30]/80 backdrop-blur-sm z-10">
          <Loader2 className="mb-3 h-10 w-10 animate-spin text-gold" />
          <p className="font-display text-sm font-semibold tracking-wide text-paper">
            Connecting to Classroom Video...
          </p>
          <p className="mt-1 text-[11px] text-[#a0aec0]">Setting up secure media stage</p>
        </div>
      )}

      {/* Camera / Microphone Device Permission Alert */}
      {deviceWarning && (
        <div className="absolute top-3 left-3 right-3 z-20 flex items-center gap-2 border border-amber-600 bg-amber-950/90 px-3 py-2 text-xs text-amber-200 shadow-md">
          <Video className="h-4 w-4 shrink-0 text-amber-400" />
          <span className="flex-1">{deviceWarning}</span>
          <button
            type="button"
            onClick={() => setDeviceWarning(null)}
            className="text-amber-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
});

export default JitsiMeetingRoom;

