// Enhanced stats routes for Cloudflare Workers
import type { Env } from '../types';
import { getSupabase } from '../utils';
import { jsonResponse } from '../utils';

export async function handleStatsRoutes(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const supabase = getSupabase(env);

    const path = url.pathname
        .replace('/api/stats', '')
        .replace('/stats', '')
        .replace('/api/leaderboard', '/leaderboard'); // Normnalize to /leaderboard

    // GET /user - Get user game statistics for wallet (mapped from /stats/user)
    if (path === '/user' && request.method === 'GET') {
        const userId = url.searchParams.get('user_id');

        if (!userId) {
            return jsonResponse({ success: false, error: 'user_id required' }, 400);
        }

        try {
            // Fetch user game stats
            const { data: stats, error } = await supabase
                .from('user_game_stats')
                .select('*')
                .eq('user_id', parseInt(userId))
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
                console.error('User stats error:', error);
                return jsonResponse({ success: false, error: 'Failed to fetch user stats' }, 500);
            }

            // Calculate win rate
            const gamesPlayed = stats?.games_played || 0;
            const gamesWon = stats?.games_won || 0;
            const totalWon = parseFloat(stats?.total_winnings || '0');
            const winRate = gamesPlayed > 0 ? Math.round((gamesWon / gamesPlayed) * 100) : 0;

            return jsonResponse({
                success: true,
                gamesPlayed,
                totalWon,
                winRate
            });
        } catch (error) {
            console.error('User stats error:', error);
            return jsonResponse({ success: false, error: 'Failed to fetch user stats' }, 500);
        }
    }

    // GET /me
    if (path === '/me' && request.method === 'GET') {
        const userId = url.searchParams.get('userId');

        if (!userId) {
            return jsonResponse({ error: 'Missing userId' }, 400);
        }

        const telegramId = parseInt(userId);

        // Get user stats from view
        const { data: stats, error: statsError } = await supabase
            .from('user_stats_view')
            .select('*')
            .eq('telegram_id', telegramId)
            .single();

        if (statsError) {
            console.error('Stats view error:', statsError);
            // Don't fail completely, try to continue with basic user info
        }

        // CRITICAL: Get the user's UUID for game_players lookup
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id, total_games_played, total_wins, total_winnings')
            .eq('telegram_id', telegramId)
            .single();

        if (userError || !userData) {
            return jsonResponse({ error: 'User not found' }, 404);
        }

        // Get tournament stats
        const { data: tournaments } = await supabase
            .from('tournament_participants')
            .select('*')
            .eq('user_id', telegramId);

        // Get notification summary
        const { data: notifications } = await supabase
            .from('user_notification_summary')
            .select('*')
            .eq('user_id', telegramId)
            .single();

        // Get recent games using the correct UUID
        const { data: recentGames, error: gamesError } = await supabase
            .from('game_players')
            .select(`
                *,
                game:games(*)
            `)
            .eq('user_id', userData.id) // Use explicit UUID
            .order('joined_at', { ascending: false })
            .limit(10);

        if (gamesError) {
            console.error('Recent games error:', gamesError);
        }

        return jsonResponse({
            // Explicitly map DB columns to frontend keys
            // Explicitly map DB columns from users table (source of truth)
            games_played: userData.total_games_played || 0,
            games_won: userData.total_wins || 0,
            total_winnings: parseFloat(userData.total_winnings || '0'),
            win_rate: (userData.total_games_played || 0) > 0
                ? Math.round(((userData.total_wins || 0) / (userData.total_games_played || 1)) * 100)
                : 0,
            id: userData.id, // Ensure ID is passed back
            tournaments: {
                participated: tournaments?.length || 0,
                total_prizes: (tournaments || []).reduce((sum, t) => sum + parseFloat(t.prize_won || 0), 0) || 0,
                best_rank: (tournaments?.length || 0) > 0
                    ? Math.min(...(tournaments || []).map(t => t.rank || 999))
                    : null
            },
            notifications: notifications || {
                total_notifications: 0,
                unread_count: 0,
                last_notification_at: null
            },
            recent_games: (recentGames || []).map(game => ({
                ...game,
                winnings: game.prize_amount, // Map prize_amount -> winnings
                rank: game.is_winner ? 1 : null, // deduce rank from is_winner
                // Maintain other fields
            }))
        });
    }

    // GET /leaderboard
    if (path === '/leaderboard' && request.method === 'GET') {
        const period = url.searchParams.get('period') || 'weekly';
        const limit = parseInt(url.searchParams.get('limit') || '10');

        // Fetch pre-calculated leaderboard entries
        const { data: entries, error } = await supabase
            .from('leaderboard_entries')
            .select('*') // No join here as it fails in DB schema
            .eq('period', period)
            .order('rank', { ascending: true })
            .limit(limit);

        if (error) {
            return jsonResponse({ error: error.message }, 500);
        }

        if (!entries || entries.length === 0) {
            return jsonResponse({ leaderboard: [] });
        }

        // Fetch additional user details to enrich the list
        const telegramIds = entries.map(e => parseInt(e.userId)).filter(id => !isNaN(id));
        const { data: userDetails } = await supabase
            .from('users')
            .select('telegram_id, first_name, username')
            .in('telegram_id', telegramIds);

        const userMap = new Map(userDetails?.map(u => [u.telegram_id.toString(), u]) || []);

        const leaderboard = entries.map(entry => {
            const userDetail = userMap.get(entry.userId);
            return {
                rank: entry.rank,
                wins: entry.wins || 0,
                total_winnings: parseFloat(entry.earnings || 0),
                games_played: entry.gamesPlayed || 0,
                user: {
                    telegram_id: parseInt(entry.userId),
                    username: userDetail?.username || entry.username || 'Anonymous',
                    first_name: userDetail?.first_name || entry.username || 'User'
                }
            };
        });

        return jsonResponse({ leaderboard });
    }

    // GET /referrals
    if (path === '/referrals' && request.method === 'GET') {
        const userId = url.searchParams.get('userId');
        if (!userId) return jsonResponse({ error: 'Missing userId' }, 400);

        const telegramId = parseInt(userId);

        // Fetch referred users details
        // Note: The 'referrals' table has referrer_id and referred_id (both BIGINT telegram_ids)
        const { data, error } = await supabase
            .from('referrals')
            .select(`
                referred_id,
                reward_amount,
                created_at
            `)
            .eq('referrer_id', telegramId)
            .order('created_at', { ascending: false });

        if (error) return jsonResponse({ error: error.message }, 500);

        // Fetch usernames for the referred IDs
        const referredIds = data.map(r => r.referred_id);
        const { data: usersData } = await supabase
            .from('users')
            .select('telegram_id, username, first_name')
            .in('telegram_id', referredIds);

        const userMap = new Map(usersData?.map(u => [u.telegram_id, u]) || []);

        const referrals = data.map(r => ({
            ...r,
            username: userMap.get(r.referred_id)?.username || `User ${r.referred_id}`,
            firstName: userMap.get(r.referred_id)?.first_name || 'Anonymous'
        }));

        return jsonResponse({ referrals });
    }

    return jsonResponse({ error: 'Not found' }, 404);
}
