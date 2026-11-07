/**
 * @typedef {'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error'} RealtimeStatus
 *
 * @typedef {Object} IdeCursor
 * @property {number} line
 * @property {number} column
 *
 * @typedef {Object} IdeState
 * @property {string} code
 * @property {string} language
 * @property {IdeCursor | null} [cursor]
 *
 * @typedef {Object} RealtimeChatMessage
 * @property {string} id
 * @property {string} text
 * @property {string} [senderId]
 * @property {string} [senderName]
 * @property {string} [senderRole]
 * @property {string} [senderAvatar]
 * @property {string} timestamp
 *
 * @typedef {() => void} Unsubscribe
 */

/**
 * In-memory Mock Realtime Service for development, offline testing, and fallback.
 */
export class MockRealtimeService {
  /**
   * @param {string} [sessionId]
   */
  constructor(sessionId) {
    this.sessionId = sessionId || null;
    /** @type {RealtimeStatus} */
    this.status = 'idle';
    this.accessDenied = false;
    /** @type {RealtimeChatMessage[]} */
    this.messages = [];
    /** @type {IdeState} */
    this.ideState = {
      code: '// Start collaborating on code here\n',
      language: 'javascript',
      cursor: null,
    };

    this.presenceList = [
      { id: 'mock-tutor', name: 'Accredited Tutor', role: 'tutor', online: true },
      { id: 'mock-student', name: 'Learner', role: 'student', online: true },
    ];

    /** @type {Set<(msg: RealtimeChatMessage) => void>} */
    this.messageListeners = new Set();
    /** @type {Set<(state: IdeState, meta?: Object) => void>} */
    this.ideListeners = new Set();
    /** @type {Set<(status: RealtimeStatus) => void>} */
    this.statusListeners = new Set();
    /** @type {Set<(presence: any[]) => void>} */
    this.presenceListeners = new Set();
    /** @type {Set<(denied: boolean) => void>} */
    this.accessListeners = new Set();

    this._connectTimeout = null;
    this._refCount = 0;
  }

  setCurrentUser() {}

  connect(sessionId) {
    if (sessionId) this.sessionId = sessionId;
    this._refCount += 1;

    if (this.status === 'connected') return;

    this._setStatus('connecting');
    if (this._connectTimeout) clearTimeout(this._connectTimeout);

    this._connectTimeout = setTimeout(() => {
      this._setStatus('connected');
      this._notifyPresence();
    }, 50);
  }

  disconnect() {
    this._refCount = Math.max(0, this._refCount - 1);
    if (this._refCount > 0) return;

    if (this._connectTimeout) clearTimeout(this._connectTimeout);
    this._setStatus('idle');
  }

  forceDisconnect() {
    this._refCount = 0;
    if (this._connectTimeout) clearTimeout(this._connectTimeout);
    this._setStatus('idle');
  }

  _setStatus(next) {
    this.status = next;
    for (const listener of this.statusListeners) {
      try {
        listener(next);
      } catch (err) {
        console.warn('Realtime status listener error:', err);
      }
    }
  }

  _notifyPresence() {
    for (const listener of this.presenceListeners) {
      try {
        listener(this.presenceList);
      } catch (err) {
        console.warn('Realtime presence listener error:', err);
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

  onPresence(roomIdOrCb, cb) {
    const callback = typeof roomIdOrCb === 'function' ? roomIdOrCb : cb;
    this.presenceListeners.add(callback);
    callback(this.presenceList);
    return () => {
      this.presenceListeners.delete(callback);
    };
  }

  onAccessDenied(roomIdOrCb, cb) {
    const callback = typeof roomIdOrCb === 'function' ? roomIdOrCb : cb;
    this.accessListeners.add(callback);
    callback(this.accessDenied);
    return () => {
      this.accessListeners.delete(callback);
    };
  }

  isUserOnline(roomIdOrUserId, maybeUserId) {
    const userId = maybeUserId || roomIdOrUserId;
    return this.presenceList.some((p) => p.id === userId && p.online);
  }

  isRoleOnline(roomIdOrRole, maybeRole) {
    const role = maybeRole || roomIdOrRole;
    return this.presenceList.some((p) => p.role === role && p.online);
  }

  subscribeToRoom(roomId) {
    this.connect(roomId);
    return this;
  }

  unsubscribeFromRoom() {
    this.disconnect();
  }

  async sendMessage(param1, param2) {
    let text = '';
    let sender = {};
    let msgId = `rt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    if (typeof param1 === 'object' && param1 !== null) {
      text = param1.text || '';
      msgId = param1.id || msgId;
      sender = param2 || {};
    } else {
      text = param1;
      sender = param2 || {};
    }

    const msg = {
      id: msgId,
      text,
      senderId: sender.id || 'anonymous',
      senderName: sender.name || 'Participant',
      senderRole: sender.role || 'student',
      senderAvatar: sender.avatar || null,
      timestamp: new Date().toISOString(),
    };
    this.messages.push(msg);

    setTimeout(() => {
      for (const listener of this.messageListeners) {
        try {
          listener(msg);
        } catch (err) {
          console.warn('Realtime message listener error:', err);
        }
      }
    }, 15);

    return msg;
  }

  onMessage(roomIdOrCb, cb) {
    const callback = typeof roomIdOrCb === 'function' ? roomIdOrCb : cb;
    this.messageListeners.add(callback);
    return () => {
      this.messageListeners.delete(callback);
    };
  }

  async pushIdeState(partialOrParam) {
    if (partialOrParam && typeof partialOrParam === 'object' && 'code' in partialOrParam) {
      this.ideState = {
        ...this.ideState,
        ...partialOrParam,
      };
    }

    setTimeout(() => {
      for (const listener of this.ideListeners) {
        try {
          listener(this.ideState, { isRemote: false, seq: 1 });
        } catch (err) {
          console.warn('Realtime IDE listener error:', err);
        }
      }
    }, 15);
  }

  onIdeState(roomIdOrCb, cb) {
    const callback = typeof roomIdOrCb === 'function' ? roomIdOrCb : cb;
    this.ideListeners.add(callback);
    callback(this.ideState, { isRemote: false, seq: 1 });
    return () => {
      this.ideListeners.delete(callback);
    };
  }
}

const servicesBySession = new Map();

export function getRealtimeService(sessionId = 'default') {
  if (!servicesBySession.has(sessionId)) {
    servicesBySession.set(sessionId, new MockRealtimeService(sessionId));
  }
  return servicesBySession.get(sessionId);
}
