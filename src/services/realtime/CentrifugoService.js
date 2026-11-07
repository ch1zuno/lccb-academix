import { Centrifuge, UnauthorizedError } from 'centrifuge';
import { z } from 'zod';

export const ChatEnvelopeSchema = z.object({
  v: z.literal(1),
  type: z.literal('chat'),
  id: z.string().min(1),
  text: z.string().min(1),
  ts: z.string(),
});

export const IdeEnvelopeSchema = z.object({
  v: z.literal(1),
  type: z.literal('ide'),
  seq: z.number().int(),
  code: z.string(),
  language: z.string().default('javascript'),
  cursor: z
    .object({
      line: z.number().int(),
      column: z.number().int(),
    })
    .nullable()
    .optional(),
  ts: z.string(),
});

/**
 * Determine default WebSocket URL for Centrifugo.
 * Respects VITE_CENTRIFUGO_WS_URL, falls back to local / current origin.
 */
function getDefaultTokenEndpoint() {
  if (typeof window !== 'undefined' && window.location) {
    return '/api/realtime/token';
  }
  return 'http://localhost:4000/api/realtime/token';
}

function getDefaultWsUrl() {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_CENTRIFUGO_WS_URL) {
    return import.meta.env.VITE_CENTRIFUGO_WS_URL;
  }
  if (typeof window !== 'undefined' && window.location) {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // If running with Vite proxy or standard dev setup:
    return `${proto}//${window.location.hostname}:8000/connection/websocket`;
  }
  return 'ws://localhost:8000/connection/websocket';
}

/**
 * Realtime service using Centrifuge-js client.
 * Manages singleton connection, per-room subscriptions, message deduplication,
 * presence aggregation, and collaborative IDE state sync.
 */
export class CentrifugoService {
  /**
   * @param {Object} [options]
   * @param {string} [options.wsUrl]
   * @param {string} [options.tokenEndpoint]
   * @param {() => Promise<string>} [options.getToken]
   * @param {string} [options.currentUserId]
   */
  constructor(options = {}) {
    this.wsUrl = options.wsUrl || getDefaultWsUrl();
    this.tokenEndpoint = options.tokenEndpoint || getDefaultTokenEndpoint();
    this.customGetToken = options.getToken || null;
    this.currentUserId = options.currentUserId || null;

    /** @type {'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error'} */
    this.status = 'idle';
    this.hasConnectedOnce = false;

    /** @type {Set<(status: string) => void>} */
    this.statusListeners = new Set();

    /**
     * Map of roomId -> ChannelSubscriptionEntry
     * @type {Map<string, Object>}
     */
    this.roomSubscriptions = new Map();

    this.centrifuge = null;
  }

  setCurrentUser(userId) {
    this.currentUserId = userId;
  }

  /**
   * Lazily initializes and returns the Centrifuge client singleton.
   */
  getClient() {
    if (this.centrifuge) return this.centrifuge;

    this.centrifuge = new Centrifuge(this.wsUrl, {
      getToken: async () => {
        if (this.customGetToken) {
          return await this.customGetToken();
        }

        const res = await fetch(this.tokenEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });

        if (res.status === 401) {
          // Tell Centrifuge SDK to stop reconnecting loop immediately
          throw new UnauthorizedError('Unauthorized realtime access');
        }

        if (!res.ok) {
          throw new Error(`Realtime token request failed: HTTP ${res.status}`);
        }

        const data = await res.json();
        return data.token;
      },
    });

    this.centrifuge.on('connecting', () => {
      this._setStatus(this.hasConnectedOnce ? 'reconnecting' : 'connecting');
    });

    this.centrifuge.on('connected', () => {
      this.hasConnectedOnce = true;
      this._setStatus('connected');
    });

    this.centrifuge.on('disconnected', (ctx) => {
      // If server or client disconnected cleanly
      if (ctx.code === 1000 || ctx.code === 3000) {
        this._setStatus('idle');
      } else {
        this._setStatus('reconnecting');
      }
    });

    this.centrifuge.on('error', (err) => {
      console.warn('[CentrifugoService] client error:', err);
      this._setStatus('error');
    });

