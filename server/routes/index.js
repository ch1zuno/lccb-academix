import { Router } from 'express';
import authRoutes from './auth.js';
import referralRoutes from './referrals.js';
import matchingRoutes from './matching.js';
import sessionRoutes from './sessions.js';
import wrapUpRoutes from './wrapup.js';
import rewardsRoutes from './rewards.js';
import accreditationRoutes from './accreditation.js';

const router = Router();

router.use('/auth', authRoutes);
// referrals.js registers full /referrals/... paths itself — mount WITHOUT a prefix
router.use(referralRoutes);
// sessions.js registers /sessions/... and /device/... — no prefix needed
router.use(sessionRoutes);
// wrap-up endpoints registered on /sessions/:id/wrap-up — no prefix needed
router.use(wrapUpRoutes);
// rewards catalog/wallet/redemption — no prefix needed
router.use(rewardsRoutes);
// accreditation: apply, exam (answers stay server-side), superadmin approve/reject
router.use(accreditationRoutes);
// matching.js registers /tutors, /subjects, /session-requests — no prefix needed
router.use(matchingRoutes);

export default router;
