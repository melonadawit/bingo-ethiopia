import { Request, Response } from 'express';
import { leaderboardService } from '../services/leaderboardService';

export const getLeaderboard = async (req: Request, res: Response) => {
    try {
        const { period } = req.params;
        const limit = parseInt(req.query.limit as string) || 10;

        if (!['daily', 'weekly', 'monthly', 'alltime'].includes(period)) {
            return res.status(400).json({ error: 'Invalid period' });
        }

        const leaderboard = await leaderboardService.getLeaderboard(
            period as any,
            limit
        );

        res.json(leaderboard);
    } catch (error: any) {
        console.error('Get leaderboard error:', error);
        res.status(500).json({ error: error.message || 'Failed to get leaderboard' });
    }
};

export const getUserStats = async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;

        const stats = await leaderboardService.getUserStats(userId);
        res.json(stats);
    } catch (error: any) {
        console.error('Get user stats error:', error);
        res.status(500).json({ error: error.message || 'Failed to get user stats' });
    }
};

export const getUserRank = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const { period } = req.params;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!['daily', 'weekly', 'monthly', 'alltime'].includes(period)) {
            return res.status(400).json({ error: 'Invalid period' });
        }

        const rank = await leaderboardService.getUserRank(userId, period as any);

        res.json({ period, rank });
    } catch (error: any) {
        console.error('Get user rank error:', error);
        res.status(500).json({ error: error.message || 'Failed to get rank' });
    }
};
