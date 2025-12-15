import { Request, Response } from 'express';
import { dailyRewardService } from '../services/dailyRewardService';

export const checkDailyReward = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const rewardStatus = await dailyRewardService.checkReward(userId);
        res.json(rewardStatus);
    } catch (error: any) {
        console.error('Check daily reward error:', error);
        res.status(500).json({ error: error.message || 'Failed to check reward' });
    }
};

export const claimDailyReward = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const result = await dailyRewardService.claimReward(userId);
        res.json(result);
    } catch (error: any) {
        console.error('Claim daily reward error:', error);
        res.status(400).json({ error: error.message || 'Failed to claim reward' });
    }
};

export const getDailyRewardHistory = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const history = await dailyRewardService.getRewardHistory(userId);
        res.json(history);
    } catch (error: any) {
        console.error('Get reward history error:', error);
        res.status(500).json({ error: error.message || 'Failed to get history' });
    }
};
