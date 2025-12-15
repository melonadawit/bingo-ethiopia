import { GameRoom } from './durable-objects/GameRoom';
import { handleGameRoutes } from './routes/game';
import { handleRewardsRoutes } from './routes/rewards';
import { handleBotWebhook } from './bot/webhook';
import type { Env } from './types';
import { corsHeaders, jsonResponse } from './utils';

// Export Durable Object
export { GameRoom };

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

        // Game routes
        if (url.pathname.startsWith('/api/game')) {
            return handleGameRoutes(request, env);
        }

        // Rewards routes
        if (url.pathname.startsWith('/api/rewards')) {
            return handleRewardsRoutes(request, env);
        }

        // Bot webhook
        if (url.pathname === '/bot/webhook') {
            return handleBotWebhook(request, env);
        }

        // WebSocket for game rooms
        if (url.pathname.startsWith('/ws/game/')) {
            const gameId = url.pathname.split('/').pop();

            if (!gameId) {
                return jsonResponse({ error: 'Game ID required' }, 400);
            }

            // Get Durable Object instance
            const id = env.GAME_ROOM.idFromName(gameId);
            const stub = env.GAME_ROOM.get(id);

            // Forward request to Durable Object
            return stub.fetch(request);
        }

        return jsonResponse({ error: 'Not found' }, 404);
    },
};
