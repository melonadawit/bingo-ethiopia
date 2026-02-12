import type { Env } from '../types';
import { getSupabase } from '../utils';

export async function handleActiveGameRoutes(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const supabase = getSupabase(env);

    // Get user ID from request (you'll need to add auth middleware)
    const userId = url.searchParams.get('userId'); // Temporary - should come from auth

    if (!userId) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // GET /api/user/active-game - Check if user has active game
    if (request.method === 'GET' && url.pathname === '/api/user/active-game') {
        const { data: user } = await supabase
            .from('users')
            .select('active_game_id, active_game_mode')
            .eq('telegram_id', userId)
            .single();

        return new Response(JSON.stringify({
            activeGameId: user?.active_game_id || null,
            mode: user?.active_game_mode || null
        }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // POST /api/user/set-active-game - Set user's active game
    if (request.method === 'POST' && url.pathname === '/api/user/set-active-game') {
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
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }

    // POST /api/user/clear-active-game - Clear user's active game
    if (request.method === 'POST' && url.pathname === '/api/user/clear-active-game') {
        const { error } = await supabase
            .from('users')
            .update({
                active_game_id: null,
                active_game_mode: null,
                active_game_updated_at: new Date().toISOString()
            })
            .eq('telegram_id', userId);

        if (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
        });
    }

    return new Response('Not Found', { status: 404 });
}
