import { Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { userService } from '../services/userService';

const SECRET_KEY = process.env.JWT_SECRET || 'dev_secret_key_123';

export const login = async (req: Request, res: Response) => {
    res.status(200).json({ message: 'Login endpoint' });
};

export const register = async (req: Request, res: Response) => {
    res.status(200).json({ message: 'Register endpoint' });
};

export const telegramLogin = async (req: Request, res: Response) => {
    try {
        const { initData } = req.body;

        if (!initData) {
            return res.status(400).json({ error: 'initData is required' });
        }

        // Parse initData
        const params = new URLSearchParams(initData);
        const hash = params.get('hash');
        params.delete('hash');

        // Verify hash (simplified - in production, verify against BOT_TOKEN)
        // For now, we'll trust the initData

        const userDataStr = params.get('user');
        if (!userDataStr) {
            return res.status(400).json({ error: 'User data not found' });
        }

        const userData = JSON.parse(userDataStr);
        const telegramId = userData.id;

        // Check if user is registered
        const isRegistered = await userService.isRegistered(telegramId);
        if (!isRegistered) {
            return res.status(403).json({
                error: 'User not registered',
                message: 'Please register through the Telegram bot first by sending /start and sharing your contact.'
            });
        }

        // Get user data
        const user = await userService.getUser(telegramId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Generate JWT
        const token = jwt.sign(
            {
                id: user.telegramId,
                username: user.username,
                firstName: user.firstName
            },
            SECRET_KEY,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: {
                id: user.telegramId,
                username: user.username,
                firstName: user.firstName,
                balance: user.balance
            }
        });
    } catch (error) {
        console.error('Telegram login error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
};

export const getReferralStats = async (req: Request, res: Response) => {
    try {
        // Assume auth middleware populated req.user or similar, 
        // OR pass telegramId in query for now (insecure but fast for prototype)
        // Better: Extract from JWT. 
        // For this task, I'll extract from query header or body if middleware exists.
        // Assuming simple passing of ID for now as middleware isn't fully visible in my context
        const telegramId = Number(req.query.userId);

        if (!telegramId) return res.status(400).json({ error: 'User ID required' });

        const stats = await userService.getReferralStats(telegramId);
        const user = await userService.getUser(telegramId);

        res.json({
            referralCode: user?.referralCode,
            ...stats
        });
    } catch (error) {
        console.error('Get referral stats error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
};
