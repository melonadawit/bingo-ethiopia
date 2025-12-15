import { FastifyPluginAsync } from 'fastify';
import { supabase } from '../index.fastify';

const leaderboardRoutes: FastifyPluginAsync = async (fastify) => {
    // Get leaderboard by period
    fastify.get('/:period', async (request, reply) => {
        try {
            const { period } = request.params as { period: string };

            if (!['daily', 'weekly', 'monthly'].includes(period)) {
                return reply.code(400).send({ error: 'Invalid period' });
            }

            // Get current period dates
            const { start, end } = getPeriodDates(period);

            const { data, error } = await supabase
                .from('leaderboard_entries')
                .select(`
          *,
          users:user_id (
            username,
            telegram_id
          )
        `)
                .eq('period', period)
                .eq('period_start', start)
                .order('rank', { ascending: true })
                .limit(100);

            if (error) throw error;

            return data || [];
        } catch (error: any) {
            fastify.log.error(error);
            return reply.code(500).send({ error: error.message });
        }
    });

    // Get user stats
    fastify.get('/user/:userId', async (request, reply) => {
        try {
            const { userId } = request.params as { userId: string };

            const { data: user } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();

            if (!user) {
                return reply.code(404).send({ error: 'User not found' });
            }

            // Get user's leaderboard entries
            const { data: entries } = await supabase
                .from('leaderboard_entries')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(10);

            return {
                user: {
                    id: user.id,
                    username: user.username,
                    totalGames: user.total_games_played,
                    totalWins: user.total_wins,
                    totalWinnings: user.total_winnings,
                    winRate: user.total_games_played > 0
                        ? (user.total_wins / user.total_games_played * 100).toFixed(2)
                        : 0,
                },
                recentEntries: entries || [],
            };
        } catch (error: any) {
            fastify.log.error(error);
            return reply.code(500).send({ error: error.message });
        }
    });

    // Get user rank for a period
    fastify.get('/rank/:period', async (request, reply) => {
        try {
            const { period } = request.params as { period: string };
            const userId = (request.query as any).userId;

            if (!userId) {
                return reply.code(400).send({ error: 'userId is required' });
            }

            const { start } = getPeriodDates(period);

            const { data, error } = await supabase
                .from('leaderboard_entries')
                .select('rank, wins, games_played, total_winnings')
                .eq('user_id', userId)
                .eq('period', period)
                .eq('period_start', start)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            return data || { rank: null, wins: 0, games_played: 0, total_winnings: 0 };
        } catch (error: any) {
            fastify.log.error(error);
            return reply.code(500).send({ error: error.message });
        }
    });
};

// Helper function to get period dates
function getPeriodDates(period: string): { start: string; end: string } {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (period) {
        case 'daily':
            start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            end = new Date(start);
            end.setDate(end.getDate() + 1);
            break;
        case 'weekly':
            const day = now.getDay();
            start = new Date(now);
            start.setDate(now.getDate() - day);
            start.setHours(0, 0, 0, 0);
            end = new Date(start);
            end.setDate(end.getDate() + 7);
            break;
        case 'monthly':
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
            break;
        default:
            start = now;
            end = now;
    }

    return {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
    };
}

export default leaderboardRoutes;
