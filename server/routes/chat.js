import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { httpError } from '../middleware/errors.js';

const router = express.Router();

/**
 * GET /sessions/:id/messages
 * Retrieves historical session chat messages.
 */
router.get('/sessions/:id/messages', requireAuth, async (req, res, next) => {
  try {
    const sessionId = req.params.id;
    const { rows: [session] } = await query(
      `SELECT id, tutor_id, learner_id FROM sessions WHERE id = $1`,
      [sessionId],
    );
    if (!session) throw httpError(404, 'Session not found');

    const isLearner = req.user.id === session.learner_id;
    const isTutor = req.user.id === session.tutor_id;
    const isAdmin = req.user.role === 'superadmin';
    if (!isLearner && !isTutor && !isAdmin) {
      throw httpError(403, 'You are not a participant in this session');
    }

    const { rows: messages } = await query(
      `SELECT m.id, m.session_id, m.sender_id, m.sender_role, m.sender_name,
              m.recipient_role, m.content, m.meta, m.created_at
         FROM session_messages m
        WHERE m.session_id = $1
        ORDER BY m.created_at ASC`,
      [sessionId],
    );

    res.json({ messages });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /sessions/:id/messages
 * Persists a new chat message into the database.
 */
router.post('/sessions/:id/messages', requireAuth, async (req, res, next) => {
  try {
    const sessionId = req.params.id;
    const { content, recipientRole = 'all', meta = {} } = req.body ?? {};

    if (!content || !String(content).trim()) {
      throw httpError(400, 'Message content is required');
    }

    const { rows: [session] } = await query(
      `SELECT id, tutor_id, learner_id FROM sessions WHERE id = $1`,
      [sessionId],
    );
    if (!session) throw httpError(404, 'Session not found');

    const isLearner = req.user.id === session.learner_id;
    const isTutor = req.user.id === session.tutor_id;
    const isAdmin = req.user.role === 'superadmin';
    if (!isLearner && !isTutor && !isAdmin) {
      throw httpError(403, 'You are not a participant in this session');
    }

    let senderRole = req.user.role === 'learner' ? 'student' : req.user.role === 'tutor' ? 'tutor' : 'tutor';
    let senderName = req.user.name;
    let senderId = req.user.id;

    // In demo mode, permit simulation to send as assigned peer for research presentation
    if (req.body.demoSenderRole && (req.body.demoSenderRole === 'student' || req.body.demoSenderRole === 'tutor')) {
      senderRole = req.body.demoSenderRole;
      senderName = req.body.demoSenderName || (senderRole === 'tutor' ? 'Mark Antipo (Tutor)' : 'Julian Gemelo (Learner)');
      senderId = senderRole === 'tutor' ? session.tutor_id : session.learner_id;
    }

    const cleanRecipientRole = ['all', 'tutor', 'student', 'ai'].includes(recipientRole)
      ? recipientRole
      : 'all';

    const { rows: [created] } = await query(
      `INSERT INTO session_messages
         (session_id, sender_id, sender_role, sender_name, recipient_role, content, meta)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, session_id, sender_id, sender_role, sender_name, recipient_role, content, meta, created_at`,
      [
        sessionId,
        senderId,
        senderRole,
        senderName,
        cleanRecipientRole,
        String(content).trim().slice(0, 4000),
        JSON.stringify(meta),
      ],
    );

    res.status(201).json({ message: created });
  } catch (err) {
    next(err);
  }
});

export default router;

