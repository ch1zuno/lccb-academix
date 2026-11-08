/** 1:1 text messaging between a learner and a tutor who share a booking. */
import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { httpError } from '../middleware/errors.js';
import { audit, requestIp } from '../lib/audit.js';

const router = express.Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_BODY = 1000;
const MAX_PER_MINUTE = 30;
const CONVERSATION_ROLES = new Set(['learner', 'tutor']);

function peerIdOf(req) {
  const id = String(req.params.userId ?? '');
  if (!UUID_RE.test(id)) throw httpError(400, 'Invalid user id');
  return id;
}

async function loadPeer(peerId) {
  const { rows } = await query(
    `SELECT u.id, u.custom_id, u.name, u.role, u.avatar, u.program,
            EXISTS(SELECT 1 FROM user_avatars ua WHERE ua.user_id = u.id) AS has_avatar
       FROM users u WHERE u.id = $1`, [peerId]);
  if (!rows[0]) return null;
  const p = rows[0];
  return {
    ...p,
    avatar: p.has_avatar ? `/api/users/${p.id}/avatar` : p.avatar,
  };
}

/* A pair may chat when they are a learner/tutor pair AND share a pending or
 * accepted request / non-cancelled session. Existing messages keep the thread
 * readable even if the booking later ages out. */
async function assertCanChat(me, peerId) {
  if (me.id === peerId) throw httpError(400, 'You cannot message yourself');
  if (!CONVERSATION_ROLES.has(me.role)) {
    throw httpError(403, 'Messaging is only available to learners and tutors');
  }
  const peer = await loadPeer(peerId);
  if (!peer) throw httpError(404, 'User not found');
  if (!CONVERSATION_ROLES.has(peer.role) || peer.role === me.role) {
    throw httpError(403, 'Messaging is only available between a learner and a tutor');
  }
  const { rows } = await query(
    `SELECT 1 FROM session_requests
      WHERE status IN ('pending', 'accepted')
        AND ((learner_id = $1 AND tutor_id = $2) OR (learner_id = $2 AND tutor_id = $1))
     UNION ALL
     SELECT 1 FROM sessions
      WHERE status IN ('upcoming', 'in-progress', 'completed')
        AND ((learner_id = $1 AND tutor_id = $2) OR (learner_id = $2 AND tutor_id = $1))
     UNION ALL
     SELECT 1 FROM messages
      WHERE (sender_id = $1 AND recipient_id = $2) OR (sender_id = $2 AND recipient_id = $1)
     LIMIT 1`, [me.id, peerId]);
  if (!rows[0]) throw httpError(403, 'You can only message someone you have a booking with');
  return peer;
}

/** GET /conversations — inbox: one row per learner/tutor pair, last message, unread. */
router.get('/conversations', requireAuth, async (req, res, next) => {
  try {
    if (!CONVERSATION_ROLES.has(req.user.role)) {
      throw httpError(403, 'Messaging is only available to learners and tutors');
    }
    const { rows } = await query(
      `WITH pairs AS (
         SELECT DISTINCT CASE WHEN sr.learner_id = $1 THEN sr.tutor_id ELSE sr.learner_id END AS other_id
           FROM session_requests sr
          WHERE sr.status IN ('pending', 'accepted')
            AND (sr.learner_id = $1 OR sr.tutor_id = $1)
         UNION
         SELECT DISTINCT CASE WHEN s.learner_id = $1 THEN s.tutor_id ELSE s.learner_id END
           FROM sessions s
          WHERE s.status IN ('upcoming', 'in-progress', 'completed')
            AND (s.learner_id = $1 OR s.tutor_id = $1)
         UNION
         SELECT DISTINCT CASE WHEN m.sender_id = $1 THEN m.recipient_id ELSE m.sender_id END
           FROM messages m
          WHERE m.sender_id = $1 OR m.recipient_id = $1
       )
       SELECT p.other_id, u.name, u.role, u.custom_id, u.program,
              CASE WHEN EXISTS(SELECT 1 FROM user_avatars ua WHERE ua.user_id = u.id)
                   THEN '/api/users/' || u.id || '/avatar'
                   ELSE u.avatar
              END AS avatar,
              lm.body AS last_body, lm.created_at AS last_at,
              (lm.sender_id = $1) AS last_from_me,
              COALESCE(unread.count, 0)::int AS unread
         FROM pairs p
         JOIN users u ON u.id = p.other_id
         LEFT JOIN LATERAL (
           SELECT body, created_at, sender_id
             FROM messages
            WHERE (sender_id = $1 AND recipient_id = p.other_id)
               OR (sender_id = p.other_id AND recipient_id = $1)
            ORDER BY created_at DESC, id DESC
            LIMIT 1
         ) lm ON true
         LEFT JOIN LATERAL (
           SELECT count(*)::int AS count
             FROM messages
            WHERE sender_id = p.other_id AND recipient_id = $1 AND read_at IS NULL
         ) unread ON true
        ORDER BY COALESCE(lm.created_at, 'epoch'::timestamptz) DESC, u.name`,
      [req.user.id]);
    res.json({ conversations: rows });
  } catch (e) { next(e); }
});

