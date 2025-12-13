import { Router } from 'express';
import { createGame, joinGame, getGameModes, getGlobalStats } from '../controllers/gameController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Public routes (or authenticated if you prefer, but often public in lobbies)
router.get('/modes', getGameModes);
router.get('/stats', getGlobalStats);
router.post('/create', createGame); // Public - anyone can create a game

// Protected routes
router.post('/join', authMiddleware, joinGame);

export default router;
