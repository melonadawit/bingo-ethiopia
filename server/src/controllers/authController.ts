import { Request, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

// In-memory user store for dev/mock
const users: any[] = [];
const SECRET_KEY = process.env.JWT_SECRET || 'dev_secret_key_123';

export const login = async (req: Request, res: Response) => {
    // Placeholder for standard login if needed
    res.status(200).json({ message: 'Login endpoint' });
};

export const register = async (req: Request, res: Response) => {
    // Placeholder for standard register if needed
    res.status(200).json({ message: 'Register endpoint' });
};

export const telegramLogin = async (req: Request, res: Response) => {
    try {
        const { initData } = req.body;

        if (!process.env.BOT_TOKEN) {
            return res.status(500).json({ error: 'Server configuration error: BOT_TOKEN missing' });
        }

        // 1. Parse initData
        const urlParams = new URLSearchParams(initData);
        const hash = urlParams.get('hash');

        if (!hash) {
            return res.status(400).json({ error: 'Invalid initData: missing hash' });
        }

        urlParams.delete('hash');

        // 2. Data Check String
        const dataCheckArr = [];
        for (const [key, value] of urlParams.entries()) {
            dataCheckArr.push(`${key}=${value}`);
        }
        dataCheckArr.sort();
        const dataCheckString = dataCheckArr.join('\n');

        // 3. Verify Hash (HMAC-SHA256)
        const secretKey = crypto.createHmac('sha256', 'WebAppData').update(process.env.BOT_TOKEN).digest();
        const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

        if (computedHash !== hash) {
            return res.status(401).json({ error: 'Data integrity check failed' });
        }

        // 4. Data is valid, parse user info
        const userStr = urlParams.get('user');
        if (!userStr) {
            return res.status(400).json({ error: 'No user data found' });
        }
        const telegramUser = JSON.parse(userStr);

        // 5. Find or Create User (Mock In-Memory)
        let user = users.find(u => u.telegramId === telegramUser.id);
        if (!user) {
            user = {
                id: `u_${Date.now()}`,
                telegramId: telegramUser.id,
                username: telegramUser.username,
                firstName: telegramUser.first_name,
                balance: 100 // Starting bonus
            };
            users.push(user);
        }

        // 6. Generate Token
        const token = jwt.sign({ id: user.id, telegramId: user.telegramId }, SECRET_KEY, { expiresIn: '24h' });

        res.json({ token, user });

    } catch (error) {
        console.error('Telegram Login Error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
