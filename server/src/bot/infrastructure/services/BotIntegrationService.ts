import { userService, UserData } from '../../../services/userService';
import chapaService from '../../../services/chapaService';

/**
 * Bot User Service - Connects bot commands to real user data
 * Integrates with existing userService from Firebase
 */
export class BotUserService {
    /**
     * Get or create user by Telegram ID
     */
    async getUserByTelegramId(telegramId: number, telegramData?: {
        username?: string;
        firstName?: string;
        lastName?: string;
    }): Promise<UserData | null> {
        try {
            // Try to get existing user
            let user = await userService.getUser(telegramId);

            // If user doesn't exist and we have telegram data, register them
            if (!user && telegramData) {
                user = await this.registerNewUser(telegramId, telegramData);
            }

            return user;
        } catch (error) {
            console.error('Error getting user:', error);
            return null;
        }
    }

    /**
     * Register new user from Telegram
     */
    private async registerNewUser(
        telegramId: number,
        data: {
            username?: string;
            firstName?: string;
            lastName?: string;
        }
    ): Promise<UserData> {
        // Create user with Telegram data
        // Note: Phone number will be added later via authentication flow
        const newUser = await userService.registerUser({
            telegramId,
            phoneNumber: `telegram_${telegramId}`, // Temporary, will be updated
            firstName: data.firstName || 'User',
            lastName: data.lastName,
            username: data.username
        });

        console.log(`✅ Registered new user via bot: ${telegramId}`);
        return newUser;
    }

    /**
     * Get user's balance
     */
    async getBalance(telegramId: number): Promise<number> {
        const user = await this.getUserByTelegramId(telegramId);
        return user?.balance || 0;
    }

    /**
     * Update user's balance
     */
    async updateBalance(telegramId: number, amount: number): Promise<number> {
        return await userService.updateBalance(telegramId, amount);
    }

    /**
     * Check if user is registered
     */
    async isRegistered(telegramId: number): Promise<boolean> {
        return await userService.isRegistered(telegramId);
    }

    /**
     * Get user stats (games played, wins, etc.)
     */
    async getUserStats(telegramId: number): Promise<{
        gamesPlayed: number;
        wins: number;
        totalEarnings: number;
        winRate: number;
    }> {
        // TODO: Implement when game history is available
        // For now, return placeholder
        return {
            gamesPlayed: 0,
            wins: 0,
            totalEarnings: 0,
            winRate: 0
        };
    }
}

/**
 * Bot Payment Service - Handles deposits and withdrawals
 */
export class BotPaymentService {
    /**
     * Create deposit payment link
     */
    async createDepositLink(
        telegramId: number,
        amount: number,
        userData: {
            email?: string;
            firstName: string;
            lastName?: string;
        }
    ): Promise<string> {
        try {
            const txRef = chapaService.generateTxRef();

            const payment = await chapaService.initializePayment({
                amount,
                currency: 'ETB',
                email: userData.email || `user${telegramId}@bingo-ethiopia.com`,
                first_name: userData.firstName,
                last_name: userData.lastName || 'User',
                tx_ref: txRef,
                callback_url: `${process.env.WEB_APP_URL}/api/payment/callback`,
                return_url: `${process.env.WEB_APP_URL}/wallet`,
                customization: {
                    title: 'Bingo Ethiopia Deposit',
                    description: `Add ${amount} Birr to wallet`
                }
            });

            return payment.data.checkout_url;
        } catch (error) {
            console.error('Error creating deposit link:', error);
            throw new Error('Failed to create payment link');
        }
    }

    /**
     * Verify payment
     */
    async verifyPayment(txRef: string): Promise<boolean> {
        try {
            const result = await chapaService.verifyPayment(txRef);
            return result.data.status === 'success';
        } catch (error) {
            console.error('Error verifying payment:', error);
            return false;
        }
    }
}

// Export singleton instances
export const botUserService = new BotUserService();
export const botPaymentService = new BotPaymentService();
