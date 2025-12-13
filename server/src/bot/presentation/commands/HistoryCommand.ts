import { Context } from 'telegraf';
import { BaseCommand } from './BaseCommand';
import { KeyboardBuilder } from '../../utils/KeyboardBuilder';
import { EMOJI } from '../../config/constants';
import { transactionService } from '../../infrastructure/services/TransactionService';

/**
 * /history command - View transaction history
 */
export class HistoryCommand extends BaseCommand {
    readonly name = 'history';
    readonly description = 'View your transaction history';

    protected async handle(ctx: Context): Promise<void> {
        const user = ctx.from;
        if (!user) return;

        try {
            // Get recent transactions
            const transactions = await transactionService.getUserTransactions(user.id, 10);
            const summary = await transactionService.getTransactionSummary(user.id);

            if (transactions.length === 0) {
                await ctx.reply(`
${EMOJI.CHART} *Transaction History*

No transactions yet.

Start playing games or make a deposit to see your history here!
        `.trim(), { parse_mode: 'Markdown' });
                return;
            }

            // Format transaction list
            const transactionList = transactions
                .map(t => transactionService.formatTransaction(t))
                .join('\n\n');

            const message = `
${EMOJI.CHART} *Transaction History*

*Recent Transactions:*
${transactionList}

*Summary:*
💳 Total Deposits: ${summary.totalDeposits} Birr
💸 Total Withdrawals: ${summary.totalWithdrawals} Birr
🎉 Total Winnings: ${summary.totalWinnings} Birr
🎮 Total Spent: ${summary.totalSpent} Birr

Showing last 10 transactions.
      `.trim();

            const keyboard = new KeyboardBuilder()
                .addButton('💳 Deposits Only', 'history_deposits')
                .addButton('💸 Withdrawals Only', 'history_withdrawals')
                .addButton('🎮 Game History', 'history_games')
                .addButton('🔙 Back to Menu', 'main_menu')
                .build();

            await this.sendReply(ctx, message, keyboard);
        } catch (error) {
            console.error('Error in history command:', error);
            await ctx.reply('❌ Error loading transaction history. Please try again.');
        }
    }
}
