import { getSupabase, jsonResponse } from '../utils';
import type { Env } from '../types';

export async function handleActiveGameRoutes(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const supabase = getSupabase(env);

    // Get user ID from request (from query param or x-telegram-init-data usually)
    const urlParams = new URLSearchParams(url.search);
    const userId = urlParams.get('userId');

    if (!userId) {
        return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    // GET /api/user/active-game - Check if user has active game
    if (request.method === 'GET' && url.pathname.includes('/active-game')) {
        const { data: user } = await supabase
            .from('users')
            .select('active_game_id, active_game_mode')
            .eq('telegram_id', userId)
            .single();

        return jsonResponse({
            activeGameId: user?.active_game_id || null,
            mode: user?.active_game_mode || null
        });
    }

    // POST /api/user/set-active-game - Set user's active game
    if (request.method === 'POST' && url.pathname.includes('/set-active-game')) {
        const body = await request.json() as { gameId: string; mode: string };

        const { error } = await supabase
            .from('users')
            .update({
                active_game_id: body.gameId,
                active_game_mode: body.mode,
                active_game_updated_at: new Date().toISOString()
            })
            .eq('telegram_id', userId);

        if (error) {
            return jsonResponse({ error: error.message }, 500);
        }

        return jsonResponse({ success: true });
    }

    // POST /api/user/clear-active-game - Clear user's active game
    if (request.method === 'POST' && url.pathname.includes('/clear-active-game')) {
        const { error } = await supabase
            .from('users')
            .update({
                active_game_id: null,
                active_game_mode: null,
                active_game_updated_at: new Date().toISOString()
            })
            .eq('telegram_id', userId);

        if (error) {
            return jsonResponse({ error: error.message }, 500);
        }

        return jsonResponse({ success: true });
    }

    return jsonResponse({ error: 'Not Found' }, 404);
}
