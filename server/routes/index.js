import { Router } from 'express';
import authRoutes from './auth.js';
import referralRoutes from './referrals.js';
import matchingRoutes from './matching.js';

const router = Router();

router.use('/auth', authRoutes);
// referrals.js registers full /referrals/... paths itself — mount WITHOUT a prefix
router.use(referralRoutes);
// matching.js registers /tutors, /subjects, /session-requests — no prefix needed
router.use(matchingRoutes);

export default router;
