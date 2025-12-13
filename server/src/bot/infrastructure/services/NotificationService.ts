import { Telegraf } from 'telegraf';

/**
 * Notification Service
 * Sends push notifications to users
 */
export class NotificationService {
    constructor(private bot: Telegraf) { }

    /**
     * Send notification to single user
     */
    async notifyUser(userId: number, message: string): Promise<void> {
        try {
            await this.bot.telegram.sendMessage(userId, message, { parse_mode: 'Markdown' });
            console.log(`✅ Notification sent to ${userId}`);
        } catch (error) {
            console.error(`Failed to notify user ${userId}:`, error);
        }
    }

    /**
     * Send notification to multiple users
     */
    async notifyUsers(userIds: number[], message: string): Promise<void> {
        await Promise.all(userIds.map(id => this.notifyUser(id, message)));
    }

    /**
     * Game starting soon notification
     */
    async notifyGameStarting(userIds: number[], minutesUntilStart: number): Promise<void> {
        const message = `🎮 *Game Starting Soon!*\n\nYour game starts in ${minutesUntilStart} minute${minutesUntilStart !== 1 ? 's' : ''}!\n\nGet ready! 🔥`;
        await this.notifyUsers(userIds, message);
    }

    /**
     * Winner announcement
     */
    async notifyWinner(winnerId: number, amount: number): Promise<void> {
        const message = `🎉 *CONGRATULATIONS!* 🎉\n\nYou WON!\n\n💰 Prize: ${amount} Birr\n\nWell played! 🏆`;
        await this.notifyUser(winnerId, message);
    }

    /**
     * Daily reward reminder
     */
    async notifyDailyRewardAvailable(userId: number): Promise<void> {
        const message = `🎁 *Daily Reward Available!*\n\nYour daily reward is ready to claim!\n\nSend /daily to get your bonus! 💰`;
        await this.notifyUser(userId, message);
    }

    /**
     * New game available
     */
    async notifyNewGame(userIds: number[], gameMode: string, entryFee: number): Promise<void> {
        const message = `🎮 *New Game Created!*\n\nMode: ${gameMode}\nEntry: ${entryFee} Birr\n\nJoin now! Send /play`;
        await this.notifyUsers(userIds, message);
    }
}

// Will be initialized with bot instance
export let notificationService: NotificationService;

export function initializeNotificationService(bot: Telegraf) {
    notificationService = new NotificationService(bot);
}
