import { useState, useEffect } from 'react';
import api from '../services/api';

interface RewardStatus {
    available: boolean;
    day?: number;
    amount?: number;
    streak?: number;
    nextReward?: number;
    alreadyClaimed?: boolean;
}

export const useDailyReward = () => {
    const [rewardStatus, setRewardStatus] = useState<RewardStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const checkReward = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/api/rewards/daily/check');
            setRewardStatus(res.data);
        } catch (err: any) {
            setError(err.message || 'Failed to check reward');
            console.error('Check reward error:', err);
        } finally {
            setLoading(false);
        }
    };

    const claimReward = async () => {
        try {
            const res = await api.post('/api/rewards/daily/claim');
            // Refresh status after claiming
            await checkReward();
            return res.data;
        } catch (err: any) {
            setError(err.message || 'Failed to claim reward');
            throw err;
        }
    };

    useEffect(() => {
        checkReward();
    }, []);

    return {
        rewardStatus,
        loading,
        error,
        checkReward,
        claimReward
    };
};
