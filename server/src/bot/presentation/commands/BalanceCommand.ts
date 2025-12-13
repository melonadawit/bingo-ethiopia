import { Context } from 'telegraf';
import { BaseCommand } from './BaseCommand';
import { KeyboardBuilder } from '../../utils/KeyboardBuilder';
import { EMOJI } from '../../config/constants';

/**
 * /balance command - Show user's wallet balance
 */
export class BalanceCommand extends BaseCommand {
    readonly name = 'balance';
    readonly description = 'Check your wallet balance';

    protected async handle(ctx: Context): Promise<void> {
        const user = ctx.from;
        if (!user) return;

        // TODO: Get actual balance from database
        const balance = await this.getUserBalance(user.id);
        const stats = await this.getUserStats(user.id);

        const message = this.formatBalanceMessage(balance, stats);
        const keyboard = this.createBalanceKeyboard();

        await this.sendReply(ctx, message, keyboard);
    }

    private async getUserBalance(telegramId: number): Promise<number> {
        // TODO: Implement actual database query
        // For now, return mock data
        return 150;
    }

    private async getUserStats(telegramId: number): Promise<any> {
        // TODO: Implement actual database query
        return {
            totalWins: 12,
            totalGames: 45,
            totalEarnings: 2500,
            totalDeposits: 1000,
        };
    }

    private formatBalanceMessage(balance: number, stats: any): string {
        const winRate = stats.totalGames > 0
            ? ((stats.totalWins / stats.totalGames) * 100).toFixed(1)
            : '0.0';

        return `
${EMOJI.MONEY} *Your Wallet*

💵 *Balance:* ${balance} Birr

📊 *Your Stats:*
${EMOJI.WIN} Wins: ${stats.totalWins}/${stats.totalGames} (${winRate}%)
${EMOJI.CHART} Total Earnings: ${stats.totalEarnings} Birr
${EMOJI.MONEY} Total Deposits: ${stats.totalDeposits} Birr

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
