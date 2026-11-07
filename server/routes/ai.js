import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { httpError } from '../middleware/errors.js';
import { generateTutoringHint, generateWrapUpSynthesis } from '../lib/aiAssistant.js';

const router = express.Router();

/**
 * POST /sessions/:id/ai/hint
 * Student or tutor prompts the Antigravity AI assistant for a real-time Socratic hint.
 */
router.post('/sessions/:id/ai/hint', requireAuth, async (req, res, next) => {
  try {
    const sessionId = req.params.id;
    const { queryText = '' } = req.body ?? {};

    const { rows: [session] } = await query(
      `SELECT s.id, s.session_code, s.topic, s.status, s.tutor_id, s.learner_id,
              sub.name AS subject_name, sub.code AS subject_code
         FROM sessions s
         JOIN subjects sub ON sub.id = s.subject_id
        WHERE s.id = $1`,
      [sessionId],
    );
    if (!session) throw httpError(404, 'Session not found');

    const isLearner = req.user.id === session.learner_id;
    const isTutor = req.user.id === session.tutor_id;
    const isAdmin = req.user.role === 'superadmin';
    if (!isLearner && !isTutor && !isAdmin) {
      throw httpError(403, 'You are not a participant in this session');
    }

    // Fetch recent transcript
    const { rows: transcript } = await query(
      `SELECT sender_role, sender_name, content, created_at
         FROM session_messages
        WHERE session_id = $1
        ORDER BY created_at ASC
        LIMIT 25`,
      [sessionId],
    );

    const hintText = await generateTutoringHint({
      session,
      transcript,
      studentQuery: String(queryText).trim(),
    });

    // Persist the AI response into the chat ledger
    const { rows: [aiMessage] } = await query(
      `INSERT INTO session_messages
         (session_id, sender_id, sender_role, sender_name, recipient_role, content, meta)
       VALUES ($1, NULL, 'ai', 'Antigravity AI', 'all', $2, $3)
       RETURNING id, session_id, sender_id, sender_role, sender_name, recipient_role, content, meta, created_at`,
      [
        sessionId,
        hintText,
        JSON.stringify({ type: 'hint', triggeredBy: req.user.name, userRole: req.user.role }),
      ],
    );

    res.status(201).json({ message: aiMessage });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /sessions/:id/ai/wrap-up-assist
 * Generates an end-of-session summary and custom quiz questions based on the chat transcript.
 */
router.post('/sessions/:id/ai/wrap-up-assist', requireAuth, async (req, res, next) => {
  try {
    const sessionId = req.params.id;

    const { rows: [session] } = await query(
      `SELECT s.id, s.session_code, s.topic, s.status, s.tutor_id, s.learner_id, s.ai_summary, s.ai_quiz,
              sub.name AS subject_name, sub.code AS subject_code
         FROM sessions s
         JOIN subjects sub ON sub.id = s.subject_id
        WHERE s.id = $1`,
      [sessionId],
    );
    if (!session) throw httpError(404, 'Session not found');

    const isLearner = req.user.id === session.learner_id;
    const isTutor = req.user.id === session.tutor_id;
    const isAdmin = req.user.role === 'superadmin';
    if (!isLearner && !isTutor && !isAdmin) {
      throw httpError(403, 'You are not a participant in this session');
    }

    // Return cached summary & quiz if already generated
    if (session.ai_summary && session.ai_quiz) {
      return res.json({
        summary: session.ai_summary,
        quiz: session.ai_quiz,
        cached: true,
      });
    }

    const { rows: transcript } = await query(
      `SELECT sender_role, sender_name, content, created_at
         FROM session_messages
        WHERE session_id = $1
        ORDER BY created_at ASC`,
      [sessionId],
    );

    const { summary, quiz } = await generateWrapUpSynthesis({ session, transcript });

    await query(
      `UPDATE sessions
          SET ai_summary = $1, ai_quiz = $2
        WHERE id = $3`,
      [summary, JSON.stringify(quiz), sessionId],
    );

    res.json({
      summary,
      quiz,
      cached: false,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

