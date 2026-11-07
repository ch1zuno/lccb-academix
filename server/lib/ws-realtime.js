import { WebSocketServer } from 'ws';

/**
 * Lightweight native WebSocket realtime server for peer tutoring rooms.
 * Zero-dependency alternative to Centrifugo container, ensuring real-time
 * chat, presence, and collaborative IDE work seamlessly across LAN / Wi-Fi.
 */
export function setupWebSocketServer(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/realtime-ws' });

  // Map of roomId -> Set of ws clients
  const rooms = new Map();

  function broadcastPresence(roomId) {
    const clients = rooms.get(roomId);
    if (!clients) return;

    const presenceList = [];
    for (const client of clients) {
      if (client.userId) {
        presenceList.push({
          id: client.userId,
          name: client.userName || 'Participant',
          role: client.userRole || 'student',
          online: true,
        });
      }
    }

    const payload = JSON.stringify({
      type: 'presence',
      roomId,
      presence: presenceList,
    });

    for (const client of clients) {
      if (client.readyState === 1 /* OPEN */) {
        client.send(payload);
      }
    }
  }

  wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', (data) => {
      let msg;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        return;
      }

      const { type, roomId } = msg;
      if (!roomId) return;

      if (type === 'subscribe') {
        ws.roomId = roomId;
        ws.userId = msg.user?.id || msg.userId;
        ws.userName = msg.user?.name || msg.userName || 'Participant';
        ws.userRole = msg.user?.role || msg.userRole || 'student';

        if (!rooms.has(roomId)) {
          rooms.set(roomId, new Set());
        }
        rooms.get(roomId).add(ws);

        // Acknowledge subscription
        ws.send(JSON.stringify({ type: 'subscribed', roomId, status: 'connected' }));

        // Broadcast presence
        broadcastPresence(roomId);
        return;
      }

      if (type === 'unsubscribe') {
        const clients = rooms.get(roomId);
        if (clients) {
          clients.delete(ws);
          if (clients.size === 0) rooms.delete(roomId);
          else broadcastPresence(roomId);
        }
        return;
      }

      // Broadcast chat, IDE, or WebRTC signaling to peer clients in the same room
      if (type === 'chat' || type === 'ide' || type === 'signal') {
        const clients = rooms.get(roomId);
        if (!clients) return;

        const broadcastPayload = JSON.stringify(msg);
        for (const client of clients) {
          if (client !== ws && client.readyState === 1 /* OPEN */) {
            client.send(broadcastPayload);
          }
        }
      }
    });

    ws.on('close', () => {
      if (ws.roomId && rooms.has(ws.roomId)) {
        const clients = rooms.get(ws.roomId);
        clients.delete(ws);
        if (clients.size === 0) {
          rooms.delete(ws.roomId);
        } else {
          broadcastPresence(ws.roomId);
        }
      }
    });
  });

  // Heartbeat ping interval
  const pingInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(pingInterval);
  });

  console.log('Realtime WebSocket server mounted at /realtime-ws');
  return wss;
}

