import express from 'express';
import rateLimit from 'express-rate-limit';
import { requireAuth } from '../middleware/auth.js';
import { query } from '../db.js';
import { config } from '../config.js';
import { signConnectionToken } from '../lib/centrifugo.js';

const router = express.Router();

export const DEFAULT_TTL_SECONDS = 600; // 10 minutes

const tokenRateLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  message: { error: 'Too many realtime token requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Method guard: enforce POST-only on token endpoint.
 */
router.all('/token', (req, res, next) => {
  if (req.method !== 'POST') {
    res.set('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  next();
});

/**
 * POST /api/realtime/token
 * Generate a short-lived Centrifugo connection token for the authenticated user.
 */
router.post('/token', tokenRateLimiter, requireAuth, (req, res, next) => {
  try {
    // User ID comes ONLY from the authenticated session
    const userId = req.user.id;

    // Minimal non-sensitive profile payload only
    const info = {
      name: req.user.name,
      avatar: req.user.avatar || null,
      role: req.user.role === 'learner' ? 'student' : req.user.role,
    };

    const token = signConnectionToken({
      userId,
      info,
      ttlSeconds: DEFAULT_TTL_SECONDS,
    });

    const expiresAt = Math.floor(Date.now() / 1000) + DEFAULT_TTL_SECONDS;

    res.set('Cache-Control', 'no-store');
    return res.json({
      token,
      expiresAt,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/realtime/proxy/subscribe
 * Centrifugo Subscribe Proxy endpoint: checks channel authorization against PostgreSQL.
 *
 * Payload from Centrifugo:
 * { "client": "...", "transport": "...", "protocol": "...", "user": "<userId>", "channel": "tutoring-room:<roomId>" }
 */
router.post('/proxy/subscribe', async (req, res, next) => {
  try {
    // 1. Verify proxy authenticity via pre-shared secret
    const incomingSecret =
      req.headers['x-centrifugo-proxy-secret'] ||
      (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);

    const configuredSecret = config.centrifugoProxySecret || config.centrifugoSecret;
    if (configuredSecret && incomingSecret !== configuredSecret) {
      return res.status(403).json({
        error: { code: 103, message: 'Invalid proxy secret' },
      });
    }

    const { user: userId, channel = '' } = req.body ?? {};

    if (!userId || !channel) {
      return res.json({
        error: { code: 103, message: 'Missing user or channel in subscribe request' },
      });
    }

    // 2. Deny by default: match channel pattern
    const match = channel.match(/^tutoring-room:(.+)$/);
    if (!match) {
      return res.json({
        error: { code: 103, message: 'Permission denied: unauthorized channel namespace' },
      });
    }

    const roomId = match[1].trim();

    // 3. Query PostgreSQL sessions table for membership
    const { rows: [session] } = await query(
      `SELECT s.id, s.session_code, s.tutor_id, s.learner_id, s.status
         FROM sessions s
        WHERE (s.id::text = $1 OR s.session_code = $1)`,
      [roomId],
    );

    if (!session) {
      return res.json({
        error: { code: 104, message: 'Room not found' },
      });
    }

    // 4. Verify session is currently active
    if (session.status !== 'upcoming' && session.status !== 'in-progress') {
      return res.json({
        error: { code: 103, message: `Session is ${session.status} and not active` },
      });
    }

    // 5. Query user role to check superadmin supervisor status if not direct participant
    const isLearner = String(userId) === String(session.learner_id);
    const isTutor = String(userId) === String(session.tutor_id);

    if (!isLearner && !isTutor) {
      const { rows: [userRecord] } = await query(
        `SELECT role FROM users WHERE id::text = $1`,
        [String(userId)],
      );

      if (userRecord?.role !== 'superadmin') {
        return res.json({
          error: { code: 103, message: 'Permission denied: user is not assigned to this tutoring room' },
        });
      }
    }

    // 6. Authorized: return empty result object to accept subscription
    return res.json({
      result: {},
    });
  } catch (err) {
    next(err);
  }
});

export default router;
