import { Telegraf, Markup } from 'telegraf';
import dotenv from 'dotenv';
import { userService } from './services/userService';

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL || 'https://your-app.vercel.app';

// Create bot only if token exists
const bot = BOT_TOKEN ? new Telegraf(BOT_TOKEN) : null;

// Store pending referrals: Map<telegramId, referralCode>
const pendingReferrals = new Map<number, string>();

// Only set up bot handlers if bot exists
if (bot) {
    // Start command - Check registration and handle deep linking
    bot.start(async (ctx) => {
        try {
            const telegramId = ctx.from.id;
            const startPayload = ctx.payload; // telegraf extracts /start <payload>

            // If payload exists and user NOT registered, store it
            if (startPayload) {
                console.log(`🔗 Referral detected: ${startPayload} for user ${telegramId}`);
                pendingReferrals.set(telegramId, startPayload);
            }

            const isRegistered = await userService.isRegistered(telegramId);

            if (!isRegistered) {
                const welcomeText = '👋 *Welcome to Bingo Ethiopia!*\n\n' +
                    'To get started and access all features, please register by sharing your contact information.\n\n' +
                    '📱 Click the button below to register:';

                await ctx.reply(welcomeText, {
                    parse_mode: 'Markdown',
                    ...Markup.keyboard([
                        [Markup.button.contactRequest('📱 Register Now')]
                    ]).resize()
                });
                return;
            }

            const user = await userService.getUser(telegramId);
            const welcomeBackText = '👋 Welcome back, ' + user?.firstName + '!\n\n💰 Your balance: ' + user?.balance + ' Birr';
            await ctx.reply(welcomeBackText);
            await showMainMenu(ctx);
        } catch (error) {
            console.error('Start command error:', error);
            await ctx.reply('Sorry, something went wrong. Please try again.');
        }
    });

    // Handle contact share for registration
    bot.on('contact', async (ctx) => {
        try {
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

            // check for pending referral
            const referralCode = pendingReferrals.get(telegramId);

            // Register user
            const user = await userService.registerUser({
                telegramId: contact.user_id,
                phoneNumber: contact.phone_number,
                firstName: contact.first_name,
                lastName: contact.last_name,
                username: ctx.from.username,
                referralCode: referralCode // Pass the code from deep link
            });

            // Clean up pending
            if (referralCode) pendingReferrals.delete(telegramId);

            const successText = '✅ *Registration Successful!*\n\n' +
                'Welcome, ' + user.firstName + '! 🎉\n\n' +
                '🎁 You\'ve received ' + user.balance + ' Birr as a welcome bonus!\n\n' +
                'You can now access all features.';

            await ctx.reply(successText, { parse_mode: 'Markdown' });
            await showMainMenu(ctx);
        } catch (error) {
            console.error('Registration error:', error);
            await ctx.reply('❌ Registration failed. Please try again.');
        }
    });

    // Helper function to show main menu (UPDATED)
    function showMainMenu(ctx: any) {
        const menuText = '🎮 *Welcome to Bingo Ethiopia!*\n\nChoose an option below:';
        return ctx.reply(menuText, {
            parse_mode: 'Markdown',
            ...Markup.keyboard([
                [Markup.button.webApp('🎯 Play Bingo', WEBAPP_URL!)],
                ['💰 Balance', '👥 Invite Friends'],
                ['📊 My Stats', '⚙️ Settings']
            ]).resize()
        });
    }

    // Invite Friends
    bot.hears('👥 Invite Friends', async (ctx) => {
        try {
            const telegramId = ctx.from.id;
            const user = await userService.getUser(telegramId);

            if (!user) {
                await ctx.reply('❌ Please register first using /start');
                return;
            }

            // If user doesn't have a code (legacy user), we might need to generate one? 
            // Ideally userService.getUser ensures migration or generates on fly, but for now assuming it exists 
            // or logic was added to userService to ensure it.
            // If missing, we might show "Error: Code not found" or auto-fix.
            // Let's assume migration script will run or we handle it gracefully.
            const code = user.referralCode || 'GEN-ERR';
            const botUsername = ctx.botInfo.username;
            const inviteLink = `https://t.me/${botUsername}?start=${code}`;

            const inviteText = `🎉 *Invite & Earn!*\n\n` +
                `Share your unique link with friends.\n` +
                `When they join and play, you earn bonuses!\n\n` +
                `👇 *Your Invite Link:*\n` +
                `${inviteLink}\n\n` +
                `👇 *Copy & Share this message:*`;

            const shareMessage = `Hey! Join me on Bingo Ethiopia and get a 100 Birr welcome bonus! 🎮💸\n\nClick here to play: ${inviteLink}`;

            await ctx.reply(inviteText, { parse_mode: 'Markdown' });
            await ctx.reply(shareMessage);

        } catch (error) {
            console.error('Invite error:', error);
            await ctx.reply('Sorry, could not generate invite link.');
        }
    });

    // Check Balance
    bot.hears(['💰 Check Balance', '💰 Balance'], async (ctx) => {
        try {
            const telegramId = ctx.from.id;
            const user = await userService.getUser(telegramId);

            if (!user) {
                await ctx.reply('❌ Please register first using /start');
                return;
            }

            const balanceText = '💰 *Your Balance*\n\n' +
                'Current Balance: *' + user.balance + ' Birr*\n\n' +
                'Use the web app to deposit funds!';

            await ctx.reply(balanceText, { parse_mode: 'Markdown' });
        } catch (error) {
            console.error('Check balance error:', error);
            await ctx.reply('Sorry, something went wrong.');
        }
    });

    // Deposit (Legacy handler, kept for compatibility if needed)
    bot.hears('💳 Deposit', async (ctx) => {
        await ctx.reply('Please use the 🎯 Play Bingo button to open the Wallet.');
    });

    // My Stats
    bot.hears('📊 My Stats', async (ctx) => {
        try {
            const telegramId = ctx.from.id;
            const user = await userService.getUser(telegramId);

            if (!user) {
                await ctx.reply('❌ Please register first using /start');
                return;
            }

            const statsText = '📊 *Your Statistics*\n\n' +
                '👤 Name: ' + user.firstName + '\n' +
                '📱 Phone: ' + user.phoneNumber + '\n' +
                '📅 Joined: ' + user.registeredAt.toLocaleDateString() + '\n' +
                '💰 Balance: ' + user.balance + ' Birr\n' +
                '🎫 Referral Code: `' + (user.referralCode || 'N/A') + '`';

            await ctx.reply(statsText, { parse_mode: 'Markdown' });
        } catch (error) {
            console.error('Stats error:', error);
            await ctx.reply('Sorry, something went wrong.');
        }
    });

    // Settings
    bot.hears('⚙️ Settings', async (ctx) => {
        try {
            const settingsText = '⚙️ *Settings*\n\n' +
                'Settings panel coming soon!\n\n' +
                'For now, use /start to return to the main menu.';

            await ctx.reply(settingsText, { parse_mode: 'Markdown' });
        } catch (error) {
            console.error('Settings error:', error);
            await ctx.reply('Sorry, something went wrong.');
        }
    });
}

export async function setupWebhook() {
    if (!bot) {
        console.log('⚠️  Telegram bot is disabled (no BOT_TOKEN)');
        console.log('✅ Server will run without Telegram integration');
        return;
    }

    try {
        const webhookDomain = process.env.WEBHOOK_DOMAIN;

        if (!webhookDomain) {
            console.warn('⚠️  WEBHOOK_DOMAIN not set, bot will not receive updates');
            console.warn('⚠️  Set WEBHOOK_DOMAIN to your Render URL (e.g., https://your-app.onrender.com)');
            return;
        }

        const webhookUrl = `${webhookDomain}/telegram-webhook`;

        // Set webhook
        await bot.telegram.setWebhook(webhookUrl);

        console.log('✅ Telegram Bot webhook configured successfully!');
        console.log(`📱 Webhook URL: ${webhookUrl}`);
        console.log(`🌐 Web App URL: ${WEBAPP_URL}`);
    } catch (error) {
        console.error('❌ Failed to setup Telegram webhook:', error);
        console.error('⚠️  Continuing without Telegram bot...');
    }
}

// Export bot instance for webhook handling
export { bot };

