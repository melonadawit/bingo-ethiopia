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
            .order('end_time', { ascending: true });

        if (error) {
            return jsonResponse({ error: error.message }, 500);
        }

        const now = new Date();

        // Transform data to match client interface
        const tournaments = (data || []).map((t: any) => {
            const startTime = new Date(t.start_time);
            const endTime = new Date(t.end_time);
            const isActive = t.status === 'active' && now >= startTime && now <= endTime;

            return {
                id: t.id,
                name: t.title, // Map title -> name
                type: 'tournament',
                end_date: t.end_time,
                start_date: t.start_time,
                participant_count: 0,
                prize_pool: t.prize_pool,
                entry_fee: t.entry_fee,
                description: t.description,
                status: t.status,
                is_active: isActive
            };
        });

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

        // Check tournament exists and is active
        const { data: tournament } = await supabase
            .from('tournaments')
            .select('*')
            .eq('id', tournamentId)
            .in('status', ['active', 'scheduled'])
            .single();

        if (!tournament) {
            return jsonResponse({ error: 'Tournament not found or not active' }, 404);
        }

        // STRICT TIME CHECK
        const now = new Date();
        const startTime = new Date(tournament.start_time);
        const endTime = new Date(tournament.end_time);

        if (now < startTime) {
            return jsonResponse({ error: 'Tournament has not started yet' }, 403);
        }
        if (now > endTime) {
            return jsonResponse({ error: 'Tournament has already ended' }, 403);
        }
        if (tournament.status !== 'active') {
            return jsonResponse({ error: 'Tournament is not in active state' }, 403);
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

    return jsonResponse({ error: 'Not found' }, 404);
}
