import { Context } from 'telegraf';
import { BaseCommand } from './BaseCommand';
import { KeyboardBuilder } from '../../utils/KeyboardBuilder';
import { EMOJI } from '../../config/constants';

/**
 * /start command - Welcome new users and show main menu
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

        const firstName = user.first_name || 'Player';
        const isNewUser = !ctx.message; // Check if user exists in your DB

        const welcomeMessage = isNewUser
            ? this.getWelcomeMessage(firstName)
            : this.getReturningMessage(firstName);

        const keyboard = KeyboardBuilder.mainMenuKeyboard(this.webAppUrl);

        await this.sendReply(ctx, welcomeMessage, keyboard);

        // Log user activity
        await this.logUserActivity(user.id);
    }

    private getWelcomeMessage(firstName: string): string {
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

${EMOJI.GIFT} *Welcome Bonus:* Get 25 Birr FREE to start!

Tap a button below to begin:
    `.trim();
    }

    private getReturningMessage(firstName: string): string {
        return `
${EMOJI.FIRE} *Welcome back, ${firstName}!*

Ready to play? Choose an option below:
    `.trim();
    }

    private async logUserActivity(telegramId: number): Promise<void> {
        try {
            // Update last active timestamp
            // This will be implemented when we connect to the database
            console.log(`User ${telegramId} used /start`);
        } catch (error) {
            console.error('Failed to log user activity:', error);
        }
    }
}
