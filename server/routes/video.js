import express from 'express';
import crypto from 'node:crypto';
import { requireAuth } from '../middleware/auth.js';
import { config } from '../config.js';
import { verifyRoomMembership } from '../lib/room-membership.js';

const router = express.Router();

/**
 * Derive deterministic, unguessable Jitsi room name from roomId and server secret.
 * Format: 'tutoring-' + 32 hex chars.
 *
 * @param {string} sessionId UUID or canonical identifier of the session
 * @param {string} secret Server secret
 * @returns {string} Safe room name string
 */
export function deriveJitsiRoomName(sessionId, secret = config.jitsiRoomSecret) {
  const hmac = crypto
    .createHmac('sha256', secret)
    .update(String(sessionId))
    .digest('hex')
    .slice(0, 32)
    .toLowerCase();

  return `tutoring-${hmac}`;
}

/**
 * GET /api/video/room?roomId=...
 * Authenticated endpoint: returns the deterministic video room name for authorized session members.
 */
router.get('/room', requireAuth, async (req, res, next) => {
  try {
    const roomId = req.query.roomId;
    if (!roomId || typeof roomId !== 'string' || !roomId.trim()) {
      return res.status(400).json({ error: 'Missing or invalid roomId parameter' });
    }

    const check = await verifyRoomMembership(roomId.trim(), req.user.id);
    if (!check.authorized) {
      const status = check.code === 104 ? 404 : 403;
      return res.status(status).json({
        error: check.message || 'Access denied to video room',
      });
    }

    // Always use canonical session.id to ensure tutor and learner get identical room names
    // regardless of whether they joined via UUID or human-readable session_code
    const roomName = deriveJitsiRoomName(check.session.id);

    res.set('Cache-Control', 'no-store');
    return res.json({
      roomName,
      domain: config.jitsiDomain,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
