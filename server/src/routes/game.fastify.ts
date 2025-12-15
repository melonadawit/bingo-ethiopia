import { FastifyPluginAsync } from 'fastify';
import { supabase } from '../index.fastify';

const gameRoutes: FastifyPluginAsync = async (fastify) => {
    // Get game modes
    fastify.get('/modes', async (request, reply) => {
        try {
            const { data, error } = await supabase
                .from('game_modes')
                .select('*')
                .eq('is_active', true)
                .order('min_bet', { ascending: true });

            if (error) throw error;

            return data || [];
        } catch (error: any) {
            fastify.log.error(error);
            return reply.code(500).send({ error: error.message });
        }
    });

    // Get global stats
    fastify.get('/stats', async (request, reply) => {
        try {
            // Get total players
            const { count: totalPlayers } = await supabase
                .from('users')
                .select('*', { count: 'exact', head: true });

            // Get active games
            const { count: activeGames } = await supabase
                .from('games')
                .select('*', { count: 'exact', head: true })
                .in('status', ['waiting', 'active']);

            // Calculate jackpot pool
            const { data: games } = await supabase
                .from('games')
                .select('prize_pool')
                .eq('status', 'active');

            const jackpotPool = games?.reduce((sum, game) => sum + Number(game.prize_pool), 0) || 0;

            return {
                totalPlayers: totalPlayers || 0,
                onlinePlayers: activeGames || 0,
                jackpotPool,
                isSystemLive: true,
            };
        } catch (error: any) {
            fastify.log.error(error);
            return reply.code(500).send({ error: error.message });
        }
    });

    // Create game
    fastify.post('/create', {
        schema: {
            body: {
                type: 'object',
                required: ['mode', 'userId'],
                properties: {
                    mode: { type: 'string' },
                    userId: { type: 'string' },
                },
            },
        },
    }, async (request, reply) => {
        const { mode, userId } = request.body as { mode: string; userId: string };

        try {
            // Get mode details
            const { data: modeData } = await supabase
                .from('game_modes')
                .select('*')
                .eq('id', mode)
                .single();

            if (!modeData) {
                return reply.code(404).send({ error: 'Game mode not found' });
            }

            // Create game
            const { data: game, error } = await supabase
                .from('games')
                .insert({
                    mode,
                    entry_fee: modeData.min_bet,
                    prize_pool: 0,
                    status: 'waiting',
                })
                .select()
                .single();

            if (error) throw error;

            return { success: true, gameId: game.id };
        } catch (error: any) {
            fastify.log.error(error);
            return reply.code(500).send({ error: error.message });
        }
    });
};

export default gameRoutes;
