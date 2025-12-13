import { Context } from 'telegraf';
import { BaseCommand } from './BaseCommand';
import { KeyboardBuilder } from '../../utils/KeyboardBuilder';
import { EMOJI } from '../../config/constants';
import { botUserService } from '../../infrastructure/services/BotIntegrationService';

/**
 * /start command - Welcome new users and show main menu
 * Automatically registers new users in Firebase
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
            // Get or create user in Firebase
            const userData = await botUserService.getUserByTelegramId(user.id, {
                username: user.username,
                firstName: user.first_name,
                lastName: user.last_name
            });

            const firstName = user.first_name || 'Player';
            const isNewUser = !userData || userData.registeredAt > new Date(Date.now() - 60000); // Registered in last minute

            const welcomeMessage = isNewUser
                ? this.getWelcomeMessage(firstName, userData?.balance || 0)
                : this.getReturningMessage(firstName, userData?.balance || 0);

            const keyboard = KeyboardBuilder.mainMenuKeyboard(this.webAppUrl);

            await this.sendReply(ctx, welcomeMessage, keyboard);

            // Log user activity
            console.log(`User ${user.id} (${firstName}) used /start`);
        } catch (error) {
            console.error('Error in start command:', error);
            await ctx.reply('❌ Error starting bot. Please try again.');
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
}
