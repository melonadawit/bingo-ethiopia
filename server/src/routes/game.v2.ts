import { FastifyPluginAsync } from 'fastify';
import { supabase } from '../index.v2';

const gameRoutes: FastifyPluginAsync = async (fastify) => {
    // Get game modes
    fastify.get('/modes', async (request, reply) => {
        try {
            const { data, error } = await supabase
                .from('game_modes')
                .select('*')
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

    // Join game
    fastify.post('/join', {
        schema: {
            body: {
                type: 'object',
                required: ['gameId', 'userId', 'cardId'],
                properties: {
                    gameId: { type: 'string' },
                    userId: { type: 'string' },
                    cardId: { type: 'number' },
                },
            },
        },
    }, async (request, reply) => {
        const { gameId, userId, cardId } = request.body as {
            gameId: string;
            userId: string;
            cardId: number;
        };

        try {
            // Check if game exists and is joinable
            const { data: game } = await supabase
                .from('games')
                .select('*, game_players(count)')
                .eq('id', gameId)
                .eq('status', 'waiting')
                .single();

            if (!game) {
                return reply.code(404).send({ error: 'Game not found or already started' });
            }

            // Check if game is full (max 10 players)
            const playerCount = game.game_players[0]?.count || 0;
            if (playerCount >= 10) {
                return reply.code(400).send({ error: 'Game is full' });
            }

            // Check user balance
            const { data: user } = await supabase
                .from('users')
                .select('balance')
                .eq('id', userId)
                .single();

            if (!user || user.balance < game.entry_fee) {
                return reply.code(400).send({ error: 'Insufficient balance' });
            }

            // Generate card data (you'll implement this)
            const cardData = generateBingoCard();

            // Add player to game
            const { error } = await supabase
                .from('game_players')
                .insert({
                    game_id: gameId,
                    user_id: userId,
                    card_id: cardId,
                    card_data: cardData,
                });

            if (error) throw error;

            // Deduct entry fee
            await supabase
                .from('users')
                .update({ balance: user.balance - game.entry_fee })
                .eq('id', userId);

            // Update prize pool
            await supabase
                .from('games')
                .update({ prize_pool: game.prize_pool + game.entry_fee })
                .eq('id', gameId);

            return { success: true, card: cardData };
        } catch (error: any) {
            fastify.log.error(error);
            return reply.code(500).send({ error: error.message });
        }
    });
};

// Helper function to generate bingo card
function generateBingoCard(): number[][] {
    const card: number[][] = [];
    const ranges = [
        [1, 15],   // B
        [16, 30],  // I
        [31, 45],  // N
        [46, 60],  // G
        [61, 75],  // O
    ];

    for (let col = 0; col < 5; col++) {
        const column: number[] = [];
        const [min, max] = ranges[col];
        const available = Array.from({ length: max - min + 1 }, (_, i) => min + i);

        for (let row = 0; row < 5; row++) {
            if (col === 2 && row === 2) {
                column.push(0); // Free space
            } else {
                const index = Math.floor(Math.random() * available.length);
                column.push(available.splice(index, 1)[0]);
            }
        }
        card.push(column);
    }

    return card;
}

export default gameRoutes;
