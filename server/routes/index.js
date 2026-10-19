import { Router } from 'express';
import authRoutes from './auth.js';

const router = Router();

router.use('/auth', authRoutes);
// Future: /referrals, /subjects, /referrals/:id, etc.

export default router;