/** GET /messages/unread — badge count for the workspace nav. */
router.get('/messages/unread', requireAuth, async (req, res, next) => {
  try {
    if (!CONVERSATION_ROLES.has(req.user.role)) return res.json({ unread: 0 });
    const { rows } = await query(
      `SELECT count(*)::int AS unread FROM messages
        WHERE recipient_id = $1 AND read_at IS NULL`, [req.user.id]);
    res.json({ unread: rows[0]?.unread ?? 0 });
  } catch (e) { next(e); }
});

/** GET /conversations/:userId/messages — thread, oldest first. */
router.get('/conversations/:userId/messages', requireAuth, async (req, res, next) => {
  try {
    const peerId = peerIdOf(req);
    const peer = await assertCanChat(req.user, peerId);
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 100));
    const { rows } = await query(
      `SELECT id, sender_id, recipient_id, body, read_at, created_at
         FROM messages
        WHERE (sender_id = $1 AND recipient_id = $2)
           OR (sender_id = $2 AND recipient_id = $1)
        ORDER BY created_at DESC, id DESC
        LIMIT $3`, [req.user.id, peerId, limit]);
    res.json({ user: peer, messages: rows.reverse() });
  } catch (e) { next(e); }
});

/** POST /conversations/:userId/messages { body } — send a message. */
router.post('/conversations/:userId/messages', requireAuth, async (req, res, next) => {
  try {
    const peerId = peerIdOf(req);
    const text = String(req.body?.body ?? '').trim();
    if (!text) throw httpError(400, 'Message cannot be empty');
    if (text.length > MAX_BODY) throw httpError(400, `Message must be ${MAX_BODY} characters or fewer`);
    const peer = await assertCanChat(req.user, peerId);

    const { rows: recent } = await query(
      `SELECT count(*)::int AS n FROM messages
        WHERE sender_id = $1 AND created_at > now() - interval '1 minute'`, [req.user.id]);
    if ((recent[0]?.n ?? 0) >= MAX_PER_MINUTE) {
      throw httpError(429, 'Too many messages in a minute — take a short pause');
    }

    const { rows: prior } = await query(
      `SELECT count(*)::int AS n FROM messages
        WHERE (sender_id = $1 AND recipient_id = $2)
           OR (sender_id = $2 AND recipient_id = $1)`, [req.user.id, peerId]);

    const { rows } = await query(
      `INSERT INTO messages (sender_id, recipient_id, body)
       VALUES ($1, $2, $3)
       RETURNING id, sender_id, recipient_id, body, read_at, created_at`,
      [req.user.id, peerId, text]);

    // One notification opens the conversation; later messages rely on the
    // in-app unread badge so the notification feed does not turn into a log.
    if ((prior[0]?.n ?? 0) === 0) {
      await query(
        `INSERT INTO notifications (user_id, title, message, type)
         VALUES ($1, 'New message', $2, 'info')`,
        [peerId, `${req.user.name} started a conversation with you`]).catch(() => {});
    }

    await audit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'message.send',
      entity: 'message',
      entityId: rows[0].id,
      detail: { recipientId: peerId, length: text.length },
      ip: requestIp(req),
    });
    res.status(201).json({ message: rows[0], peer });
  } catch (e) { next(e); }
});

/** POST /conversations/:userId/read — mark everything the peer sent as read. */
router.post('/conversations/:userId/read', requireAuth, async (req, res, next) => {
  try {
    const peerId = peerIdOf(req);
    if (!CONVERSATION_ROLES.has(req.user.role)) {
      throw httpError(403, 'Messaging is only available to learners and tutors');
    }
    const { rows } = await query(
      `UPDATE messages SET read_at = now()
        WHERE sender_id = $1 AND recipient_id = $2 AND read_at IS NULL
        RETURNING id`, [peerId, req.user.id]);
    res.json({ read: rows.length });
  } catch (e) { next(e); }
});

export default router;
