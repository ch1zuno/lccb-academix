import { WebSocketServer } from 'ws';
import { authenticateRequest } from '../middleware/auth.js';
import { verifyRoomMembership } from './room-membership.js';
import { audit } from './audit.js';
import { registerWsBroadcaster, recordRoomPresence } from './realtimeEvents.js';

/**
 * Lightweight native WebSocket realtime server for peer tutoring rooms.
 * Authenticates every socket via the HttpOnly session cookie / Bearer JWT and
 * authorizes every room subscription against PostgreSQL session membership.
 */
export function setupWebSocketServer(httpServer) {
  const wss = new WebSocketServer({
    server: httpServer,
    path: '/realtime-ws',
    maxPayload: 64 * 1024,
  });

  // Map of roomId -> Set of ws clients
  const rooms = new Map();

  function broadcastPresence(roomId) {
    const clients = rooms.get(roomId);
    if (!clients) return;

    const presenceList = [];
    for (const client of clients) {
      if (client.user) {
        presenceList.push({
          id: client.user.id,
          name: client.user.name || 'Participant',
          role: client.user.role === 'learner' ? 'student' : client.user.role,
          online: true,
        });
      }
    }

    const payload = JSON.stringify({
      type: 'presence',
      roomId,
      presence: presenceList,
    });

    recordRoomPresence(roomId, presenceList);

    for (const client of clients) {
      if (client.readyState === 1 /* OPEN */) {
        client.send(payload);
      }
    }
  }

  registerWsBroadcaster((roomId, event) => {
    const clients = rooms.get(roomId);
    if (!clients) return;
    const payload = JSON.stringify({ ...event, roomId });
    for (const client of clients) {
      if (client.readyState === 1 /* OPEN */) {
        client.send(payload);
      }
    }
  });

  wss.on('connection', (ws, req) => {
    ws.isAlive = true;
    ws.rooms = new Set();
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    // Authenticate handshake immediately via HttpOnly cookie or Bearer JWT.
    const authPromise = authenticateRequest(req)
      .then((result) => {
        if (result.error || !result.user) {
          ws.close(4001, 'Unauthorized');
          return null;
        }
        ws.user = result.user;
        return result.user;
      })
      .catch(() => {
        ws.close(4001, 'Unauthorized');
        return null;
      });

    ws.on('message', async (data) => {
      const user = await authPromise;
      if (!user || ws.readyState !== 1) return;

      let msg;
      try {
        msg = JSON.parse(data.toString());
      } catch {
        return;
      }

      const { type } = msg;
      const roomId = typeof msg.roomId === 'string' ? msg.roomId.trim() : '';
      if (!roomId) return;

      if (type === 'subscribe') {
        const check = await verifyRoomMembership(roomId, user.id).catch(() => ({ authorized: false }));
        if (!check.authorized) {
          ws.send(JSON.stringify({ type: 'error', roomId, message: check.message || 'Forbidden' }));
          return;
        }

        if (check.isSupervisor) {
          audit({
            actorId: user.id,
            actorRole: user.role,
            action: 'session.supervisor_join',
            entity: 'session',
            entityId: check.session?.id || roomId,
            detail: { channel: 'websocket', sessionCode: check.session?.session_code },
            ip: req.socket?.remoteAddress || null,
          }).catch(() => {});
        }

        ws.rooms.add(roomId);
        if (!rooms.has(roomId)) {
          rooms.set(roomId, new Set());
        }
        rooms.get(roomId).add(ws);

        ws.send(JSON.stringify({ type: 'subscribed', roomId, status: 'connected' }));
        broadcastPresence(roomId);
        return;
      }

      if (type === 'unsubscribe') {
        ws.rooms.delete(roomId);
        const clients = rooms.get(roomId);
        if (clients) {
          clients.delete(ws);
          if (clients.size === 0) rooms.delete(roomId);
          else broadcastPresence(roomId);
        }
        return;
      }

      // Broadcast chat, IDE, or WebRTC signaling ONLY to rooms this socket is authorized in.
      if (type === 'chat' || type === 'ide' || type === 'signal') {
        if (!ws.rooms.has(roomId)) return;
        const clients = rooms.get(roomId);
        if (!clients) return;

        const outbound = type === 'chat'
          ? {
            ...msg,
            roomId,
            sender: {
              id: user.id,
              name: user.name,
              role: user.role === 'learner' ? 'student' : user.role,
            },
          }
          : { ...msg, roomId };

        const broadcastPayload = JSON.stringify(outbound);
        for (const client of clients) {
          if (client !== ws && client.readyState === 1 /* OPEN */) {
            client.send(broadcastPayload);
          }
        }
      }
    });

    ws.on('close', () => {
      for (const roomId of ws.rooms) {
        const clients = rooms.get(roomId);
        if (!clients) continue;
        clients.delete(ws);
        if (clients.size === 0) {
          rooms.delete(roomId);
        } else {
          broadcastPresence(roomId);
        }
      }
      ws.rooms.clear();
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

