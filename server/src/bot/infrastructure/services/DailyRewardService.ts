import { db } from '../../../firebase';

/**
 * Daily Reward Service
 * Handles daily login bonuses with streak tracking
 */
export class DailyRewardService {
    private readonly REWARD_TIERS = [10, 20, 30, 50, 70, 85, 100]; // Days 1-7
    private readonly COLLECTION = 'dailyRewards';

    /**
     * Check if user can claim daily reward
     */
    async canClaim(telegramId: number): Promise<boolean> {
        try {
            const rewardData = await this.getRewardData(telegramId);

            if (!rewardData.lastClaimDate) {
                return true; // First time claim
            }

            const now = new Date();
            const lastClaim = new Date(rewardData.lastClaimDate);
            const hoursSinceLastClaim = (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60);

            return hoursSinceLastClaim >= 24;
        } catch (error) {
            console.error('Error checking claim eligibility:', error);
            return false;
        }
    }

    /**
     * Claim daily reward
     */
    async claimReward(telegramId: number): Promise<{
        success: boolean;
        amount: number;
        streakDays: number;
        nextReward: number;
        message: string;
    }> {
        try {
            if (!(await this.canClaim(telegramId))) {
                const timeUntilNext = await this.getTimeUntilNextClaim(telegramId);
                return {
                    success: false,
                    amount: 0,
                    streakDays: 0,
                    nextReward: 0,
                    message: `You can claim again in ${timeUntilNext}`
                };
            }

            const rewardData = await this.getRewardData(telegramId);
            const newStreakDays = this.calculateNewStreak(rewardData);
            const rewardAmount = this.getRewardForDay(newStreakDays);

            // Update Firebase
            await this.updateRewardData(telegramId, {
                lastClaimDate: new Date().toISOString(),
                streakDays: newStreakDays,
                totalClaimed: (rewardData.totalClaimed || 0) + rewardAmount,
                claimHistory: [
                    ...(rewardData.claimHistory || []),
                    {
                        date: new Date().toISOString(),
                        amount: rewardAmount,
                        streakDay: newStreakDays
                    }
                ]
            });

            const nextReward = newStreakDays === 7
                ? this.REWARD_TIERS[0] // Reset to day 1 reward
                : this.REWARD_TIERS[newStreakDays]; // Next day reward

            return {
                success: true,
                amount: rewardAmount,
                streakDays: newStreakDays,
                nextReward,
                message: `Claimed ${rewardAmount} Birr! Day ${newStreakDays} of your streak! 🔥`
            };
        } catch (error) {
            console.error('Error claiming reward:', error);
            return {
                success: false,
                amount: 0,
                streakDays: 0,
                nextReward: 0,
                message: 'Failed to claim reward. Please try again.'
            };
        }
    }

    /**
     * Get current streak info
     */
    async getStreakInfo(telegramId: number): Promise<{
        streakDays: number;
        totalClaimed: number;
        canClaim: boolean;
        nextReward: number;
        timeUntilNext: string;
    }> {
        const rewardData = await this.getRewardData(telegramId);
        const canClaim = await this.canClaim(telegramId);
        const currentStreak = rewardData.streakDays || 0;
        const nextDay = currentStreak === 7 ? 1 : currentStreak + 1;

        return {
            streakDays: currentStreak,
            totalClaimed: rewardData.totalClaimed || 0,
            canClaim,
            nextReward: this.getRewardForDay(nextDay),
            timeUntilNext: await this.getTimeUntilNextClaim(telegramId)
        };
    }

    // Private helper methods

    private async getRewardData(telegramId: number): Promise<any> {
        if (!db) {
            return {}; // Fallback if Firebase not available
        }

        try {
            const doc = await db.collection(this.COLLECTION).doc(telegramId.toString()).get();
            return doc.exists ? doc.data() : {};
        } catch (error) {
            console.error('Error fetching reward data:', error);
            return {};
        }
    }

    private async updateRewardData(telegramId: number, data: any): Promise<void> {
        if (!db) return;

        try {
            await db.collection(this.COLLECTION).doc(telegramId.toString()).set(data, { merge: true });
        } catch (error) {
            console.error('Error updating reward data:', error);
            throw error;
        }
    }

    private calculateNewStreak(rewardData: any): number {
        if (!rewardData.lastClaimDate) {
            return 1; // First claim
        }

        const now = new Date();
        const lastClaim = new Date(rewardData.lastClaimDate);
        const hoursSinceLastClaim = (now.getTime() - lastClaim.getTime()) / (1000 * 60 * 60);

        // If claimed within 24-48 hours, continue streak
        if (hoursSinceLastClaim >= 24 && hoursSinceLastClaim < 48) {
            const currentStreak = rewardData.streakDays || 1;
            return currentStreak === 7 ? 1 : currentStreak + 1; // Reset after day 7
        }

        // If more than 48 hours, reset streak
        return 1;
    }

    private getRewardForDay(day: number): number {
        return this.REWARD_TIERS[day - 1] || this.REWARD_TIERS[0];
    }

    private async getTimeUntilNextClaim(telegramId: number): Promise<string> {
        const rewardData = await this.getRewardData(telegramId);

        if (!rewardData.lastClaimDate) {
            return 'Available now!';
        }

        const now = new Date();
        const lastClaim = new Date(rewardData.lastClaimDate);
        const nextClaimTime = new Date(lastClaim.getTime() + 24 * 60 * 60 * 1000);
        const msUntilNext = nextClaimTime.getTime() - now.getTime();

        if (msUntilNext <= 0) {
            return 'Available now!';
        }

        const hours = Math.floor(msUntilNext / (1000 * 60 * 60));
        const minutes = Math.floor((msUntilNext % (1000 * 60 * 60)) / (1000 * 60));

        return `${hours}h ${minutes}m`;
    }
}

// Export singleton instance
export const dailyRewardService = new DailyRewardService();
