import { Request, Response } from 'express';
import chapaService from '../services/chapaService';
import { db } from '../firebase';

/**
 * Initialize a deposit payment
 */
export const initializeDeposit = async (req: Request, res: Response) => {
    try {
        const { amount } = req.body;
        const userId = (req as any).user?.id || 'test-user';

        if (!amount || amount < 10) {
            return res.status(400).json({ error: 'Minimum deposit is 10 Birr' });
        }

        const txRef = chapaService.generateTxRef();

        // Initialize Chapa payment
        const payment = await chapaService.initializePayment({
            amount,
            currency: 'ETB',
            email: 'test@bingo.et',
            first_name: 'Test',
            last_name: 'User',
            tx_ref: txRef,
            callback_url: `${process.env.API_URL || 'https://bingo-ethiopia-api.onrender.com'}/api/payment/callback`,
            return_url: `${process.env.FRONTEND_URL || 'https://bingo-ethiopia.vercel.app'}/wallet?payment=success`,
            customization: {
                title: 'Bingo Deposit',
                description: `Deposit ${amount} Birr`,
            },
        });

        // Store pending transaction (skip if Firebase not configured)
        // Store pending transaction (skip if Firebase not configured)
        if (db) {
            try {
                await db.collection('transactions').doc(txRef).set({
                    userId,
                    type: 'deposit',
                    amount,
                    status: 'pending',
                    txRef,
                    createdAt: new Date(),
                });
            } catch (dbError) {
                console.warn('Firebase storage failed:', dbError);
            }
        } else {
            console.warn('Firebase not configured - transaction not stored persistence');
        }

        res.json({
            success: true,
            checkout_url: payment.data.checkout_url,
            tx_ref: txRef,
        });
    } catch (error: any) {
        console.error('Deposit initialization error:', error);
        res.status(500).json({ error: error.message || 'Failed to initialize deposit' });
    }
};

/**
 * Handle Chapa payment callback
 */
export const handlePaymentCallback = async (req: Request, res: Response) => {
    try {
        if (!db) {
            console.error('Database not initialized - cannot handle payment callback');
            return res.status(503).json({ error: 'Service Unavailable - Database not connected' });
        }

        const { tx_ref } = req.query;

        if (!tx_ref) {
            return res.status(400).json({ error: 'Transaction reference is required' });
        }

        // Verify payment with Chapa
        const verification = await chapaService.verifyPayment(tx_ref as string);

        if (verification.data.status === 'success') {
            // Get transaction
            const txDoc = await db.collection('transactions').doc(tx_ref as string).get();
            const transaction = txDoc.data();

            if (!transaction) {
                return res.status(404).json({ error: 'Transaction not found' });
            }

            // Update user balance
            const userRef = db.collection('users').doc(transaction.userId);
            await userRef.update({
                balance: (await userRef.get()).data()?.balance + transaction.amount,
            });

            // Update transaction status
            await db.collection('transactions').doc(tx_ref as string).update({
                status: 'completed',
                completedAt: new Date(),
                chapaData: verification.data,
            });

            res.json({
                success: true,
                message: 'Payment successful',
                amount: transaction.amount,
            });
        } else {
            // Update transaction status to failed
            await db.collection('transactions').doc(tx_ref as string).update({
                status: 'failed',
                failedAt: new Date(),
            });

            res.status(400).json({
                success: false,
                message: 'Payment failed',
            });
        }
    } catch (error: any) {
        console.error('Payment callback error:', error);
        res.status(500).json({ error: error.message || 'Payment verification failed' });
    }
};

/**
 * Get user transaction history
 */
export const getTransactionHistory = async (req: Request, res: Response) => {
    try {
        if (!db) {
            return res.json({ transactions: [] }); // Return empty if no DB
        }
        const userId = (req as any).user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const transactions = await db
            .collection('transactions')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();

        const history = transactions.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));

        res.json({ transactions: history });
    } catch (error: any) {
        console.error('Get transaction history error:', error);
        res.status(500).json({ error: 'Failed to fetch transaction history' });
    }
};
