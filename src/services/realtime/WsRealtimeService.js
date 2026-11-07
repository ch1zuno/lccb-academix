/**
 * Native WebSocket Realtime Service for multi-device Wi-Fi/LAN peer sessions.
 * Implements the exact same interface as CentrifugoService and MockRealtimeService.
 */

function getWsUrl() {
  if (typeof window !== 'undefined' && window.location) {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}/realtime-ws`;
  }
  return 'ws://localhost:4000/realtime-ws';
}

export class WsRealtimeService {
  constructor(options = {}) {
    this.wsUrl = options.wsUrl || getWsUrl();
    this.status = 'idle'; // 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error'
    this.currentUser = null;
    this.ws = null;
    this.reconnectTimer = null;
    this.reconnectAttempts = 0;

    /** @type {Set<(status: string) => void>} */
    this.statusListeners = new Set();

    /**
     * Map of roomId -> {
     *   messageListeners: Set<Function>,
     *   ideListeners: Set<Function>,
     *   presenceListeners: Set<Function>,
     *   presence: Array<Object>,
     *   ideState: Object,
     *   refCount: number
     * }
     */
    this.rooms = new Map();
  }

  setCurrentUser(userOrId) {
    if (typeof userOrId === 'object' && userOrId !== null) {
      this.currentUser = userOrId;
    } else {
      this.currentUser = { id: userOrId };
    }
  }

  _setStatus(next) {
    if (this.status === next) return;
    this.status = next;
    for (const listener of this.statusListeners) {
      try {
        listener(next);
      } catch (e) {
        console.error('Error in status listener:', e);
      }
    }
  }

  onStatusChange(cb) {
    this.statusListeners.add(cb);
    cb(this.status);
    return () => this.statusListeners.delete(cb);
  }

  _connect() {
    if (typeof window === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this._setStatus(this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting');

    try {
      this.ws = new WebSocket(this.wsUrl);
    } catch (e) {
      this._setStatus('error');
      this._scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this._setStatus('connected');

      // Resubscribe to all active rooms
      for (const [roomId] of this.rooms) {
        this._send({
          type: 'subscribe',
          roomId,
          user: this.currentUser,
        });
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const { type, roomId } = msg;
        const entry = this.rooms.get(roomId);
        if (!entry) return;

        if (type === 'presence') {
          entry.presence = msg.presence || [];
          for (const cb of entry.presenceListeners) cb(entry.presence);
        } else if (type === 'chat') {
          for (const cb of entry.messageListeners) {
            cb({
              id: msg.id,
              text: msg.text,
              senderId: msg.sender?.id,
              senderName: msg.sender?.name,
              senderRole: msg.sender?.role,
              timestamp: msg.ts || new Date().toISOString(),
            });
          }
        } else if (type === 'ide') {
          entry.ideState = {
            code: msg.code,
            language: msg.language || 'javascript',
            cursor: msg.cursor || null,
          };
          for (const cb of entry.ideListeners) {
            cb(entry.ideState, { isRemote: true, seq: msg.seq });
          }
        } else if (type === 'signal') {
          if (entry.signalListeners) {
            for (const cb of entry.signalListeners) {
              cb(msg.signal, msg.sender);
            }
          }
        }
      } catch (err) {
        console.warn('Realtime WS parse error:', err);
      }
    };

    this.ws.onclose = () => {
      this.ws = null;
      this._setStatus('idle');
      this._scheduleReconnect();
    };

    this.ws.onerror = () => {
      this._setStatus('error');
    };
  }

  _scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.rooms.size === 0) return;

    this.reconnectAttempts += 1;
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 10000);
    this.reconnectTimer = setTimeout(() => {
      this._connect();
    }, delay);
  }

  _send(payload) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  _ensureRoom(roomId) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        messageListeners: new Set(),
        ideListeners: new Set(),
        presenceListeners: new Set(),
        accessListeners: new Set(),
        signalListeners: new Set(),
        presence: [],
        ideState: {
          code: '// Start collaborating on code here\n',
          language: 'javascript',
          cursor: null,
        },
        refCount: 0,
      });
    }
    return this.rooms.get(roomId);
  }

  subscribeToRoom(roomId) {
    if (!roomId) return;
    const entry = this._ensureRoom(roomId);
    entry.refCount += 1;

    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this._connect();
    } else {
      this._send({
        type: 'subscribe',
        roomId,
        user: this.currentUser,
      });
    }
  }

  unsubscribeFromRoom(roomId) {
    if (!roomId) return;
    const entry = this.rooms.get(roomId);
    if (!entry) return;

    entry.refCount = Math.max(0, entry.refCount - 1);
    if (entry.refCount === 0) {
      this._send({ type: 'unsubscribe', roomId });
      this.rooms.delete(roomId);
      if (this.rooms.size === 0) {
        this.disconnect();
      }
    }
  }

  sendSignal(roomId, signal) {
    if (!roomId || !signal) return;
    this._send({
      type: 'signal',
      roomId,
      signal,
      sender: this.currentUser,
    });
  }

  onSignal(roomId, cb) {
    const entry = this._ensureRoom(roomId);
    entry.signalListeners.add(cb);
    return () => entry.signalListeners.delete(cb);
  }

  async sendMessage({ roomId, text, id }, sender) {
    if (!roomId || !text) return null;
    const msgId = id || `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const payload = {
      type: 'chat',
      roomId,
      id: msgId,
      text,
      sender: sender || this.currentUser || { name: 'Participant' },
      ts: new Date().toISOString(),
    };

    this._send(payload);
    return { id: msgId, text };
  }

  async pushIdeState({ roomId, code, language, cursor, seq = 0 }) {
    if (!roomId) return null;
    const entry = this.rooms.get(roomId);
    if (entry) {
      entry.ideState = {
        code: code ?? entry.ideState.code,
        language: language ?? entry.ideState.language,
        cursor: cursor !== undefined ? cursor : entry.ideState.cursor,
      };
    }

    this._send({
      type: 'ide',
      roomId,
      code,
      language,
      cursor,
      seq,
      ts: new Date().toISOString(),
    });
    return true;
  }

  onMessage(roomId, cb) {
    const entry = this._ensureRoom(roomId);
    entry.messageListeners.add(cb);
    return () => entry.messageListeners.delete(cb);
  }

  onIdeState(roomId, cb) {
    const entry = this._ensureRoom(roomId);
    entry.ideListeners.add(cb);
    cb(entry.ideState, { isRemote: false, seq: 0 });
    return () => entry.ideListeners.delete(cb);
  }

  onPresence(roomId, cb) {
    const entry = this._ensureRoom(roomId);
    entry.presenceListeners.add(cb);
    cb(entry.presence);
    return () => entry.presenceListeners.delete(cb);
  }

  onAccessDenied(roomId, cb) {
    const entry = this._ensureRoom(roomId);
    entry.accessListeners.add(cb);
    return () => entry.accessListeners.delete(cb);
  }

  getPresence(roomId) {
    const entry = this.rooms.get(roomId);
    return entry?.presence || [];
  }

  isOnline(roomId, userId) {
    const presence = this.getPresence(roomId);
    return presence.some((p) => String(p.id) === String(userId));
  }

  isRoleOnline(roomId, role) {
    const presence = this.getPresence(roomId);
    return presence.some((p) => p.role === role);
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {
        // ignore
      }
      this.ws = null;
    }
    this._setStatus('idle');
  }
}

// Global singleton instance
let defaultWsService = null;

export function getWsRealtimeService(options) {
  if (!defaultWsService) {
    defaultWsService = new WsRealtimeService(options);
  }
  return defaultWsService;
}

