
import { Router } from 'express';
import { login, register, telegramLogin, getReferralStats } from '../controllers/authController';

const router = Router();

router.post('/login', login);
router.post('/register', register);
router.post('/telegram', telegramLogin);
router.get('/referrals/stats', getReferralStats);

export default router;
