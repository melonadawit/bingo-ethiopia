// Add these handler functions at the end of webhook.ts before the helper functions

import type { Env } from './types';
import { getSupabase } from './utils';
import type { BotConfig } from './config';
import { sendMessage, getWebAppUrl, answerCallback } from './bot-utils';

async function handleTournaments(chatId: number, userId: number, env: Env, supabase: any) {
    // Get active tournaments
    const { data: tournaments, error } = await supabase
        .from('active_tournaments_view')
        .select('*')
        .order('end_date', { ascending: true });

    if (error || !tournaments || tournaments.length === 0) {
        await sendMessage(chatId, '🏆 <b>No Active Tournaments</b>\n\nThere are no tournaments running right now. Check back soon!', env);
        return;
    }

    for (const tournament of tournaments) {
        const endDate = new Date(tournament.end_date);
        const now = new Date();
        const timeLeft = Math.floor((endDate.getTime() - now.getTime()) / (1000 * 60 * 60)); // hours

        let message = `🏆 <b>${tournament.name}</b>\n\n`;
        message += `📅 Type: ${tournament.type.charAt(0).toUpperCase() + tournament.type.slice(1)}\n`;
        message += `⏰ Ends in: ${timeLeft} hours\n`;
        message += `👥 Participants: ${tournament.participant_count || 0}\n`;
        message += `💰 Prize Pool: ${tournament.prize_pool} Birr\n\n`;
        message += `Join now to compete for prizes!`;

        await sendMessage(chatId, message, env, {
            inline_keyboard: [[
                { text: '🎮 Join Tournament', callback_data: `join_tournament:${tournament.id}` },
                { text: '📊 Leaderboard', callback_data: `tournament_leaderboard:${tournament.id}` }
            ]]
        });
    }
}

async function handleEvents(chatId: number, userId: number, env: Env, supabase: any) {
    // Get active events
    const { data: events, error } = await supabase.rpc('get_active_events');

    if (error || !events || events.length === 0) {
        await sendMessage(chatId, '🎉 <b>No Active Events</b>\n\nThere are no special events running right now. Check back soon!', env);
        return;
    }

    for (const event of events) {
        const endTime = new Date(event.end_time);
        const now = new Date();
        const minutesLeft = Math.floor((endTime.getTime() - now.getTime()) / (1000 * 60));

        let message = `🎉 <b>${event.name}</b>\n\n`;
        message += `${event.description}\n\n`;
        message += `🎁 Multiplier: ${event.multiplier}x Rewards\n`;
        message += `⏰ Ends in: ${minutesLeft} minutes\n\n`;
        message += `Play now to get ${event.multiplier}x rewards!`;

        await sendMessage(chatId, message, env, {
            inline_keyboard: [[
                { text: '🎮 Play Now', web_app: { url: getWebAppUrl(userId) } }
            ]]
        });
    }
}

// Add to handleCallbackQuery function - add these cases

async function handleTournamentCallbacks(data: string, chatId: number, userId: number, callbackQueryId: string, env: Env, supabase: any) {
    // Join tournament
    if (data.startsWith('join_tournament:')) {
        const tournamentId = data.split(':')[1];

        // Check if already joined
        const { data: existing } = await supabase
            .from('tournament_participants')
            .select('*')
            .eq('tournament_id', tournamentId)
            .eq('user_id', userId)
            .single();

        if (existing) {
            await answerCallback(callbackQueryId, env, 'You already joined this tournament!');
            return;
        }

        // Join tournament
        const { error } = await supabase
            .from('tournament_participants')
            .insert({ tournament_id: tournamentId, user_id: userId });

        if (error) {
            await answerCallback(callbackQueryId, env, 'Failed to join tournament');
        } else {
            await answerCallback(callbackQueryId, env, '✅ Successfully joined tournament!');
            await sendMessage(chatId, '🎉 <b>Tournament Joined!</b>\n\nGood luck! Play games to earn points and climb the leaderboard!', env);
        }
    }

    // View tournament leaderboard
    if (data.startsWith('tournament_leaderboard:')) {
        const tournamentId = data.split(':')[1];

        const { data: leaderboard, error } = await supabase
            .rpc('get_tournament_leaderboard', {
                tournament_uuid: tournamentId,
                limit_count: 10
            });

        if (error || !leaderboard || leaderboard.length === 0) {
            await answerCallback(callbackQueryId, env, 'No participants yet');
            return;
        }

        let message = '🏆 <b>Tournament Leaderboard</b>\n\n';
        leaderboard.forEach((entry: any, index: number) => {
            const emoji = index === 0 ? '👑' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
            message += `${emoji} User ${entry.user_id} - ${entry.wins} wins\n`;
        });

        await answerCallback(callbackQueryId, env);
        await sendMessage(chatId, message, env);
    }
}

// Export these functions
export { handleTournaments, handleEvents, handleTournamentCallbacks };
