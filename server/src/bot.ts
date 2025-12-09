import { Telegraf, Markup } from 'telegraf';
import dotenv from 'dotenv';

dotenv.config();

const token = process.env.BOT_TOKEN;
if (!token) {
    throw new Error('BOT_TOKEN must be provided!');
}

export const bot = new Telegraf(token);

const webAppUrl = process.env.WEBAPP_URL || 'http://localhost:5180';

// Start command
bot.command('start', (ctx) => {
    ctx.reply(
        '👋 Welcome to Online Bingo!\nChoose an Option below.',
        Markup.inlineKeyboard([
            [Markup.button.webApp('🎮 Play Bingo', webAppUrl), Markup.button.callback('💰 Check Balance', 'balance')],
            [Markup.button.callback('💵 Deposit', 'deposit'), Markup.button.callback('🤑 Withdraw', 'withdraw')],
            [Markup.button.callback('📖 Instruction', 'instruction'), Markup.button.callback('🔗 Invite', 'invite')],
            [Markup.button.callback('📞 Contact Support', 'support')]
        ])
    );
});

// Action Handlers
bot.action('balance', (ctx) => {
    // Mock balance for now
    ctx.reply('Your current balance is: 100 Birr');
});

bot.action('deposit', (ctx) => {
    ctx.reply('To deposit, please contact support or use Chapa/Telebirr (Coming Soon).');
});

bot.action('withdraw', (ctx) => {
    ctx.reply('Withdrawal feature coming soon!');
});

bot.action('instruction', (ctx) => {
    ctx.reply('Instructions: \n1. Click Play Bingo\n2. Buy a ticket\n3. Wait for the game to start!');
});

bot.action('invite', (ctx) => {
    ctx.reply('Share this bot with your friends!');
});

bot.action('support', (ctx) => {
    ctx.reply('Contact @bereket_tg for support.');
});

// Launch logic is handled in index.ts
