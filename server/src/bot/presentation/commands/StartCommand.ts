import { Context } from 'telegraf';
import { BaseCommand } from './BaseCommand';
import { KeyboardBuilder } from '../../utils/KeyboardBuilder';
import { EMOJI } from '../../config/constants';
import { botUserService } from '../../infrastructure/services/BotIntegrationService';
import { referralService } from '../../infrastructure/services/ReferralService';

/**
 * /start command - Welcome new users and show main menu
 * Automatically registers new users in Firebase
 * Handles referral deep links
 */
export class StartCommand extends BaseCommand {
    readonly name = 'start';
    readonly description = 'Start the bot and see main menu';

    constructor(private webAppUrl: string) {
        super();
    }

    protected async handle(ctx: Context): Promise<void> {
        const user = ctx.from;
        if (!user) return;

        try {
            // Extract referral code from deep link if present
            const startPayload = ctx.message && 'text' in ctx.message
                ? ctx.message.text.split(' ')[1]
                : undefined;

            // Get or create user in Firebase
            const userData = await botUserService.getUserByTelegramId(user.id, {
                username: user.username,
                firstName: user.first_name,
                lastName: user.last_name
            });

            if (!userData) {
                throw new Error('Failed to get or create user');
            }

            const firstName = user.first_name || 'Player';

            // Simple check: if registered today, treat as new user
            const today = new Date().toDateString();
            const registrationDate = new Date(userData.registeredAt).toDateString();
            const isNewUser = today === registrationDate;

            // Handle referral for new users
            if (isNewUser && startPayload && startPayload.startsWith('REF')) {
                await this.handleReferral(ctx, startPayload, user.id, firstName);
            }

            const welcomeMessage = isNewUser
                ? this.getWelcomeMessage(firstName, userData.balance)
                : this.getReturningMessage(firstName, userData.balance);

            const keyboard = KeyboardBuilder.mainMenuKeyboard(this.webAppUrl);

            await this.sendReply(ctx, welcomeMessage, keyboard);

            // Log user activity
            console.log(`User ${user.id} (${firstName}) used /start`);
        } catch (error) {
            console.error('Error in start command:', error);
            // More specific error message
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            console.error('StartCommand error details:', errorMsg);
            await ctx.reply('❌ Error starting bot. Please try again.');
        }
    }

    /**
     * Handle referral registration
     */
    private async handleReferral(ctx: Context, referralCode: string, newUserId: number, firstName: string): Promise<void> {
        try {
            // Extract referrer ID from code (REF123456 -> 123456)
            const referrerId = parseInt(referralCode.replace('REF', ''));

            if (isNaN(referrerId) || referrerId === newUserId) {
                return; // Invalid code or self-referral
            }

            // Register the referral
            const result = await referralService.registerReferral(referrerId, newUserId);

            if (result.success) {
                // Notify both users
                console.log(`✅ Referral: ${referrerId} referred ${newUserId}`);

                // Send notification to new user
                await ctx.telegram.sendMessage(
                    newUserId,
                    `🎁 Welcome bonus! You received ${result.refereeReward} Birr from your friend's referral!`
                ).catch(console.error);

                // Send notification to referrer
                await ctx.telegram.sendMessage(
                    referrerId,
                    `🎉 ${firstName} joined using your referral link! You earned ${result.referrerReward} Birr!`
                ).catch(console.error);
            }
        } catch (error) {
            console.error('Error handling referral:', error);
        }
    }

    private getWelcomeMessage(firstName: string, balance: number): string {
        return `
${EMOJI.CELEBRATE} *Welcome to Bingo Ethiopia, ${firstName}!* ${EMOJI.CELEBRATE}

🎮 *Play authentic Ethiopian Bingo*
💰 *Win real money*  
🎁 *Get daily rewards*
👥 *Invite friends and earn*

*How to Play:*
1️⃣ Tap "Play Game" to join
2️⃣ Choose your game mode
3️⃣ Watch the numbers
4️⃣ Shout BINGO when you win!

${EMOJI.GIFT} *Your Starting Balance:* ${balance} Birr

Tap a button below to begin:
    `.trim();
    }

    private getReturningMessage(firstName: string, balance: number): string {
        return `
${EMOJI.FIRE} *Welcome back, ${firstName}!*

💰 Your balance: ${balance} Birr

Ready to play? Choose an option below:
    `.trim();
    }

    private get bot() {
        // Access to bot instance for sending notifications
        // This will be passed through context
        return (this as any).context?.telegram || { sendMessage: () => Promise.resolve() };
    }
}
