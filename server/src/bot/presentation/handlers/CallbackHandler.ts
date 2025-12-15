import { Context, Telegraf } from 'telegraf';
import { CALLBACKS, EMOJI } from '../../config/constants';
import { KeyboardBuilder } from '../../utils/KeyboardBuilder';
import { dailyRewardService } from '../../infrastructure/services/DailyRewardService';
import { botUserService } from '../../infrastructure/services/BotIntegrationService';
import { botGameService } from '../../infrastructure/services/BotGameService';

/**
 * Callback Query Handler
 * Handles all inline keyboard button presses
 */
export class CallbackHandler {
    constructor(
        private bot: Telegraf,
        private webAppUrl: string
    ) {
        this.registerHandlers();
    }

    private registerHandlers(): void {
        // Game mode selection
        this.bot.action(/^mode_(.+)$/, this.handleGameMode.bind(this));

        // Deposit amount selection
        this.bot.action(/^deposit_(.+)$/, this.handleDeposit.bind(this));

        // Daily reward claim
        this.bot.action('daily_claim', this.handleDailyClaim.bind(this));

        // Simple actions
        this.bot.action('balance', this.handleBalance.bind(this));
        this.bot.action('stats', this.handleStats.bind(this));
        this.bot.action('daily', this.handleDaily.bind(this));
        this.bot.action('refer', this.handleRefer.bind(this));
        this.bot.action('play_quick', this.handlePlayQuick.bind(this));
        this.bot.action('main_menu', this.handleMainMenu.bind(this));
    }

    /**
     * Handle game mode selection
     */
    private async handleGameMode(ctx: Context): Promise<void> {
        if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;

        const mode = ctx.callbackQuery.data.replace('mode_', '') as 'and-zig' | 'hulet-zig' | 'mulu-zig';
        const modeNames: Record<string, string> = {
            'and-zig': 'Ande Zeg (አንድ ዘግ)',
            'hulet-zig': 'Hulet Zeg (ሁለት ዘግ)',
            'mulu-zig': 'Mulu Zeg (ሙሉ ዘግ)'
        };

        const message = `
${EMOJI.GAME} *${modeNames[mode] || mode}*

Loading available games...
    `.trim();

        await ctx.answerCbQuery();
        await ctx.editMessageText(message, { parse_mode: 'Markdown' });

        // TODO: Fetch actual games from database
        setTimeout(async () => {
            const games = await this.getGamesByMode(mode);
            await this.showGameList(ctx, mode, games);
        }, 500);
    }

    /**
     * Handle deposit amount selection
     */
    private async handleDeposit(ctx: Context): Promise<void> {
        if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;

        const amount = ctx.callbackQuery.data.replace('deposit_', '');

        await ctx.answerCbQuery('Processing payment...');

        if (amount === 'custom') {
            await ctx.editMessageText(
                `${EMOJI.MONEY} Enter the amount you want to deposit:\n\n*Reply with a number* (minimum 10 Birr)`,
                { parse_mode: 'Markdown' }
            );
            return;
        }

        // Generate payment link
        const paymentUrl = await this.generatePaymentLink(
            ctx.from!.id,
            parseInt(amount)
        );

        const keyboard = new KeyboardBuilder()
            .addUrlButton('💳 Pay Now', paymentUrl)
            .addButton('🔙 Back', 'deposit_menu')
            .build();

        await ctx.editMessageText(
            `${EMOJI.MONEY} *Deposit ${amount} Birr*\n\nClick "Pay Now" to complete payment via Chapa.`,
            { parse_mode: 'Markdown', ...keyboard }
        );
    }

    /**
     * Handle balance check
     */
    private async handleBalance(ctx: Context): Promise<void> {
        await ctx.answerCbQuery();

        const balance = await this.getUserBalance(ctx.from!.id);

        await ctx.reply(
            `${EMOJI.MONEY} Your balance: *${balance} Birr*`,
            { parse_mode: 'Markdown' }
        );
    }

    /**
     * Handle stats view
     */
    private async handleStats(ctx: Context): Promise<void> {
        await ctx.answerCbQuery();

        const stats = {
            wins: 12,
            games: 45,
            earnings: 2500
        };

        const winRate = ((stats.wins / stats.games) * 100).toFixed(1);

        const message = `
${EMOJI.CHART} *Your Statistics*

${EMOJI.WIN} Wins: ${stats.wins}/${stats.games} (${winRate}%)
${EMOJI.MONEY} Total Earnings: ${stats.earnings} Birr

${EMOJI.GAME} Keep playing to improve your stats!
    `.trim();

        await ctx.reply(message, { parse_mode: 'Markdown' });
    }

