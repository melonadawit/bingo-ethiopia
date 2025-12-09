import { Router } from 'express';
import { getBalance, deposit, withdraw } from '../controllers/walletController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Allow public access for dev, or protect with authMiddleware
// router.get('/balance', authMiddleware, getBalance);
router.get('/balance', getBalance);
router.post('/deposit', deposit);
router.post('/withdraw', withdraw);

router.post('/deposit', deposit);
router.post('/withdraw', withdraw);

export default router;
