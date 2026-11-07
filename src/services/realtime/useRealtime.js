import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRealtimeContext } from './RealtimeProvider';
import { getCentrifugoService } from './CentrifugoService';
import { getRealtimeService as getMockService } from './RealtimeService';

/**
 * Universal React hook for realtime room channel interaction.
 * Works with Centrifugo (default) or Mock fallback.
 *
 * @param {string} sessionId Room / session identifier
 * @param {Object} [options]
 * @param {string} [options.backend] Explicit backend override ('centrifugo' | 'mock')
 */
export function useRealtime(sessionId, options = {}) {
  const context = useRealtimeContext();

  const backend =
    options.backend ||
    context?.backend ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_REALTIME_BACKEND) ||
    'centrifugo';

  const service = useMemo(() => {
    if (context?.service) return context.service;
    if (backend === 'mock') return getMockService(sessionId);
    return getCentrifugoService();
  }, [context?.service, backend, sessionId]);

  const [status, setStatus] = useState(service.status || 'idle');
  const [accessDenied, setAccessDenied] = useState(false);
  const [presence, setPresence] = useState([]);
  const [messages, setMessages] = useState([]);
  const [ideState, setIdeState] = useState({
    code: '// Start collaborating on code here\n',
    language: 'javascript',
    cursor: null,
  });
  const [isRemoteUpdate, setIsRemoteUpdate] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    service.subscribeToRoom(sessionId);

    const unsubStatus = service.onStatusChange((s) => setStatus(s));
    const unsubAccess = service.onAccessDenied?.(sessionId, (denied) => setAccessDenied(denied));
    const unsubPresence = service.onPresence?.(sessionId, (pres) => setPresence(pres));

    const unsubMsg = service.onMessage(sessionId, (msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    const unsubIde = service.onIdeState(sessionId, (state, meta) => {
      setIdeState(state);
      setIsRemoteUpdate(Boolean(meta?.isRemote));
    });

    return () => {
      unsubStatus?.();
      unsubAccess?.();
      unsubPresence?.();
      unsubMsg?.();
      unsubIde?.();
      service.unsubscribeFromRoom(sessionId);
    };
  }, [sessionId, service]);

  const sendMessage = useCallback(
    async (textOrPayload, maybeSender) => {
      if (!sessionId) return null;
      let text = '';
      let msgId;

      if (typeof textOrPayload === 'object' && textOrPayload !== null) {
        text = textOrPayload.text || '';
        msgId = textOrPayload.id;
      } else {
        text = textOrPayload;
      }

      return service.sendMessage({
        roomId: sessionId,
        text,
        id: msgId,
      }, maybeSender);
    },
    [sessionId, service]
  );

  const pushIdeState = useCallback(
    async (partialState) => {
      if (!sessionId) return;
      return service.pushIdeState({
        roomId: sessionId,
        ...partialState,
      });
    },
    [sessionId, service]
  );

  const onMessage = useCallback(
    (cb) => {
      if (!sessionId) return () => {};
      return service.onMessage(sessionId, cb);
    },
    [sessionId, service]
  );

  const onIdeState = useCallback(
    (cb) => {
      if (!sessionId) return () => {};
      return service.onIdeState(sessionId, cb);
    },
    [sessionId, service]
  );

  const onPresence = useCallback(
    (cb) => {
      if (!sessionId) return () => {};
      return service.onPresence(sessionId, cb);
    },
    [sessionId, service]
  );

  const isOnline = useCallback(
    (userId) => {
      if (!sessionId) return false;
      return service.isUserOnline?.(sessionId, userId) ?? false;
    },
    [sessionId, service]
  );

  const isRoleOnline = useCallback(
    (role) => {
      if (!sessionId) return false;
      return service.isRoleOnline?.(sessionId, role) ?? false;
    },
    [sessionId, service]
  );

  return {
    service,
    status,
    isConnected: status === 'connected',
    isReconnecting: status === 'reconnecting',
    accessDenied,
    presence,
    messages,
    ideState,
    isRemoteUpdate,
    sendMessage,
    pushIdeState,
    onMessage,
    onIdeState,
    onPresence,
    isOnline,
    isRoleOnline,
  };
}
