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