    /**
     * Handle daily reward claim
     */
    private async handleDaily(ctx: Context): Promise<void> {
        if (!ctx.from) return;

        try {
            await ctx.answerCbQuery('Loading...');

            // Get streak info
            const streakInfo = await dailyRewardService.getStreakInfo(ctx.from.id);

            if (streakInfo.canClaim) {
                // Show claim button
                const message = `
${EMOJI.GIFT} *Daily Reward Available!*

${EMOJI.FIRE} *Current Streak:* ${streakInfo.streakDays} day${streakInfo.streakDays !== 1 ? 's' : ''}
${EMOJI.MONEY} *Today's Reward:* ${streakInfo.nextReward} Birr
${EMOJI.CHART} *Total Claimed:* ${streakInfo.totalClaimed} Birr

Click below to claim your reward!
                `.trim();

                const keyboard = new KeyboardBuilder()
                    .addButton(`🎁 Claim ${streakInfo.nextReward} Birr`, 'daily_claim')
                    .addButton('🔙 Back to Menu', 'main_menu')
                    .build();

                await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });
            } else {
                // Already claimed
                const message = `
${EMOJI.CHECK} *Already Claimed Today!*

${EMOJI.FIRE} *Current Streak:* ${streakInfo.streakDays} day${streakInfo.streakDays !== 1 ? 's' : ''}
${EMOJI.MONEY} *Next Reward:* ${streakInfo.nextReward} Birr

⏰ *Come back in:* ${streakInfo.timeUntilNext}
                `.trim();

                const keyboard = new KeyboardBuilder()
                    .addButton('🔙 Back to Menu', 'main_menu')
                    .build();

                await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });
            }
        } catch (error) {
            console.error('Error in handleDaily:', error);
            await ctx.reply('❌ Error loading daily rewards. Please try /daily command.');
        }
    }

    /**
     * Handle daily reward claim button
     */
    private async handleDailyClaim(ctx: Context): Promise<void> {
        if (!ctx.from) return;

        try {
            await ctx.answerCbQuery('Processing...');

            // Claim the reward
            const result = await dailyRewardService.claimReward(ctx.from.id);

            if (result.success) {
                // Credit user balance
                await botUserService.updateBalance(ctx.from.id, result.amount);

                // Success message
                const message = `
${EMOJI.CELEBRATE} *Reward Claimed!* ${EMOJI.CELEBRATE}

${EMOJI.MONEY} *+${result.amount} Birr added to wallet!*

${EMOJI.FIRE} *Streak:* Day ${result.streakDays} ${result.streakDays === 7 ? '🏆' : ''}
${EMOJI.GIFT} *Tomorrow:* ${result.nextReward} Birr

${result.streakDays === 7 ? `\n🎉 *7-Day Streak Complete!* 🎉\nStarting fresh tomorrow with 10 Birr!` : ''}

Keep your streak alive by claiming daily!
                `.trim();

                const keyboard = new KeyboardBuilder()
                    .addButton('💰 Check Balance', 'balance')
                    .addButton('🎮 Play Game', 'play_quick')
                    .build();

                await ctx.editMessageText(message, { parse_mode: 'Markdown', ...keyboard });
            } else {
                // Already claimed or error
                await ctx.editMessageText(
                    `${EMOJI.WARNING} ${result.message}`,
                    { parse_mode: 'Markdown' }
                );
            }
        } catch (error) {
            console.error('Error claiming daily reward:', error);
            await ctx.answerCbQuery('Error claiming reward. Please try again.');
        }
    }

    /**
     * Handle referral
     */
    private async handleRefer(ctx: Context): Promise<void> {
        await ctx.answerCbQuery();

        const referralCode = `REF${ctx.from!.id}`;
        const referralLink = `https://t.me/${this.bot.botInfo?.username}?start=${referralCode}`;

        const message = `
${EMOJI.GIFT} *Invite Friends & Earn!*

Share your referral link:
\`${referralLink}\`

*Rewards:*
${EMOJI.CHECK} You: 50 Birr per referral
${EMOJI.CHECK} Friend: 25 Birr welcome bonus

The more friends, the more you earn!
    `.trim();

        const keyboard = new KeyboardBuilder()
            .addUrlButton('📤 Share Link', `https://t.me/share/url?url=${encodeURIComponent(referralLink)}`)
            .build();

        await ctx.reply(message, { parse_mode: 'Markdown', ...keyboard });
    }

    /**
     * Handle main menu
     */
    private async handleMainMenu(ctx: Context): Promise<void> {
        await ctx.answerCbQuery();

        const keyboard = KeyboardBuilder.mainMenuKeyboard(this.webAppUrl);

        await ctx.reply(
            `${EMOJI.GAME} *Main Menu*\n\nWhat would you like to do?`,
            { parse_mode: 'Markdown', ...keyboard }
        );
    }

    private async generatePaymentLink(userId: number, amount: number): Promise<string> {
        const { botPaymentService, botUserService } = await import('../../infrastructure/services/BotIntegrationService');

        try {
            // Get user data for payment
            const user = await botUserService.getUserByTelegramId(userId);
            if (!user) {
                return 'https://payment.chapa.co/pay/error-no-user';
            }

            // Generate real Chapa payment link
            const paymentUrl = await botPaymentService.createDepositLink(
                userId,
                amount,
                {
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: `user${userId}@bingoethiopia.com`
                }
            );

            return paymentUrl;
        } catch (error) {
            console.error('Error generating payment link:', error);
            return 'https://payment.chapa.co/pay/error';
        }
    }

    private async getUserBalance(userId: number): Promise<number> {
        const { botUserService } = await import('../../infrastructure/services/BotIntegrationService');
        return await botUserService.getBalance(userId);
    }

    /**
     * Get games by mode from BotGameService
     */
    private async getGamesByMode(mode: 'and-zig' | 'hulet-zig' | 'mulu-zig'): Promise<any[]> {
        return await botGameService.getGamesByMode(mode);
    }

    /**
     * Show list of available games
     */
    private async showGameList(ctx: Context, mode: string, games: any[]): Promise<void> {
        if (games.length === 0) {
            await ctx.editMessageText(
                `${EMOJI.WARNING} No games available for this mode.\n\nCheck back later or try another mode!`,
                { parse_mode: 'Markdown' }
            );
            return;
        }

        const modeNames: Record<string, string> = {
            'and-zig': 'Ande Zeg',
            'hulet-zig': 'Hulet Zeg',
            'mulu-zig': 'Mulu Zeg'
        };

        const entryFee = botGameService.getEntryFee(mode as any);

        let message = `${EMOJI.GAME} *${modeNames[mode]} Games*\n\n`;
        message += `💰 Entry Fee: ${entryFee} Birr\n\n`;
        message += `*Available Games:*\n`;

        games.forEach((game, index) => {
            message += `\n${index + 1}. Game #${game.id.slice(0, 6)}\n`;
            message += `   👥 Players: ${game.currentPlayers}/${game.maxPlayers}\n`;
            message += `   ${game.status === 'waiting' ? '⏳ Waiting' : '🎮 In Progress'}\n`;
        });

        const keyboard = new KeyboardBuilder()
            .addWebAppButton(`${EMOJI.GAME} Open Game Lobby`, this.webAppUrl + '/lobby')
            .addButton('🔙 Back to Modes', 'back_to_modes')
            .build();

        await ctx.editMessageText(message, { parse_mode: 'Markdown', ...keyboard });
    }

    /**
     * Handle quick play button
     */
    private async handlePlayQuick(ctx: Context): Promise<void> {
        if (!ctx.from) return;

        try {
            await ctx.answerCbQuery('Opening game lobby...');

            const message = `
${EMOJI.GAME} *Choose Your Game Mode:*

🎯 *Ande Zeg* (50 Birr)
   Complete 1 line or 4 corners

🎮 *Hulet Zeg* (100 Birr)
   Complete 2 lines

🏆 *Mulu Zeg* (150 Birr)
   Blackout - Mark all 25 cells

Click below to start playing!
            `.trim();

            const keyboard = new KeyboardBuilder()
                .addWebAppButton(`${EMOJI.GAME} Open Game Lobby`, this.webAppUrl + '/lobby')
                .addButton('🔙 Back to Menu', 'main_menu')
                .build();

            await ctx.editMessageText(message, { parse_mode: 'Markdown', ...keyboard });
        } catch (error) {
            console.error('Error in handlePlayQuick:', error);
            await ctx.answerCbQuery('Error opening game. Please try /play command.');
        }
    }
}
