/**
 * @typedef {'idle' | 'connecting' | 'connected' | 'error'} RealtimeStatus
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
 * @property {string} timestamp
 *
 * @typedef {() => void} Unsubscribe
 */

/**
 * Interface definition reference for RealtimeService.
 * Implementations should provide chat, IDE synchronization, and session lifecycle.
 */
export class MockRealtimeService {
  /**
   * @param {string} [sessionId]
   */
  constructor(sessionId) {
    this.sessionId = sessionId || null;
    /** @type {RealtimeStatus} */
    this.status = 'idle';
    /** @type {RealtimeChatMessage[]} */
    this.messages = [];
    /** @type {IdeState} */
    this.ideState = {
      code: '// Start collaborating on code here\n',
      language: 'javascript',
      cursor: null,
    };

    /** @type {Set<(msg: RealtimeChatMessage) => void>} */
    this.messageListeners = new Set();
    /** @type {Set<(state: IdeState) => void>} */
    this.ideListeners = new Set();
    /** @type {Set<(status: RealtimeStatus) => void>} */
    this.statusListeners = new Set();

    this._connectTimeout = null;
    this._refCount = 0;
  }

  /**
   * Connect to session real-time channel.
   * @param {string} [sessionId]
   */
  connect(sessionId) {
    if (sessionId) this.sessionId = sessionId;
    this._refCount += 1;

    if (this.status === 'connected') return;

    this._setStatus('connecting');
    if (this._connectTimeout) clearTimeout(this._connectTimeout);

    // Simulated async connection hand-shake
    this._connectTimeout = setTimeout(() => {
      this._setStatus('connected');
    }, 50);
  }

  /**
   * Disconnect from session real-time channel.
   */
  disconnect() {
    this._refCount = Math.max(0, this._refCount - 1);
    if (this._refCount > 0) return;

    if (this._connectTimeout) clearTimeout(this._connectTimeout);
    this._setStatus('idle');
  }

  /**
   * Force disconnect regardless of reference count.
   */
  forceDisconnect() {
    this._refCount = 0;
    if (this._connectTimeout) clearTimeout(this._connectTimeout);
    this._setStatus('idle');
  }

  /**
   * Internal status updater with subscriber notification.
   * @param {RealtimeStatus} next
   */
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

  /**
   * Subscribe to connection status changes.
   * @param {(status: RealtimeStatus) => void} cb
   * @returns {Unsubscribe}
   */
  onStatusChange(cb) {
    this.statusListeners.add(cb);
    cb(this.status);
    return () => {
      this.statusListeners.delete(cb);
    };
  }

  /**
   * Send a chat message through mock real-time channel.
   * @param {string} text
   * @param {{ id?: string, name?: string }} [sender]
   * @returns {RealtimeChatMessage}
   */
  sendMessage(text, sender = {}) {
    const msg = {
      id: `rt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      text,
      senderId: sender.id || 'anonymous',
      senderName: sender.name || 'Participant',
      timestamp: new Date().toISOString(),
    };
    this.messages.push(msg);

    // Simulated async network broadcast
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

  /**
   * Subscribe to new real-time messages.
   * @param {(msg: RealtimeChatMessage) => void} cb
   * @returns {Unsubscribe}
   */
  onMessage(cb) {
    this.messageListeners.add(cb);
    return () => {
      this.messageListeners.delete(cb);
    };
  }

  /**
   * Push collaborative IDE editor changes.
   * @param {Partial<IdeState>} partialState
   */
  pushIdeState(partialState) {
    this.ideState = {
      ...this.ideState,
      ...partialState,
    };

    setTimeout(() => {
      for (const listener of this.ideListeners) {
        try {
          listener(this.ideState);
        } catch (err) {
          console.warn('Realtime IDE listener error:', err);
        }
      }
    }, 15);
  }

  /**
   * Subscribe to IDE state updates.
   * @param {(state: IdeState) => void} cb
   * @returns {Unsubscribe}
   */
  onIdeState(cb) {
    this.ideListeners.add(cb);
    return () => {
      this.ideListeners.delete(cb);
    };
  }
}

/**
 * In-memory session registry so peers on same session share instance.
 * @type {Map<string, MockRealtimeService>}
 */
const servicesBySession = new Map();

/**
 * Access or create RealtimeService for given sessionId.
 * @param {string} sessionId
 * @returns {MockRealtimeService}
 */
export function getRealtimeService(sessionId = 'default') {
  if (!servicesBySession.has(sessionId)) {
    servicesBySession.set(sessionId, new MockRealtimeService(sessionId));
  }
  return servicesBySession.get(sessionId);
}
