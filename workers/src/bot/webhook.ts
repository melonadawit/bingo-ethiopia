import type { Env } from '../types';
import { getSupabase, jsonResponse } from '../utils';

export async function handleBotWebhook(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
        return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const update = await request.json() as any;
    const supabase = getSupabase(env);

    if (update.message) {
        const chatId = update.message.chat.id;
        const text = update.message.text;
        const username = update.message.from.username || update.message.from.first_name;

        switch (text) {
            case '/start':
                // Create or get user
                const { data: existingUser } = await supabase
                    .from('users')
                    .select('*')
                    .eq('telegram_id', chatId)
                    .single();

                if (!existingUser) {
                    await supabase
                        .from('users')
                        .insert({
                            telegram_id: chatId,
                            username,
                            balance: 1000,
                        });
                }

                await sendMessage(
                    chatId,
                    `🎉 Welcome to Bingo Ethiopia!\n\n` +
                    `Your balance: ${existingUser?.balance || 1000} Birr\n\n` +
                    `Commands:\n` +
                    `/balance - Check balance\n` +
                    `/daily - Claim daily reward\n` +
                    `/leaderboard - View rankings`,
                    env
                );
                break;

            case '/balance':
                const { data: user } = await supabase
                    .from('users')
                    .select('balance')
                    .eq('telegram_id', chatId)
                    .single();

                await sendMessage(
                    chatId,
                    `💰 Your balance: ${user?.balance || 0} Birr`,
                    env
                );
                break;

            case '/daily':
                // Check if can claim
                const { data: reward } = await supabase
                    .from('daily_rewards')
                    .select('*')
                    .eq('user_id', chatId)
                    .single();

                const today = new Date().toISOString().split('T')[0];
                const canClaim = !reward?.last_claim_date || reward.last_claim_date !== today;

                if (!canClaim) {
                    await sendMessage(
                        chatId,
                        `⏰ You already claimed your daily reward today!\nCome back tomorrow!`,
                        env
                    );
                } else {
                    const rewardAmount = 50; // Simplified
                    await sendMessage(
                        chatId,
                        `🎁 Daily reward claimed: ${rewardAmount} Birr!\nStreak: ${(reward?.current_streak || 0) + 1} days`,
                        env
                    );
                }
                break;

            case '/leaderboard':
                await sendMessage(
                    chatId,
                    `🏆 Leaderboard\n\nComing soon!`,
                    env
                );
                break;

            default:
                await sendMessage(
                    chatId,
                    `❓ Unknown command. Try /start for help.`,
                    env
                );
        }
    }

    return jsonResponse({ ok: true });
}

async function sendMessage(chatId: number, text: string, env: Env) {
    await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'HTML',
        }),
    });
}
