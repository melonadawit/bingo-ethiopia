import type { Env } from '../types';
import { getSupabase, jsonResponse } from '../utils';

export async function handleGameRoutes(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/game', '').replace('/game', '');
    const supabase = getSupabase(env);

    // GET /api/game/modes
    if (path === '/modes' && request.method === 'GET') {
        const { data, error } = await supabase
            .from('game_modes')
            .select('*')
            .eq('is_active', true)
            .order('min_bet', { ascending: true });

        if (error) {
            return jsonResponse({ error: error.message }, 500);
        }

        const formattedData = (data || []).map((mode: any) => ({
            id: mode.id,
            title: mode.title,
            description: mode.description,
            minBet: mode.min_bet, // Map min_bet -> minBet
            icon: mode.icon,
            color: mode.color,
            activePlayers: 0 // Default to 0, or map if available
        }));

        return jsonResponse(formattedData);
    }

    // GET /api/game/stats
    if (path === '/stats' && request.method === 'GET') {
        const [usersResult, gamesResult] = await Promise.all([
            supabase.from('users').select('*', { count: 'exact', head: true }),
            supabase.from('games').select('prize_pool').eq('status', 'active'),
        ]);

        const totalPlayers = usersResult.count || 0;
        const jackpotPool = gamesResult.data?.reduce((sum, game) => sum + Number(game.prize_pool), 0) || 0;

        return jsonResponse({
            totalPlayers,
            onlinePlayers: 0,
            jackpotPool,
            isSystemLive: true,
        });
    }

    // POST /api/game/create
    if (path === '/create' && request.method === 'POST') {
        const { mode, userId } = await request.json();

        // Get mode details
        const { data: modeData } = await supabase
            .from('game_modes')
            .select('*')
            .eq('id', mode)
            .single();

        if (!modeData) {
            return jsonResponse({ error: 'Game mode not found' }, 404);
        }

        // Create game
        const { data: game, error } = await supabase
            .from('games')
            .insert({
                mode,
                entry_fee: modeData.min_bet,
                prize_pool: 0,
                status: 'waiting',
            })
            .select()
            .single();

        if (error) {
            return jsonResponse({ error: error.message }, 500);
        }

        return jsonResponse({ success: true, gameId: game.id });
    }

    return jsonResponse({ error: 'Not found' }, 404);
}
