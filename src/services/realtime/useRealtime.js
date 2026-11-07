import { useState, useEffect, useRef, useCallback } from 'react';
import { getRealtimeService } from './RealtimeService';

/**
 * React hook wrapping RealtimeService.
 * Safe for React StrictMode double-mounting; handles listener cleanup and connection lifecycle.
 *
 * @param {string} sessionId
 */
export function useRealtime(sessionId) {
  const serviceRef = useRef(null);
  if (!serviceRef.current) {
    serviceRef.current = getRealtimeService(sessionId);
  }

  // Update instance if sessionId changes
  if (serviceRef.current.sessionId !== sessionId) {
    serviceRef.current = getRealtimeService(sessionId);
  }

  const [status, setStatus] = useState(serviceRef.current.status);
  const [messages, setMessages] = useState(serviceRef.current.messages);
  const [ideState, setIdeState] = useState(serviceRef.current.ideState);

  useEffect(() => {
    const service = serviceRef.current;
    service.connect(sessionId);

    const unsubStatus = service.onStatusChange((s) => setStatus(s));
    const unsubMsg = service.onMessage((msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });
    const unsubIde = service.onIdeState((state) => setIdeState(state));

    return () => {
      unsubStatus();
      unsubMsg();
      unsubIde();
      service.disconnect();
    };
  }, [sessionId]);

  const sendMessage = useCallback((text, sender) => {
    return serviceRef.current?.sendMessage(text, sender);
  }, []);

  const pushIdeState = useCallback((state) => {
    serviceRef.current?.pushIdeState(state);
  }, []);

  const onMessage = useCallback((cb) => {
    return serviceRef.current?.onMessage(cb);
  }, []);

  const onIdeState = useCallback((cb) => {
    return serviceRef.current?.onIdeState(cb);
  }, []);

  return {
    status,
    messages,
    ideState,
    sendMessage,
    pushIdeState,
    onMessage,
    onIdeState,
  };
}
