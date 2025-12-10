import express from 'express';
import { initializeDeposit, handlePaymentCallback, getTransactionHistory } from '../controllers/paymentController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Initialize deposit (protected)
router.post('/deposit', authenticateToken, initializeDeposit);

// Payment callback (public - called by Chapa)
router.get('/callback', handlePaymentCallback);

// Get transaction history (protected)
router.get('/history', authenticateToken, getTransactionHistory);

export default router;
