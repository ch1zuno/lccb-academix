import { Router } from 'express';
import authRoutes from './auth.js';
import referralRoutes from './referrals.js';

const router = Router();

router.use('/auth', authRoutes);
// referrals.js registers full /referrals/... paths itself — mount WITHOUT a prefix
router.use(referralRoutes);

export default router;
