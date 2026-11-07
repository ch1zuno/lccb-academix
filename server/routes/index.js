import { Router } from 'express';
import authRoutes from './auth.js';
import referralRoutes from './referrals.js';
import matchingRoutes from './matching.js';
import sessionRoutes from './sessions.js';
import wrapUpRoutes from './wrapup.js';
import rewardsRoutes from './rewards.js';
import accreditationRoutes from './accreditation.js';
import analyticsRoutes from './analytics.js';
import notificationRoutes from './notifications.js';
import auditRoutes from './audit.js';
import publicRoutes from './public.js';
import chatRoutes from './chat.js';
import aiRoutes from './ai.js';
import realtimeRoutes from './realtime.js';
import videoRoutes from './video.js';

const router = Router();

// Anonymous landing-page numbers. Mount before the authenticated routes.
router.use(publicRoutes);
router.use('/auth', authRoutes);
// referrals.js registers full /referrals/... paths itself — mount WITHOUT a prefix
router.use(referralRoutes);
// sessions.js registers /sessions/... and /device/... — no prefix needed
router.use(sessionRoutes);
// Session chat messaging & history
router.use(chatRoutes);
// Antigravity AI assistant hooks (real-time hints & lesson wrap-up synthesis)
router.use(aiRoutes);
// Centrifugo real-time token & subscribe proxy authorization
router.use('/realtime', realtimeRoutes);
// Jitsi Meet video room authorization & room name derivation
router.use('/video', videoRoutes);
// wrap-up endpoints registered on /sessions/:id/wrap-up — no prefix needed
router.use(wrapUpRoutes);
// rewards catalog/wallet/redemption — no prefix needed
router.use(rewardsRoutes);
// accreditation: apply, exam (answers stay server-side), superadmin approve/reject
router.use(accreditationRoutes);
// matching.js registers /tutors, /subjects, /session-requests — no prefix needed
router.use(matchingRoutes);
// superadmin analytics aggregates
router.use(analyticsRoutes);
// user notifications (list + mark all read)
router.use(notificationRoutes);
// append-only audit trail (superadmin read-only)
router.use(auditRoutes);

export default router;
