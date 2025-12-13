import { Context } from 'telegraf';
import { BaseCommand } from './BaseCommand';
import { KeyboardBuilder } from '../../utils/KeyboardBuilder';
import { EMOJI } from '../../config/constants';
import { botUserService } from '../../infrastructure/services/BotIntegrationService';

/**
 * /balance command - Show real user's wallet balance from Firebase
 */
export class BalanceCommand extends BaseCommand {
    readonly name = 'balance';
    readonly description = 'Check your wallet balance';

    protected async handle(ctx: Context): Promise<void> {
        const user = ctx.from;
        if (!user) return;

        try {
            // Get real user data from Firebase
            const userData = await botUserService.getUserByTelegramId(user.id, {
                username: user.username,
                firstName: user.first_name,
                lastName: user.last_name
            });

            if (!userData) {
                await ctx.reply('❌ User not found. Please use /start to register.');
                return;
            }

            // Get real stats
            const stats = await botUserService.getUserStats(user.id);
            const balance = userData.balance;

            const message = this.formatBalanceMessage(balance, stats);
            const keyboard = this.createBalanceKeyboard();

            await this.sendReply(ctx, message, keyboard);
        } catch (error) {
            console.error('Error in balance command:', error);
            await ctx.reply('❌ Error loading balance. Please try again.');
        }
    }

    private formatBalanceMessage(balance: number, stats: any): string {
        const winRate = stats.gamesPlayed > 0
            ? ((stats.wins / stats.gamesPlayed) * 100).toFixed(1)
            : '0.0';

        return `
${EMOJI.MONEY} *Your Wallet*

💵 *Balance:* ${balance} Birr

📊 *Your Stats:*
${EMOJI.WIN} Wins: ${stats.wins}/${stats.gamesPlayed} (${winRate}%)
${EMOJI.CHART} Total Earnings: ${stats.totalEarnings} Birr

${EMOJI.POINT_RIGHT} What would you like to do?
    `.trim();
    }

    private createBalanceKeyboard(): any {
        return new KeyboardBuilder()
            .addButtonRow([
                { text: '💳 Deposit', data: 'deposit_menu' },
                { text: '💸 Withdraw', data: 'withdraw_menu' },
            ])
            .addButton('📜 Transaction History', 'history')
            .addButton('🔙 Back to Menu', 'main_menu')
            .build();
    }
}
