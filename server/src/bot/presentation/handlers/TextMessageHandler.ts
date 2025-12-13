import { Context, Telegraf } from 'telegraf';
import { botUserService } from '../../infrastructure/services/BotIntegrationService';
import { EMOJI } from '../../config/constants';

/**
 * Text Message Handler
 * Handles keyboard button presses (backward compatibility with old bot)
 */
export class TextMessageHandler {
    constructor(private bot: Telegraf, private webAppUrl: string) {
        this.registerHandlers();
    }

    private registerHandlers(): void {
        // Balance button
        this.bot.hears(['💰 Balance', '💰 Check Balance'], this.handleBalance.bind(this));

        // Stats button
        this.bot.hears(['📊 My Stats', '📊 Stats'], this.handleStats.bind(this));

        // Settings button
        this.bot.hears(['⚙️ Settings'], this.handleSettings.bind(this));

        // Deposit button
        this.bot.hears(['💳 Deposit'], this.handleDeposit.bind(this));
    }

    /**
     * Handle balance request
     */
    private async handleBalance(ctx: Context): Promise<void> {
        try {
            const user = ctx.from;
            if (!user) return;

            const userData = await botUserService.getUserByTelegramId(user.id);
            if (!userData) {
                await ctx.reply('❌ Please use /start to register first');
                return;
            }

            const balance = userData.balance;
            const message = `
${EMOJI.MONEY} *Your Balance*

Current Balance: *${balance} Birr*

${EMOJI.POINT_RIGHT} Use /deposit to add funds
${EMOJI.POINT_RIGHT} Use /withdraw to cash out
      `.trim();

            await ctx.reply(message, { parse_mode: 'Markdown' });
        } catch (error) {
            console.error('Balance handler error:', error);
            await ctx.reply('❌ Error loading balance. Please try again.');
        }
    }

    /**
     * Handle stats request
     */
    private async handleStats(ctx: Context): Promise<void> {
        try {
            const user = ctx.from;
            if (!user) return;

            const userData = await botUserService.getUserByTelegramId(user.id);
            if (!userData) {
                await ctx.reply('❌ Please use /start to register first');
                return;
            }

            const stats = await botUserService.getUserStats(user.id);
            const winRate = stats.gamesPlayed > 0
                ? ((stats.wins / stats.gamesPlayed) * 100).toFixed(1)
                : '0.0';

            const message = `
${EMOJI.CHART} *Your Statistics*

👤 Name: ${userData.firstName}
💰 Balance: ${userData.balance} Birr
📅 Joined: ${new Date(userData.registeredAt).toLocaleDateString()}

${EMOJI.WIN} Wins: ${stats.wins}/${stats.gamesPlayed} (${winRate}%)
${EMOJI.MONEY} Total Earnings: ${stats.totalEarnings} Birr

${EMOJI.GAME} Keep playing to improve your stats!
      `.trim();

            await ctx.reply(message, { parse_mode: 'Markdown' });
        } catch (error) {
            console.error('Stats handler error:', error);
            await ctx.reply('❌ Error loading stats. Please try again.');
        }
    }/**
   * Handle settings request
   */
    private async handleSettings(ctx: Context): Promise<void> {
        const message = `
${EMOJI.SETTINGS} *Settings*

Settings panel coming soon!

For now, use /start to return to the main menu.
    `.trim();

        await ctx.reply(message, { parse_mode: 'Markdown' });
    }

    /**
     * Handle deposit request
     */
    private async handleDeposit(ctx: Context): Promise<void> {
        await ctx.reply(`${EMOJI.MONEY} Please use /deposit command to add funds to your wallet.`);
    }
}
