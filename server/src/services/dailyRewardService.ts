import { db } from '../firebase';

interface RewardStatus {
    available: boolean;
    day?: number;
    amount?: number;
    streak?: number;
    nextReward?: number;
    alreadyClaimed?: boolean;
}

interface ClaimResult {
    success: boolean;
    amount: number;
    newBalance: number;
    streak: number;
    day: number;
}

export class DailyRewardService {
    private rewardSchedule = [10, 15, 20, 25, 30, 40, 100];

    /**
     * Check if user has a daily reward available
     */
    async checkReward(userId: string): Promise<RewardStatus> {
        if (!db) {
            throw new Error('Database not available');
        }

        const rewardRef = db.collection('users').doc(userId)
            .collection('daily_rewards').doc('current');

        const rewardDoc = await rewardRef.get();
        const today = this.getTodayDate();

        // First time user
        if (!rewardDoc.exists) {
            return {
                available: true,
                day: 1,
                amount: this.rewardSchedule[0],
                streak: 0,
                nextReward: this.rewardSchedule[1]
            };
        }

        const data = rewardDoc.data();
        const lastLoginDate = data?.lastLoginDate;

        // Already claimed today
        if (lastLoginDate === today) {
            return {
                available: false,
                alreadyClaimed: true,
                streak: data?.currentStreak || 0
            };
        }

        // Check if streak continues
        const yesterday = this.getYesterdayDate();
        const streakContinues = lastLoginDate === yesterday;
        const currentStreak = streakContinues ? (data?.currentStreak || 0) : 0;
        const day = (currentStreak % 7) + 1;

        return {
            available: true,
            day,
            amount: this.rewardSchedule[day - 1],
            streak: currentStreak + 1,
            nextReward: this.rewardSchedule[day % 7]
        };
    }

    /**
     * Claim daily reward and add to wallet
     */
    async claimReward(userId: string): Promise<ClaimResult> {
        if (!db) {
            throw new Error('Database not available');
        }

        const rewardInfo = await this.checkReward(userId);

        if (!rewardInfo.available) {
            throw new Error('No reward available today');
        }

        const amount = rewardInfo.amount!;
        const streak = rewardInfo.streak!;
        const day = rewardInfo.day!;

        // Add to wallet
        const newBalance = await this.addToWallet(userId, amount);

        // Update reward data
        const rewardRef = db.collection('users').doc(userId)
            .collection('daily_rewards').doc('current');

        const rewardDoc = await rewardRef.get();
        const existingData = rewardDoc.data();

        await rewardRef.set({
            lastLoginDate: this.getTodayDate(),
            currentStreak: streak,
            longestStreak: Math.max(streak, existingData?.longestStreak || 0),
            totalRewardsClaimed: (existingData?.totalRewardsClaimed || 0) + amount,
            lastClaimTimestamp: Date.now()
        });

        return {
            success: true,
            amount,
            newBalance,
            streak,
            day
        };
    }

    /**
     * Get reward claim history
     */
    async getRewardHistory(userId: string) {
        if (!db) {
            throw new Error('Database not available');
        }

        const rewardRef = db.collection('users').doc(userId)
            .collection('daily_rewards').doc('current');

        const rewardDoc = await rewardRef.get();

        if (!rewardDoc.exists) {
            return {
                currentStreak: 0,
                longestStreak: 0,
                totalClaimed: 0,
                recentClaims: []
            };
        }

        const data = rewardDoc.data();

        return {
            currentStreak: data?.currentStreak || 0,
            longestStreak: data?.longestStreak || 0,
            totalClaimed: data?.totalRewardsClaimed || 0,
            lastClaimDate: data?.lastLoginDate
        };
    }

    /**
     * Add amount to user's wallet
     */
    private async addToWallet(userId: string, amount: number): Promise<number> {
        if (!db) {
            throw new Error('Database not available');
        }

        const userRef = db.collection('users').doc(userId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            throw new Error('User not found');
        }

        const currentBalance = userDoc.data()?.balance || 0;
        const newBalance = currentBalance + amount;

        await userRef.update({
            balance: newBalance,
            updatedAt: new Date().toISOString()
        });

        // Log transaction
        await db.collection('transactions').add({
            userId,
            type: 'daily_reward',
            amount,
            balanceBefore: currentBalance,
            balanceAfter: newBalance,
            timestamp: new Date().toISOString(),
            description: `Daily login reward - Day ${((await this.checkReward(userId)).day)}`
        });

        return newBalance;
    }

    /**
     * Get today's date in YYYY-MM-DD format
     */
    private getTodayDate(): string {
        const now = new Date();
        return now.toISOString().split('T')[0];
    }

    /**
     * Get yesterday's date in YYYY-MM-DD format
     */
    private getYesterdayDate(): string {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return yesterday.toISOString().split('T')[0];
    }
}

export const dailyRewardService = new DailyRewardService();
