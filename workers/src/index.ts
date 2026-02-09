import { GameRoom } from './durable-objects/GameRoom';
import { PlayerTracker } from './durable-objects/PlayerTracker';
import { handleGameRoutes } from './routes/game';
import { handleRewardsRoutes } from './routes/rewards';
import { handleTournamentRoutes } from './routes/tournaments';
import { handleEventRoutes } from './routes/events';
import { handleStatsRoutes } from './routes/stats';
import { handleAuthRoutes } from './routes/auth';
import { handleActiveGameRoutes } from './routes/activeGame';
import { handlePaymentRoutes } from './routes/payments';
import { handleBotWebhook } from './bot/webhook';
import type { Env } from './types';
import { corsHeaders, jsonResponse } from './utils';

// Export Durable Objects
export { GameRoom, PlayerTracker };

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);

        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: corsHeaders(),
            });
        }

        // Health check
        if (url.pathname === '/health' || url.pathname === '/') {
            return jsonResponse({
                status: 'ok',
                version: '3.0.0',
                platform: 'cloudflare-workers',
                database: 'supabase',
                timestamp: new Date().toISOString(),
            });
        }

        // Game routes (support both /game and /api/game)
        if (url.pathname.startsWith('/game') || url.pathname.startsWith('/api/game')) {
            return handleGameRoutes(request, env);
        }

        // Rewards routes (support both /rewards and /api/rewards)
        if (url.pathname.startsWith('/rewards') || url.pathname.startsWith('/api/rewards')) {
            return handleRewardsRoutes(request, env);
        }

        // Tournament routes
        if (url.pathname.startsWith('/tournaments') || url.pathname.startsWith('/api/tournaments')) {
            return handleTournamentRoutes(request, env);
        }

        // Event routes
        if (url.pathname.startsWith('/events') || url.pathname.startsWith('/api/events')) {
            return handleEventRoutes(request, env);
        }

        // Stats routes
        if (url.pathname.startsWith('/stats') || url.pathname.startsWith('/api/stats')) {
            return handleStatsRoutes(request, env);
        }

        // Auth routes
        if (url.pathname.startsWith('/auth') || url.pathname.startsWith('/api/auth')) {
            return handleAuthRoutes(request, env);
        }

        // Active game routes
        if (url.pathname.startsWith('/api/user/active-game') ||
            url.pathname.startsWith('/api/user/set-active-game') ||
            url.pathname.startsWith('/api/user/clear-active-game')) {
            return handleActiveGameRoutes(request, env);
        }

        // Payment routes
        if (url.pathname.startsWith('/payments') || url.pathname.startsWith('/api/payments')) {
            return handlePaymentRoutes(request, env);
        }

        // Admin routes (NEW)
        if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/api/admin')) {
            const { handleAdminRequest } = await import('./admin/routes');
            return handleAdminRequest(request, env);
        }

        // --- PUBLIC CONFIG ROUTE ---
        if (url.pathname === '/config/latest') {
            const { getSupabase } = await import('./utils');
            const supabase = getSupabase(env);
            const { data, error } = await supabase!
                .from('game_configs')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error || !data) {
                return jsonResponse({
                    version: 'v0.0.0',
                    rules: { ande_zig: { timer: 30, entry_fee: 10 }, hulet_zig: { timer: 45, entry_fee: 20 }, mulu_zig: { timer: 60, entry_fee: 50 } },
                    features: { chat_enabled: false }
                });
            }

            // HARDEN: Filter stale announcements OR announcements for ended events
            let announcement = data.features?.announcement;
            if (announcement && announcement.enabled) {
                const createdAt = new Date(announcement.created_at || data.updated_at || data.created_at);
                const now = new Date();
                const ageHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

                // 1. Time-based stale check (24h)
                if (ageHours > 24) {
                    announcement = null;
                } else if (announcement.action_url) {
                    const actionUrl = announcement.action_url.toLowerCase();

                    // 2. Logic-based check if announcement is tied to an event/tournament
                    if (actionUrl.includes('/tournaments')) {
                        const tid = announcement.action_url.split(/\/tournaments\//i)[1]?.split(/[?#/]/)[0];
                        if (tid && tid.length > 20) {
                            const { data: t } = await supabase!.from('public_tournaments_view').select('is_strictly_active').eq('id', tid).single();
                            if (!t || !t.is_strictly_active) announcement = null;
                        } else {
                            const { data: t } = await supabase!.from('public_tournaments_view').select('id').eq('is_strictly_active', true).limit(1);
                            if (!t || t.length === 0) announcement = null;
                        }
                    } else if (actionUrl.includes('/events') || actionUrl.includes('/special-events')) {
                        const eid = announcement.action_url.split(/\/events\/|\/special-events\//i)[1]?.split(/[?#/]/)[0];
                        if (eid && eid.length > 20) {
                            const { data: events } = await supabase!.rpc('get_public_events');
                            const e = (events || []).find((x: any) => x.id === eid);
                            if (!e || !e.is_strictly_active) announcement = null;
                        } else {
                            const { data: events } = await supabase!.rpc('get_public_events');
                            const active = (events || []).filter((e: any) => e.is_strictly_active);
                            if (active.length === 0) announcement = null;
                        }
                    }
                }
            } else if (announcement && !announcement.enabled) {
                announcement = null;
            }

            return jsonResponse({
                ...data,
                features: {
                    ...data.features,
                    announcement
                }
            });
        }

        // Bot webhook
        if (url.pathname === '/bot/webhook') {
            return handleBotWebhook(request, env);
        }

        // Update menu button endpoint
        if (url.pathname === '/bot/update-menu' && request.method === 'POST') {
            const { updateBotMenuButton } = await import('./bot/webhook');
            return updateBotMenuButton(env);
        }

        // WebSocket for game rooms
        if (url.pathname.startsWith('/ws/game/')) {
            const gameId = url.pathname.split('/').pop();
            console.log(`[EDGE] WebSocket connection attempt for gameId: ${gameId}`);

            if (!gameId) {
                console.error('[EDGE] Missing gameId in WebSocket URL');
                return jsonResponse({ error: 'Game ID required' }, 400);
            }

            // Get Durable Object instance
            try {
                const id = env.GAME_ROOM.idFromName(gameId);
                const stub = env.GAME_ROOM.get(id);

                console.log(`[EDGE] Forwarding WebSocket request to DO: ${id.toString()}`);

                // Forward request to Durable Object
                return stub.fetch(request);
            } catch (error) {
                console.error(`[EDGE] Error forwarding to DO:`, error);
                return jsonResponse({ error: 'Internal Server Error' }, 500);
            }
        }

        return jsonResponse({ error: 'Not found' }, 404);
    },

    // Add scheduled handler to silence errors
    async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
        // We can add cron jobs here later (e.g., clearing old games)
        // For now, just logging to confirm it runs
        // console.log('Scheduled event triggered');
    },
};
