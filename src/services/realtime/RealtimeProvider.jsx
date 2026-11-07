import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getCentrifugoService } from './CentrifugoService';
import { getWsRealtimeService } from './WsRealtimeService';
import { MockRealtimeService } from './RealtimeService';

const RealtimeContext = createContext(null);

export function RealtimeProvider({ children, backend: customBackend, currentUser }) {
  const backend =
    customBackend ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_REALTIME_BACKEND) ||
    'websocket';

  const service = useMemo(() => {
    if (backend === 'mock') {
      return new MockRealtimeService();
    }
    if (backend === 'centrifugo') {
      const instance = getCentrifugoService();
      if (currentUser?.id) {
        instance.setCurrentUser(currentUser.id);
      }
      return instance;
    }
    const instance = getWsRealtimeService();
    if (currentUser) {
      instance.setCurrentUser(currentUser);
    }
    return instance;
  }, [backend, currentUser]);

  const [status, setStatus] = useState(service.status);

  useEffect(() => {
    const unsub = service.onStatusChange((s) => setStatus(s));
    return () => unsub();
  }, [service]);

  const value = useMemo(
    () => ({
      service,
      status,
      isConnected: status === 'connected',
      isReconnecting: status === 'reconnecting',
      backend,
    }),
    [service, status, backend]
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export function useRealtimeContext() {
  return useContext(RealtimeContext);
}

