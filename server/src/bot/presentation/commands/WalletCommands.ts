import { Context } from 'telegraf';
import { BaseCommand } from './BaseCommand';
import { KeyboardBuilder } from '../../utils/KeyboardBuilder';
import { EMOJI } from '../../config/constants';
import { botUserService, botPaymentService } from '../../infrastructure/services/BotIntegrationService';

/**
 * /deposit command - Initiate deposit flow with real Chapa payment
 */
export class DepositCommand extends BaseCommand {
    readonly name = 'deposit';
    readonly description = 'Add funds to your wallet';

    protected async handle(ctx: Context): Promise<void> {
        const message = `
${EMOJI.MONEY} *Add Funds to Your Wallet*

Choose an amount or enter a custom amount:

${EMOJI.CHECK} Instant deposit via Chapa
${EMOJI.CHECK} Secure payment
${EMOJI.CHECK} Funds added immediately

*Popular amounts:*
    `.trim();

        const keyboard = KeyboardBuilder.depositAmountsKeyboard();

        await this.sendReply(ctx, message, keyboard);
    }
}

/**
 * /withdraw command - Initiate withdrawal flow
 */
export class WithdrawCommand extends BaseCommand {
    readonly name = 'withdraw';
    readonly description = 'Cash out your winnings';

    protected async handle(ctx: Context): Promise<void> {
        const user = ctx.from;
        if (!user) return;

        try {
            // Get real balance
            const balance = await botUserService.getBalance(user.id);

            if (balance < 50) {
                await this.sendReply(
                    ctx,
                    `${EMOJI.WARNING} Minimum withdrawal is 50 Birr.\n\nYour balance: ${balance} Birr\n\n${EMOJI.GAME} Play more games to increase your balance!`
                );
                return;
            }

            const message = `
${EMOJI.MONEY} *Withdraw Funds*

Available Balance: *${balance} Birr*

*Withdrawal Info:*
${EMOJI.CHECK} Minimum: 50 Birr
${EMOJI.CHECK} Processing: 1-24 hours
${EMOJI.CHECK} No fees for withdrawals

How much would you like to withdraw?

*Reply with the amount* (e.g., 100)
      `.trim();

            await this.sendReply(ctx, message);

            // TODO: Implement state management for withdrawal amount
        } catch (error) {
            console.error('Error in withdraw command:', error);
            await ctx.reply('❌ Error loading balance. Please try again.');
        }
    }
}

/**
 * /help command - Show help information
 */
export class HelpCommand extends BaseCommand {
    readonly name = 'help';
    readonly description = 'Get help and support';

    protected async handle(ctx: Context): Promise<void> {
        const message = `
${EMOJI.HELP} *Help & Support*

*Available Commands:*
/start - Main menu
/play - Join a game
/balance - Check wallet
/deposit - Add funds
/withdraw - Cash out
/daily - Claim daily reward
/refer - Invite friends
/help - This message

*Game Modes:*
🎯 *Ande Zeg* - One line wins
🎯🎯 *Hulet Zeg* - Two lines win
🎯🎯🎯 *Mulu Zeg* - Full card wins

*Need Help?*
${EMOJI.POINT_RIGHT} Contact support: @BingoEthiopiaSupport
${EMOJI.POINT_RIGHT} FAQ: bingoethiopia.com/faq
${EMOJI.POINT_RIGHT} Join community: t.me/BingoEthiopiaChat

${EMOJI.GAME} Ready to play? Use /play
    `.trim();

        const keyboard = new KeyboardBuilder()
            .addButton('🎮 Play Now', 'play_quick')
            .addButton('📞 Contact Support', 'support')
            .build();

        await this.sendReply(ctx, message, keyboard);
    }
}
