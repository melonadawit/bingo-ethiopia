// Tournament routes for Cloudflare Workers
import type { Env } from '../types';
import { getSupabase } from '../utils';
import { jsonResponse } from '../utils';

export async function handleTournamentRoutes(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const supabase = getSupabase(env);

    // GET /tournaments/active
    if (url.pathname === '/tournaments/active' && request.method === 'GET') {
        const { data, error } = await supabase
            .from('public_tournaments_view')
            .select('*')
            .order('end_date', { ascending: true });

        if (error) {
            return jsonResponse({ error: error.message }, 500);
        }

        const now = new Date();

        // Transform data to match client interface
        const tournaments = (data || []).map((t: any) => ({
            ...t,
            name: t.title, // Standardized mapping
            is_active: t.is_strictly_active
        }));

        return jsonResponse({ tournaments });
    }

    // POST /tournaments/join
    if (url.pathname === '/tournaments/join' && request.method === 'POST') {
        const { tournamentId, userId } = await request.json() as { tournamentId: string, userId: string };

        if (!tournamentId || !userId) {
            return jsonResponse({ error: 'Missing tournamentId or userId' }, 400);
        }

        // Check if already joined
        const { data: existing } = await supabase
            .from('tournament_participants')
            .select('*')
            .eq('tournament_id', tournamentId)
            .eq('user_id', userId)
            .single();

        if (existing) {
            return jsonResponse({ error: 'Already joined this tournament' }, 400);
        }

        // Check tournament exists and is strictly active
        const { data: tournament } = await supabase
            .from('public_tournaments_view')
            .select('*')
            .eq('id', tournamentId)
            .single();

        if (!tournament) {
            return jsonResponse({ error: 'Tournament not found or not joinable' }, 404);
        }

        // STRICT TIME CHECK using server flag
        if (tournament.is_strictly_active === false) {
            return jsonResponse({ error: 'Tournament is not joinable at this time' }, 403);
        }

        // BACKUP: Manual time check if flag is missing or null
        if (tournament.is_strictly_active === undefined || tournament.is_strictly_active === null) {
            const now = new Date();
            const startsAt = new Date(tournament.start_time);
            const endsAt = new Date(tournament.end_time);
            if (tournament.status !== 'active' || now < startsAt || now > endsAt) {
                return jsonResponse({ error: 'Tournament is not joinable (manual check)' }, 403);
            }
        }

        // Join tournament
        const { data, error } = await supabase
            .from('tournament_participants')
            .insert({
                tournament_id: tournamentId,
                user_id: userId
            })
            .select()
            .single();

        if (error) {
            return jsonResponse({ error: error.message }, 500);
        }

        // Update ranks
        await supabase.rpc('update_tournament_ranks', { tournament_uuid: tournamentId });

        return jsonResponse({ success: true, participant: data });
    }

    // GET /tournaments/:id/leaderboard
    const leaderboardMatch = url.pathname.match(/^\/tournaments\/([^\/]+)\/leaderboard$/);
    if (leaderboardMatch && request.method === 'GET') {
        const tournamentId = leaderboardMatch[1];
        const limit = parseInt(url.searchParams.get('limit') || '10');
        const userId = url.searchParams.get('userId');

        const { data, error } = await supabase
            .rpc('get_tournament_leaderboard', {
                tournament_uuid: tournamentId,
                limit_count: limit
            });

        if (error) {
            return jsonResponse({ error: error.message }, 500);
        }

        // Get user's rank if userId provided
        let myRank = null;
        if (userId) {
            const { data: myData } = await supabase
                .from('tournament_participants')
                .select('rank')
                .eq('tournament_id', tournamentId)
                .eq('user_id', parseInt(userId))
                .single();

            myRank = myData?.rank || null;
        }

        return jsonResponse({
            leaderboard: data || [],
            myRank
        });
    }

    // GET /tournaments/my
    if (url.pathname === '/tournaments/my' && request.method === 'GET') {
        const userId = url.searchParams.get('userId');

        if (!userId) {
            return jsonResponse({ error: 'Missing userId' }, 400);
        }

        const { data, error } = await supabase
            .from('tournament_participants')
            .select(`
                *,
                tournament:tournaments(*)
            `)
            .eq('user_id', parseInt(userId));

        if (error) {
            return jsonResponse({ error: error.message }, 500);
        }

        return jsonResponse({ tournaments: data || [] });
    }

    // PATCH /tournaments/:id
    const tournamentMatch = url.pathname.match(/^\/tournaments\/([^\/]+)$/);
    if (tournamentMatch && request.method === 'PATCH') {
        const tournamentId = tournamentMatch[1];
        const body = await request.json() as any;

        const { data, error } = await supabase
            .from('tournaments')
            .update({
                status: body.status,
                end_time: body.end_time,
                updated_at: new Date().toISOString()
            })
            .eq('id', tournamentId)
            .select()
            .single();

        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ success: true, tournament: data });
    }

    // DELETE /tournaments/:id
    if (tournamentMatch && request.method === 'DELETE') {
        const tournamentId = tournamentMatch[1];
        const { error } = await supabase
            .from('tournaments')
            .delete()
            .eq('id', tournamentId);

        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ success: true });
    }

    return jsonResponse({ error: 'Not found' }, 404);
}
