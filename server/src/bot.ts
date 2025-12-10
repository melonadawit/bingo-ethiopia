import { Telegraf, Markup } from 'telegraf';
import dotenv from 'dotenv';
import { userService } from './services/userService';

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://your-app.vercel.app';

// Create bot only if token exists
const bot = BOT_TOKEN ? new Telegraf(BOT_TOKEN) : null;

// Helper function to show main menu
function showMainMenu(ctx: any) {
    return ctx.reply(
        '🎮 *Welcome to Bingo Ethiopia!*\n\nChoose an option below:',
        {
            parse_mode: 'Markdown',
            ...Markup.keyboard([
                [Markup.button.webApp('🎯 Play Bingo', WEBAPP_URL!)],
                ['💰 Check Balance', '💳 Deposit'],
                ['📊 My Stats', '⚙️ Settings']
            ]).resize()
        }
    );
}

// Only set up bot handlers if bot exists
if (bot) {
    // Start command - Check registration
    bot.start(async (ctx) => {
        const telegramId = ctx.from.id;
        const isRegistered = await userService.isRegistered(telegramId);

        if (!isRegistered) {
            await ctx.reply(
                '👋 *Welcome to Bingo Ethiopia!*\n\n' +
                'To get started and access all features, please register by sharing your contact information.\n\n' +
                '📱 Click the button below to register:',
                {
                    parse_mode: 'Markdown',
                    ...Markup.keyboard([
                        [Markup.button.contactRequest('📱 Register Now')]
                    ]).resize()
                }
            );
            return;
        }

        const user = await userService.getUser(telegramId);
        await ctx.reply(
            `👋 Welcome back, ${user?.firstName}!\n\n` +
            `💰 Your balance: ${user?.balance} Birr`
        );
        await showMainMenu(ctx);
    });

    // Handle contact share for registration
    bot.on('contact', async (ctx) => {
        const contact = ctx.message.contact;
        const telegramId = ctx.from.id;

        // Verify it's the user's own contact
        if (contact.user_id !== telegramId) {
            await ctx.reply('❌ Please share your own contact to register.');
            return;
        }

        // Check if already registered
        if (await userService.isRegistered(telegramId)) {
            await ctx.reply('✅ You are already registered!');
            await showMainMenu(ctx);
            return;
        }

        // Register user
        try {
            const user = await userService.registerUser({
                telegramId: contact.user_id,
                phoneNumber: contact.phone_number,
                firstName: contact.first_name,
                lastName: contact.last_name,
                username: ctx.from.username
            });

            await ctx.reply(
                '✅ *Registration Successful!*\n\n' +
                `Welcome, ${user.firstName}! 🎉\n\n` +
                `🎁 You've received ${user.balance} Birr as a welcome bonus!\n\n` +
                'You can now access all features.',
                { parse_mode: 'Markdown' }
            );

            await showMainMenu(ctx);
        } catch (error) {
            console.error('Registration error:', error);
            await ctx.reply('❌ Registration failed. Please try again.');
        }
    });

    // Check Balance - Only for registered users
    bot.hears('💰 Check Balance', async (ctx) => {
        const telegramId = ctx.from.id;
        const user = await userService.getUser(telegramId);

        if (!user) {
            await ctx.reply('❌ Please register first using /start');
            return;
        }

        await ctx.reply(
            `💰 *Your Balance*\n\n` +
            `Current Balance: *${user.balance} Birr*\n\n` +
            `Use the Deposit button to add funds!`,
            { parse_mode: 'Markdown' }
        );
    });

    // Deposit - Only for registered users
    bot.hears('💳 Deposit', async (ctx) => {
        const telegramId = ctx.from.id;
        const user = await userService.getUser(telegramId);

        if (!user) {
            await ctx.reply('❌ Please register first using /start');
            return;
        }

        await ctx.reply(
            '💳 *Deposit Funds*\n\n' +
            'To deposit, please use the web app.\n\n' +
            '📱 Click "Play Bingo" button to open the app and go to Wallet.',
            { parse_mode: 'Markdown' }
        );
    });

    // My Stats
    bot.hears('📊 My Stats', async (ctx) => {
        const telegramId = ctx.from.id;
        const user = await userService.getUser(telegramId);

        if (!user) {
            await ctx.reply('❌ Please register first using /start');
            return;
        }

        await ctx.reply(
            `📊 *Your Statistics*\n\n` +
            `👤 Name: ${user.firstName}\n` +
            `📱 Phone: ${user.phoneNumber}\n` +
            `📅 Member since: ${user.registeredAt.toLocaleDateString()}\n` +
            `💰 Balance: ${user.balance} Birr\n` +
            `🎮 Games Played: Coming soon!\n` +
            `🏆 Wins: Coming soon!`,
            { parse_mode: 'Markdown' }
        );
    });

    // Settings
    bot.hears('⚙️ Settings', async (ctx) => {
        await ctx.reply(
            '⚙️ *Settings*\n\n' +
            'Settings panel coming soon!\n\n' +
            'For now, use /start to return to the main menu.',
            { parse_mode: 'Markdown' }
        );
    });
}

export async function launchBot() {
    if (!bot) {
        console.log('⚠️  Telegram bot is disabled (no BOT_TOKEN)');
        console.log('✅ Server will run without Telegram integration');
        return;
    }

    try {
        await bot.launch();
        console.log('✅ Telegram Bot launched successfully!');
        console.log(`📱 Bot is ready to receive messages`);
        console.log(`🌐 Web App URL: ${WEBAPP_URL}`);

        // Graceful shutdown
        process.once('SIGINT', () => bot!.stop('SIGINT'));
        process.once('SIGTERM', () => bot!.stop('SIGTERM'));
    } catch (error) {
        console.error('❌ Failed to launch Telegram Bot:', error);
        console.error('⚠️  Continuing without Telegram bot...');
    }
}
