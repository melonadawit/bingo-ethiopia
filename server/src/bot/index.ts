import { Telegraf } from 'telegraf';
import { CommandRegistry } from './presentation/commands/CommandRegistry';
import { CallbackHandler } from './presentation/handlers/CallbackHandler';
import { TextMessageHandler } from './presentation/handlers/TextMessageHandler';
import { BOT_CONFIG } from './config/constants';

/**
 * Main Bot Class - Singleton Pattern
 * Initializes and manages the Telegram bot
 */
export class BingoBot {
    private static instance: BingoBot;
    private bot: Telegraf;
    private commandRegistry!: CommandRegistry;
    private callbackHandler!: CallbackHandler;
    private textMessageHandler!: TextMessageHandler;

    private constructor(
        private botToken: string,
        private webAppUrl: string
    ) {
        this.bot = new Telegraf(botToken);
        this.setupBot();
    }

    /**
     * Get singleton instance
     */
    static getInstance(botToken: string, webAppUrl: string): BingoBot {
        if (!BingoBot.instance) {
            BingoBot.instance = new BingoBot(botToken, webAppUrl);
        }
        return BingoBot.instance;
    }

    /**
     * Setup bot middleware and handlers
     */
    private setupBot(): void {
        // Middleware
        this.setupMiddleware();

        // Command handlers
        this.commandRegistry = new CommandRegistry(this.bot, this.webAppUrl);

        // Callback query handlers
        this.callbackHandler = new CallbackHandler(this.bot, this.webAppUrl);

        // Text message handlers (for old keyboard buttons)
        this.textMessageHandler = new TextMessageHandler(this.bot, this.webAppUrl);

        // Error handler
        this.setupErrorHandler();

        console.log('✅ Bot setup complete');
    }

    /**
     * Setup middleware
     */
    private setupMiddleware(): void {
        // Logging middleware
        this.bot.use(async (ctx, next) => {
            const start = Date.now();
            await next();
            const ms = Date.now() - start;
            console.log(`Response time: ${ms}ms`);
        });

        // Rate limiting middleware
        const userLimits = new Map<number, { count: number; reset: number }>();

        this.bot.use(async (ctx, next) => {
            const userId = ctx.from?.id;
            if (!userId) return next();

            const now = Date.now();
            const limit = userLimits.get(userId);

            if (limit) {
                if (now < limit.reset) {
                    if (limit.count >= BOT_CONFIG.MAX_COMMANDS_PER_MINUTE) {
                        await ctx.reply('⚠️ Too many requests. Please wait a moment.');
                        return;
                    }
                    limit.count++;
                } else {
                    userLimits.set(userId, { count: 1, reset: now + 60000 });
                }
            } else {
                userLimits.set(userId, { count: 1, reset: now + 60000 });
            }

            await next();
        });
    }

    /**
     * Setup global error handler
     */
    private setupErrorHandler(): void {
        this.bot.catch((err, ctx) => {
            console.error('Bot error:', err);
            ctx.reply('Something went wrong. Please try again later.');
        });
    }

    /**
     * Start the bot
     */
    async launch(): Promise<void> {
        try {
            // Launch bot
            await this.bot.launch();

            console.log('🤖 Bingo Ethiopia Bot is running!');
            console.log('👉 Bot username:', this.bot.botInfo?.username);

            // Enable graceful stop
            process.once('SIGINT', () => this.stop('SIGINT'));
            process.once('SIGTERM', () => this.stop('SIGTERM'));

        } catch (error) {
            console.error('❌ Failed to launch bot:', error);
            throw error;
        }
    }

    /**
     * Stop the bot gracefully
     */
    private stop(signal: string): void {
        console.log(`Received ${signal}, stopping bot...`);
        this.bot.stop(signal);
        console.log('Bot stopped');
        process.exit(0);
    }

    /**
     * Get bot instance (for external use)
     */
    getBot(): Telegraf {
        return this.bot;
    }
}

/**
 * Initialize and export bot
 */
export async function initializeBot(): Promise<BingoBot> {
    const botToken = process.env.BOT_TOKEN;
    const webAppUrl = process.env.WEB_APP_URL || process.env.CLIENT_URL || 'http://localhost:5173';

    // Debug logging
    console.log('🔍 Bot initialization debug:');
    console.log('  BOT_TOKEN exists:', !!botToken);
    console.log('  WEB_APP_URL:', process.env.WEB_APP_URL || 'NOT SET');
    console.log('  Using webAppUrl:', webAppUrl);

    if (!botToken) {
        throw new Error('BOT_TOKEN environment variable is required');
    }

    const bot = BingoBot.getInstance(botToken, webAppUrl);
    await bot.launch();

    return bot;
}
