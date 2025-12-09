import { Request, Response } from 'express';

// Mock DB for wallets
const wallets: Record<string, number> = {};

export const getBalance = async (req: Request, res: Response) => {
    // In a real app, use req.user.id from auth middleware
    // For now, we simulate a user ID or accept it in body/query for dev
    const userId = (req as any).user?.id || req.query.userId || 'dev_user';
    const balance = wallets[userId] || 0;

    res.json({ balance, currency: 'ETB' });
};

export const deposit = async (req: Request, res: Response) => {
    const userId = (req as any).user?.id || 'dev_user';
    const { amount } = req.body;

    if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Invalid amount' });
    }

    wallets[userId] = (wallets[userId] || 0) + Number(amount);

    res.json({
        message: 'Deposit successful',
        newBalance: wallets[userId],
        txId: `tx_${Date.now()}`
    });
};

export const withdraw = async (req: Request, res: Response) => {
    const userId = (req as any).user?.id || 'dev_user';
    const { amount } = req.body;

    const currentBalance = wallets[userId] || 0;
    if (currentBalance < amount) {
        return res.status(400).json({ error: 'Insufficient funds' });
    }

    wallets[userId] = currentBalance - Number(amount);

    res.json({
        message: 'Withdrawal successful',
        newBalance: wallets[userId],
        txId: `tx_${Date.now()}`
    });
};