    return this.centrifuge;
  }

  /**
   * Connect client to Centrifugo gateway.
   */
  connect() {
    const client = this.getClient();
    if (client.state === 'disconnected') {
      client.connect();
    }
  }

  /**
   * Disconnect client cleanly.
   */
  disconnect() {
    if (!this.centrifuge) return;
    for (const [roomId] of this.roomSubscriptions) {
      this._teardownRoom(roomId, true);
    }
    this.centrifuge.disconnect();
    this._setStatus('idle');
  }

  _setStatus(next) {
    if (this.status === next) return;
    this.status = next;
    for (const listener of this.statusListeners) {
      try {
        listener(next);
      } catch (err) {
        console.warn('Realtime status listener error:', err);
      }
    }
  }

  onStatusChange(cb) {
    this.statusListeners.add(cb);
    cb(this.status);
    return () => {
      this.statusListeners.delete(cb);
    };
  }

  /**
   * Subscribe to a room channel `tutoring-room:{roomId}` with ref-counting.
   * Safe for React 19 StrictMode double-mounting.
   *
   * @param {string} roomId
   * @returns {Object} Room entry controller
   */
  subscribeToRoom(roomId) {
    if (!roomId) throw new Error('roomId is required to subscribe');

    this.connect();
    const channelName = `tutoring-room:${roomId}`;
    let entry = this.roomSubscriptions.get(roomId);

    if (entry) {
      entry.refCount += 1;
      return entry;
    }

    const client = this.getClient();
    let sub = client.getSubscription(channelName);
    if (!sub) {
      sub = client.newSubscription(channelName, {
        joinLeave: true,
      });
    }

    entry = {
      roomId,
      channelName,
      sub,
      refCount: 1,
      accessDenied: false,
      messages: [],
      seenMessageIds: new Set(),
      ideSeq: 0,
      lastReceivedSeq: 0,
      ideState: {
        code: '// Start collaborating on code here\n',
        language: 'javascript',
        cursor: null,
      },
      presenceMap: new Map(), // userId -> { id, name, avatar, role, online: true, connections: number }
      messageListeners: new Set(),
      ideListeners: new Set(),
      presenceListeners: new Set(),
      accessListeners: new Set(),
    };

    // Publication listener (Chat & IDE messages)
    sub.on('publication', (ctx) => {
      this._handlePublication(entry, ctx);
    });

    // Subscribed event -> initial presence query
    sub.on('subscribed', async () => {
      entry.accessDenied = false;
      this._notifyAccess(entry, false);
      try {
        const pres = await sub.presence();
        this._aggregatePresence(entry, pres.clients || {});
      } catch (err) {
        // Presence might be empty or not ready yet
      }
    });

    // Join / Leave presence updates
    sub.on('join', (ctx) => {
      this._handleJoin(entry, ctx);
    });

    sub.on('leave', (ctx) => {
      this._handleLeave(entry, ctx);
    });

    // Subscription error (e.g. 103 Access Denied from Proxy)
    sub.on('error', (ctx) => {
      if (ctx.code === 103) {
        entry.accessDenied = true;
        this._notifyAccess(entry, true);
      }
    });

    sub.subscribe();
    this.roomSubscriptions.set(roomId, entry);
    return entry;
  }

  /**
   * Release subscription reference. Teardown if refCount hits 0.
   * @param {string} roomId
   */
  unsubscribeFromRoom(roomId) {
    const entry = this.roomSubscriptions.get(roomId);
    if (!entry) return;

    entry.refCount -= 1;
    if (entry.refCount <= 0) {
      this._teardownRoom(roomId, false);
    }
  }

  _teardownRoom(roomId, force = false) {
    const entry = this.roomSubscriptions.get(roomId);
    if (!entry) return;

    try {
      entry.sub.unsubscribe();
      if (this.centrifuge) {
        this.centrifuge.removeSubscription(entry.sub);
      }
    } catch (err) {
      console.warn('[CentrifugoService] Teardown error:', err);
    }

    entry.messageListeners.clear();
    entry.ideListeners.clear();
    entry.presenceListeners.clear();
    entry.accessListeners.clear();
    this.roomSubscriptions.delete(roomId);
  }

  _notifyAccess(entry, denied) {
    for (const listener of entry.accessListeners) {
      try {
        listener(denied);
      } catch (err) {
        console.warn('Access listener error:', err);
      }
    }
  }

  _handlePublication(entry, ctx) {
    const payload = ctx.data;
    if (!payload || typeof payload !== 'object') return;

    // Extract sender metadata strictly from server-verified ctx.info
    const senderId = ctx.info?.user || 'anonymous';
    const connInfo = ctx.info?.connInfo || {};
    const senderName = connInfo.name || connInfo.user_name || 'Participant';
    const senderRole = connInfo.role || 'student';
    const senderAvatar = connInfo.avatar || null;

    if (payload.type === 'chat') {
      const parsed = ChatEnvelopeSchema.safeParse(payload);
      if (!parsed.success) {
        console.warn('[CentrifugoService] Invalid chat envelope discarded:', parsed.error);
        return;
      }
      const data = parsed.data;

      // Deduplicate by message id
      if (entry.seenMessageIds.has(data.id)) return;
      entry.seenMessageIds.add(data.id);
      if (entry.seenMessageIds.size > 500) {
        const first = entry.seenMessageIds.values().next().value;
        entry.seenMessageIds.delete(first);
      }

      const msg = {
        id: data.id,
        text: data.text,
        senderId,
        senderName,
        senderRole,
        senderAvatar,
        timestamp: data.ts,
      };

      entry.messages.push(msg);

      for (const listener of entry.messageListeners) {
        try {
          listener(msg);
        } catch (err) {
          console.warn('Realtime message listener error:', err);
        }
      }
    } else if (payload.type === 'ide') {
      const parsed = IdeEnvelopeSchema.safeParse(payload);
      if (!parsed.success) {
        console.warn('[CentrifugoService] Invalid IDE envelope discarded:', parsed.error);
        return;
      }
      const data = parsed.data;

      // Echo suppression: ignore if broadcast by current local user
      const isRemote = senderId !== this.currentUserId;
      if (data.seq <= entry.lastReceivedSeq && isRemote) {
        // Discard stale sequence packet
        return;
      }

      if (isRemote) {
        entry.lastReceivedSeq = data.seq;
      }

      entry.ideState = {
        code: data.code,
        language: data.language || 'javascript',
        cursor: data.cursor || null,
      };

      for (const listener of entry.ideListeners) {
        try {
          listener(entry.ideState, {
            isRemote,
            senderId,
            senderName,
            seq: data.seq,
          });
        } catch (err) {
          console.warn('Realtime IDE listener error:', err);
        }
      }
    }
  }

  _aggregatePresence(entry, clients) {
    entry.presenceMap.clear();
    for (const [clientId, info] of Object.entries(clients || {})) {
      const uid = info.user || clientId;
      const connInfo = info.connInfo || {};
      if (!entry.presenceMap.has(uid)) {
        entry.presenceMap.set(uid, {
          id: uid,
          name: connInfo.name || connInfo.user_name || 'Participant',
          avatar: connInfo.avatar || null,
          role: connInfo.role || 'student',
          online: true,
          connections: 1,
        });
      } else {
        entry.presenceMap.get(uid).connections += 1;
      }
    }
    this._notifyPresence(entry);
  }

  _handleJoin(entry, ctx) {
    const info = ctx.info || {};
    const uid = info.user || ctx.client;
    const connInfo = info.connInfo || {};

    if (!entry.presenceMap.has(uid)) {
      entry.presenceMap.set(uid, {
        id: uid,
        name: connInfo.name || connInfo.user_name || 'Participant',
        avatar: connInfo.avatar || null,
        role: connInfo.role || 'student',
        online: true,
        connections: 1,
      });
    } else {
      entry.presenceMap.get(uid).connections += 1;
    }
    this._notifyPresence(entry);
  }

  _handleLeave(entry, ctx) {
    const info = ctx.info || {};
    const uid = info.user || ctx.client;

    if (entry.presenceMap.has(uid)) {
      const userPres = entry.presenceMap.get(uid);
      userPres.connections -= 1;
      if (userPres.connections <= 0) {
        entry.presenceMap.delete(uid);
      }
    }
    this._notifyPresence(entry);
  }

  _notifyPresence(entry) {
    const presenceList = Array.from(entry.presenceMap.values());
    for (const listener of entry.presenceListeners) {
      try {
        listener(presenceList);
      } catch (err) {
        console.warn('Presence listener error:', err);
      }
    }
  }

  // --- Public room communication methods ---

  /**
   * Broadcast a chat message to the room channel.
   * @param {Object} params
   * @param {string} params.roomId
   * @param {string} params.text
   * @param {string} [params.id]
   */
  async sendMessage({ roomId, text, id }) {
    const entry = this.subscribeToRoom(roomId);
    const msgId = id || `rt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const envelope = {
      v: 1,
      type: 'chat',
      id: msgId,
      text,
      ts: new Date().toISOString(),
    };

    try {
      await entry.sub.publish(envelope);
    } catch (err) {
      console.warn('[CentrifugoService] sendMessage publish error:', err);
      throw err;
    }

    return {
      id: msgId,
      text,
      timestamp: envelope.ts,
    };
  }

  /**
   * Broadcast collaborative IDE state to the room channel.
   * @param {Object} params
   * @param {string} params.roomId
   * @param {string} params.code
   * @param {string} [params.language]
   * @param {Object} [params.cursor]
   */
  async pushIdeState({ roomId, code, language = 'javascript', cursor = null }) {
    const entry = this.subscribeToRoom(roomId);
    entry.ideSeq += 1;
    const seq = entry.ideSeq;

    const envelope = {
      v: 1,
      type: 'ide',
      seq,
      code,
      language,
      cursor,
      ts: new Date().toISOString(),
    };

    entry.ideState = { code, language, cursor };

    try {
      await entry.sub.publish(envelope);
    } catch (err) {
      console.warn('[CentrifugoService] pushIdeState publish error:', err);
      throw err;
    }
  }

  /**
   * Listen for chat messages in a room.
   */
  onMessage(roomId, cb) {
    const entry = this.subscribeToRoom(roomId);
    entry.messageListeners.add(cb);
    return () => {
      entry.messageListeners.delete(cb);
    };
  }

  /**
   * Listen for collaborative IDE state in a room.
   */
  onIdeState(roomId, cb) {
    const entry = this.subscribeToRoom(roomId);
    entry.ideListeners.add(cb);
    // Send current initial state
    cb(entry.ideState, { isRemote: false, seq: entry.ideSeq });
    return () => {
      entry.ideListeners.delete(cb);
    };
  }

  /**
   * Listen for presence changes in a room.
   */
  onPresence(roomId, cb) {
    const entry = this.subscribeToRoom(roomId);
    entry.presenceListeners.add(cb);
    cb(Array.from(entry.presenceMap.values()));
    return () => {
      entry.presenceListeners.delete(cb);
    };
  }

  /**
   * Listen for access denied status in a room (e.g. proxy authorization failure).
   */
  onAccessDenied(roomId, cb) {
    const entry = this.subscribeToRoom(roomId);
    entry.accessListeners.add(cb);
    cb(entry.accessDenied);
    return () => {
      entry.accessListeners.delete(cb);
    };
  }

  /**
   * Query presence helpers for a room.
   */
  getPresence(roomId) {
    const entry = this.roomSubscriptions.get(roomId);
    if (!entry) return [];
    return Array.from(entry.presenceMap.values());
  }

  isUserOnline(roomId, userId) {
    const entry = this.roomSubscriptions.get(roomId);
    if (!entry) return false;
    return entry.presenceMap.has(userId);
  }

  isRoleOnline(roomId, role) {
    const entry = this.roomSubscriptions.get(roomId);
    if (!entry) return false;
    return Array.from(entry.presenceMap.values()).some((u) => u.role === role);
  }
}

/**
 * Singleton instance of CentrifugoService
 */
let serviceInstance = null;

export function getCentrifugoService(options) {
  if (!serviceInstance) {
    serviceInstance = new CentrifugoService(options);
  }
  return serviceInstance;
}
