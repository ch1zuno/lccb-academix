import { config } from '../config.js';

let wsBroadcaster = null;

// In-memory presence overlap tracker per sessionId:
// { roles: Map<role, Set<userId>>, bothPresentSince: number|null, totalBothMs: number, sawAnyPresence: boolean }
const presenceByRoom = new Map();

export function registerWsBroadcaster(fn) {
  wsBroadcaster = typeof fn === 'function' ? fn : null;
}

/**
 * Update presence snapshot for a room (called by ws-realtime on subscribe/unsubscribe/close).
 * Accumulates simultaneous tutor + student overlap seconds.
 */
export function recordRoomPresence(roomId, presenceList = []) {
  if (!roomId) return;
  const now = Date.now();
  let state = presenceByRoom.get(roomId);
  if (!state) {
    state = { bothPresentSince: null, totalBothMs: 0, sawAnyPresence: false };
    presenceByRoom.set(roomId, state);
  }
  if (presenceList.length > 0) state.sawAnyPresence = true;

  const hasTutor = presenceList.some((p) => p.role === 'tutor' || p.role === 'faculty');
  const hasStudent = presenceList.some((p) => p.role === 'student' || p.role === 'learner');
  const bothNow = hasTutor && hasStudent;

  if (bothNow && state.bothPresentSince == null) {
    state.bothPresentSince = now;
  } else if (!bothNow && state.bothPresentSince != null) {
    state.totalBothMs += Math.max(0, now - state.bothPresentSince);
    state.bothPresentSince = null;
  }
}

export function getRoomPresenceStats(roomId) {
  const state = presenceByRoom.get(roomId);
  if (!state) return { sawAnyPresence: false, bothPresentSeconds: 0 };
  const liveMs = state.bothPresentSince != null ? Math.max(0, Date.now() - state.bothPresentSince) : 0;
  return {
    sawAnyPresence: state.sawAnyPresence,
    bothPresentSeconds: Math.round((state.totalBothMs + liveMs) / 1000),
  };
}

export function clearRoomPresence(roomId) {
  if (roomId) presenceByRoom.delete(roomId);
}

/**
 * Publish a server-originated event to a tutoring room via both the in-process
 * WebSocket server and Centrifugo HTTP API (when configured).
 * Best-effort: never throws into the caller's HTTP transaction.
 */
export async function publishRoomEvent(roomKeys, event) {
  const keys = (Array.isArray(roomKeys) ? roomKeys : [roomKeys])
    .map((k) => String(k || '').trim())
    .filter(Boolean);
  if (keys.length === 0 || !event?.type) return;

  const envelope = {
    v: 1,
    ts: new Date().toISOString(),
    ...event,
  };

  // 1. In-process WebSocket rooms
  if (wsBroadcaster) {
    for (const key of keys) {
      try {
        wsBroadcaster(key, envelope);
      } catch {
        // ignore single socket errors
      }
    }
  }

  // 2. Centrifugo v6 Server HTTP API (optional when CENTRIFUGO_API_URL + KEY set)
  if (config.centrifugoApiUrl && config.centrifugoApiKey) {
    const endpoint = `${config.centrifugoApiUrl.replace(/\/+$/, '')}/api/publish`;
    await Promise.allSettled(
      keys.map((key) =>
        fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': config.centrifugoApiKey,
          },
          body: JSON.stringify({
            channel: `tutoring-room:${key}`,
            data: envelope,
          }),
          signal: AbortSignal.timeout(3000),
        }),
      ),
    );
  }
}
