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
                version: '3.3.0-game',
                service: 'bingo-game-worker',
                timestamp: new Date().toISOString(),
            });
        }

        // Game routes
        if (url.pathname.startsWith('/game') || url.pathname.startsWith('/api/game')) {
            return handleGameRoutes(request, env);
        }

        // Active game routes (User State)
        if (url.pathname.startsWith('/api/user/active-game') ||
            url.pathname.startsWith('/api/user/set-active-game') ||
            url.pathname.startsWith('/api/user/clear-active-game')) {
            return handleActiveGameRoutes(request, env);
        }

        // WebSocket for game rooms (CRITICAL)
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

    // Add scheduled handler
    async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
        // Potential cleanup logic for stale games
    },
};
