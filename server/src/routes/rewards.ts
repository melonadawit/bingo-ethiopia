import express from 'express';
import { checkDailyReward, claimDailyReward, getDailyRewardHistory } from '../controllers/rewardController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// Daily reward routes
router.get('/daily/check', authMiddleware, checkDailyReward);
router.post('/daily/claim', authMiddleware, claimDailyReward);
router.get('/daily/history', authMiddleware, getDailyRewardHistory);

export default router;
