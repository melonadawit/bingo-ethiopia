import express from 'express';
import { getLeaderboard, getUserStats, getUserRank } from '../controllers/leaderboardController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = express.Router();

// Public routes
router.get('/:period', getLeaderboard); // GET /api/leaderboard/daily
router.get('/user/:userId', getUserStats); // GET /api/leaderboard/user/123

// Protected routes
router.get('/rank/:period', authMiddleware, getUserRank); // GET /api/leaderboard/rank/daily

export default router;
