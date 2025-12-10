import express from 'express';
import { initializeDeposit, handlePaymentCallback, getTransactionHistory } from '../controllers/paymentController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Initialize deposit (temporarily public for testing)
// TODO: Add proper authentication after testing
router.post('/deposit', initializeDeposit);

// Payment callback (public - called by Chapa)
router.get('/callback', handlePaymentCallback);

// Get transaction history (protected)
router.get('/history', authenticateToken, getTransactionHistory);

export default router;
