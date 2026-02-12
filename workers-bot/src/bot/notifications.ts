// Game notification service for Telegram bot
import type { Env } from '../types';

export async function notifyGameStart(gameId: string, mode: string, playerCount: number, prize: number, env: Env) {
    // Get all players in the game
    const players = await getGamePlayers(gameId, env);

    const message = `🎮 <b>Game Starting!</b>\\n\\n` +
        `Mode: ${formatMode(mode)}\\n` +
        `Players: ${playerCount}\\n` +
        `Prize: ${prize} Birr\\n\\n` +
        `Good luck! 🍀`;

    for (const player of players) {
        await sendTelegramMessage(player.telegram_id, message, env);
    }
}

export async function notifyWinner(winners: any[], prize: number, env: Env) {
    const prizePerWinner = Math.floor(prize / winners.length);

    for (const winner of winners) {
        const message = `🎉 <b>BINGO! YOU WON!</b>\\n\\n` +
            `Prize: ${prizePerWinner} Birr\\n` +
            `Card: #${winner.cardId}\\n\\n` +
            `Congratulations! 🏆`;

        await sendTelegramMessage(winner.userId, message, env);
    }
}

export async function notifyBalanceUpdate(userId: string, amount: number, reason: string, env: Env) {
    const message = `💰 <b>Balance Updated</b>\\n\\n` +
        `${amount > 0 ? '+' : ''}${amount} Birr\\n` +
        `Reason: ${reason}`;

    await sendTelegramMessage(userId, message, env);
}

async function getGamePlayers(gameId: string, env: Env): Promise<any[]> {
    // This would query your game state to get players
    // For now, return empty array - implement based on your game logic
    return [];
}

async function sendTelegramMessage(userId: string, text: string, env: Env) {
    try {
        await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: userId,
                text,
                parse_mode: 'HTML',
            }),
        });
    } catch (error) {
        console.error('Failed to send Telegram message:', error);
    }
}

async function updateUserBalance(userId: string, amount: number, env: Env) {
    // Update balance in Supabase
    const { getSupabase } = await import('../utils');
    const supabase = getSupabase(env);

    await supabase.rpc('increment_balance', {
        user_telegram_id: parseInt(userId),
        amount
    });
}

function formatMode(mode: string): string {
    const modes: Record<string, string> = {
        'ande-zig': 'Ande Zig (1 Line)',
        'hulet-zig': 'Hulet Zig (2 Lines)',
        'mulu-zig': 'Mulu Zig (Full Card)'
    };
    return modes[mode] || mode;
}

// Tournament notifications
export async function notifyTournamentUpdate(userId: number, tournament: any, message: string, env: Env) {
    const fullMessage = `🏆 <b>${tournament.name}</b>\n\n${message}`;

    await sendTelegramMessage(userId.toString(), fullMessage, env);

    // Save to notifications table
    const { getSupabase } = await import('../utils');
    const supabase = getSupabase(env);

    await supabase.from('notifications').insert({
        user_id: userId,
        type: 'tournament_update',
        title: tournament.name,
        message: fullMessage,
        data: { tournamentId: tournament.id }
    });
}

export async function notifyEventStart(userId: number, event: any, env: Env) {
    const message = `🎉 <b>${event.name}</b>\n\n${event.description}\n\n${event.multiplier}x Rewards Active!`;

    await sendTelegramMessage(userId.toString(), message, env);

    // Save to notifications table
    const { getSupabase } = await import('../utils');
    const supabase = getSupabase(env);

    await supabase.from('notifications').insert({
        user_id: userId,
        type: 'event_alert',
        title: event.name,
        message,
        data: { eventId: event.id }
    });
}

export async function notifyStreakReminder(userId: number, streak: number, env: Env) {
    const message = `🔥 <b>Don't Break Your Streak!</b>\n\nYou have a ${streak}-day streak going!\nClaim your daily bonus now!\n\n⏰ Expires at midnight`;

    await sendTelegramMessage(userId.toString(), message, env);

    // Save to notifications table
    const { getSupabase } = await import('../utils');
    const supabase = getSupabase(env);

    await supabase.from('notifications').insert({
        user_id: userId,
        type: 'streak_reminder',
        title: 'Streak Reminder',
        message,
        data: { streak }
    });
}

