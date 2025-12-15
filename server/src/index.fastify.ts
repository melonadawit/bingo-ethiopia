import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Fastify with logging
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

// Initialize Supabase client (export for use in routes)
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

    // WebSocket support
    await fastify.register(websocket);
}

// Register routes
async function registerRoutes() {
    // Health check
    fastify.get('/health', async () => ({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        database: 'supabase',
    }));

    // Test Supabase connection
    fastify.get('/api/test', async (request, reply) => {
        try {
            const { data, error } = await supabase
                .from('game_modes')
                .select('*')
                .limit(1);

            if (error) throw error;

            return {
                success: true,
                message: 'Supabase connected',
                sample: data,
            };
        } catch (error: any) {
            return reply.code(500).send({
                success: false,
                error: error.message,
            });
        }
    });

    // Import route modules
    const gameRoutes = await import('./routes/game.fastify');
    const rewardRoutes = await import('./routes/rewards.fastify');
    const leaderboardRoutes = await import('./routes/leaderboard.fastify');
    const walletRoutes = await import('./routes/wallet.fastify');
    const websocketRoutes = await import('./routes/websocket.fastify');

    // Register routes
    await fastify.register(gameRoutes.default, { prefix: '/api/game' });
    await fastify.register(rewardRoutes.default, { prefix: '/api/rewards' });
    await fastify.register(leaderboardRoutes.default, { prefix: '/api/leaderboard' });
    await fastify.register(walletRoutes.default, { prefix: '/api/wallet' });

    // Register WebSocket routes
    await fastify.register(websocketRoutes.default, { prefix: '/ws' });
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
        fastify.log.info(`🗄️  Database: Supabase PostgreSQL`);

        // Initialize Telegram bot (keep existing bot)
        if (process.env.BOT_TOKEN) {
            try {
                const { initializeBot } = await import('./bot/index');
                await initializeBot();
                fastify.log.info('✅ Telegram bot initialized');
            } catch (error) {
                fastify.log.error('❌ Failed to initialize bot:', error);
            }
        }
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
}

// Graceful shutdown
const shutdown = async () => {
    fastify.log.info('Shutting down gracefully...');
    await fastify.close();
    process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    fastify.log.error('🚨 UNCAUGHT EXCEPTION:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    fastify.log.error('🚨 UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

start();
