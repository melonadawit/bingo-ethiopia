import { db } from '../../../firebase';
import { userService } from '../../../services/userService';

/**
 * Referral Service
 * Handles friend referrals with reward distribution
 */
export class ReferralService {
    private readonly REFERRER_REWARD = 50; // Birr for referring user
    private readonly REFEREE_REWARD = 25; // Birr for new user
    private readonly COLLECTION = 'referrals';

    /**
     * Generate unique referral code for user
     */
    generateReferralCode(telegramId: number): string {
        return `REF${telegramId}`;
    }

    /**
     * Get referral data for user
     */
    async getReferralData(telegramId: number): Promise<{
        referralCode: string;
        referredBy: number | null;
        referredUsers: number[];
        totalEarnings: number;
        referralCount: number;
    }> {
        try {
            if (!db) {
                return this.getDefaultData(telegramId);
            }

            const doc = await db.collection(this.COLLECTION).doc(telegramId.toString()).get();

            if (doc.exists) {
                return doc.data() as any;
            }

            // Create initial record
            const initialData = this.getDefaultData(telegramId);
            await db.collection(this.COLLECTION).doc(telegramId.toString()).set(initialData);
            return initialData;
        } catch (error) {
            console.error('Error getting referral data:', error);
            return this.getDefaultData(telegramId);
        }
    }

    /**
     * Register a referral relationship
     */
    async registerReferral(
        referrerId: number,
        newUserId: number
    ): Promise<{
        success: boolean;
        message: string;
        referrerReward: number;
        refereeReward: number;
    }> {
        try {
            // Validate: user can't refer themselves
            if (referrerId === newUserId) {
                return {
                    success: false,
                    message: 'Cannot refer yourself',
                    referrerReward: 0,
                    refereeReward: 0
                };
            }

            // Check if new user already has a referrer
            const newUserData = await this.getReferralData(newUserId);
            if (newUserData.referredBy) {
                return {
                    success: false,
                    message: 'User already referred by someone else',
                    referrerReward: 0,
                    refereeReward: 0
                };
            }

            // Update referee's data (set referredBy)
            await this.updateReferralData(newUserId, {
                referredBy: referrerId
            });

            // Update referrer's data (add to referredUsers array)
            const referrerData = await this.getReferralData(referrerId);
            await this.updateReferralData(referrerId, {
                referredUsers: [...referrerData.referredUsers, newUserId],
                referralCount: referrerData.referralCount + 1,
                totalEarnings: referrerData.totalEarnings + this.REFERRER_REWARD
            });

            // Credit both users
            await userService.updateBalance(referrerId, this.REFERRER_REWARD);
            await userService.updateBalance(newUserId, this.REFEREE_REWARD);

            console.log(`✅ Referral registered: ${referrerId} → ${newUserId}`);

            return {
                success: true,
                message: 'Referral registered successfully',
                referrerReward: this.REFERRER_REWARD,
                refereeReward: this.REFEREE_REWARD
            };
        } catch (error) {
            console.error('Error registering referral:', error);
            return {
                success: false,
                message: 'Failed to register referral',
                referrerReward: 0,
                refereeReward: 0
            };
        }
    }

    /**
     * Get referral statistics
     */
    async getReferralStats(telegramId: number): Promise<{
        totalReferrals: number;
        totalEarnings: number;
        referralCode: string;
        referralLink: string;
    }> {
        const data = await this.getReferralData(telegramId);
        const botUsername = process.env.BOT_USERNAME || 'BingoEthiopiaBot';

        return {
            totalReferrals: data.referralCount,
            totalEarnings: data.totalEarnings,
            referralCode: data.referralCode,
            referralLink: `https://t.me/${botUsername}?start=${data.referralCode}`
        };
    }

    // Private helper methods

    private getDefaultData(telegramId: number) {
        return {
            referralCode: this.generateReferralCode(telegramId),
            referredBy: null,
            referredUsers: [],
            totalEarnings: 0,
            referralCount: 0
        };
    }

    private async updateReferralData(telegramId: number, data: any): Promise<void> {
        if (!db) return;

        try {
            await db.collection(this.COLLECTION).doc(telegramId.toString()).set(data, { merge: true });
        } catch (error) {
            console.error('Error updating referral data:', error);
            throw error;
        }
    }
}

// Export singleton instance
export const referralService = new ReferralService();
