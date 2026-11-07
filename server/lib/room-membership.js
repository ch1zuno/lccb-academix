import { query } from '../db.js';

/**
 * Verify whether a user is an authorized participant or supervisor of a tutoring room.
 *
 * @param {string} roomId Session ID (UUID) or session code (e.g. SES-184036)
 * @param {string} userId Authenticated user ID
 * @returns {Promise<{ authorized: boolean, session?: Object, code?: number, message?: string, isSupervisor?: boolean }>}
 */
export async function verifyRoomMembership(roomId, userId) {
  if (!roomId || !userId) {
    return { authorized: false, code: 103, message: 'Missing roomId or userId' };
  }

  const { rows: [session] } = await query(
    `SELECT s.id, s.session_code, s.tutor_id, s.learner_id, s.status
       FROM sessions s
      WHERE (s.id::text = $1 OR s.session_code = $1)`,
    [String(roomId).trim()],
  );

  if (!session) {
    return { authorized: false, code: 104, message: 'Room not found' };
  }

  if (session.status !== 'upcoming' && session.status !== 'in-progress') {
    return { authorized: false, code: 103, message: `Session is ${session.status} and not active` };
  }

  const isLearner = String(userId) === String(session.learner_id);
  const isTutor = String(userId) === String(session.tutor_id);

  if (isLearner || isTutor) {
    return {
      authorized: true,
      session,
      isTutor,
      isLearner,
    };
  }

  // Check if user is superadmin (supervisor)
  const { rows: [userRecord] } = await query(
    `SELECT role FROM users WHERE id::text = $1`,
    [String(userId)],
  );

  if (userRecord?.role === 'superadmin') {
    return {
      authorized: true,
      session,
      isSupervisor: true,
    };
  }

  return {
    authorized: false,
    code: 103,
    message: 'Permission denied: user is not assigned to this tutoring room',
  };
}
