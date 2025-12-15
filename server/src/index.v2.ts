import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Fastify
const fastify = Fastify({
    logger: {
        level: process.env.LOG_LEVEL || 'info',
        transport: {
            target: 'pino-pretty',
            options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
            },
        },
    },
    trustProxy: true,
});

// Initialize Supabase client
export const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

// Register plugins
async function registerPlugins() {
    // CORS
    await fastify.register(cors, {
        origin: process.env.CORS_ORIGIN || '*',
        credentials: true,
    });

    // WebSocket
    await fastify.register(websocket);
}

// Register routes
async function registerRoutes() {
    // Health check
    fastify.get('/health', async () => ({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
    }));

    // Import and register route modules
    const gameRoutes = await import('./routes/game');
    const rewardRoutes = await import('./routes/rewards');
    const leaderboardRoutes = await import('./routes/leaderboard');
    const walletRoutes = await import('./routes/wallet');

    await fastify.register(gameRoutes.default, { prefix: '/api/game' });
    await fastify.register(rewardRoutes.default, { prefix: '/api/rewards' });
    await fastify.register(leaderboardRoutes.default, { prefix: '/api/leaderboard' });
    await fastify.register(walletRoutes.default, { prefix: '/api/wallet' });

    // WebSocket routes
    const wsRoutes = await import('./routes/websocket');
    await fastify.register(wsRoutes.default);
}

// Start server
async function start() {
    try {
        await registerPlugins();
        await registerRoutes();

        const PORT = parseInt(process.env.PORT || '3000', 10);
        const HOST = process.env.HOST || '0.0.0.0';

        await fastify.listen({ port: PORT, host: HOST });

        fastify.log.info(`🚀 Fastify V2 server running on ${HOST}:${PORT}`);
        fastify.log.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);

        // Initialize Telegram bot (keep existing bot)
        if (process.env.BOT_TOKEN) {
            const { initializeBot } = await import('./bot/index');
            await initializeBot();
            fastify.log.info('✅ Telegram bot initialized');
        }
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
}

// Graceful shutdown
process.on('SIGINT', async () => {
    fastify.log.info('Shutting down gracefully...');
    await fastify.close();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    fastify.log.info('Shutting down gracefully...');
    await fastify.close();
    process.exit(0);
});

start();
