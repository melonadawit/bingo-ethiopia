import { FastifyPluginAsync } from 'fastify';
import { supabase } from '../index.fastify';

const rewardRoutes: FastifyPluginAsync = async (fastify) => {
    // Check daily reward eligibility
    fastify.get('/daily/check', async (request, reply) => {
        try {
            const userId = (request.query as any).userId;

            if (!userId) {
                return reply.code(400).send({ error: 'userId is required' });
            }

            const { data: reward } = await supabase
                .from('daily_rewards')
                .select('*')
                .eq('user_id', userId)
                .single();

            const today = new Date().toISOString().split('T')[0];
            const lastClaim = reward?.last_claim_date;

            const canClaim = !lastClaim || lastClaim !== today;
            const streak = reward?.current_streak || 0;

            return {
                canClaim,
                streak,
                lastClaimDate: lastClaim,
                nextReward: calculateReward(streak + 1),
            };
        } catch (error: any) {
            fastify.log.error(error);
            return reply.code(500).send({ error: error.message });
        }
    });

    // Claim daily reward
    fastify.post('/daily/claim', async (request, reply) => {
        const { userId } = request.body as { userId: string };

        try {
            const { data: reward } = await supabase
                .from('daily_rewards')
                .select('*')
                .eq('user_id', userId)
                .single();

            const today = new Date().toISOString().split('T')[0];
            const lastClaim = reward?.last_claim_date;

            // Check if already claimed today
            if (lastClaim === today) {
                return reply.code(400).send({ error: 'Already claimed today' });
            }

            // Calculate streak
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            const newStreak = lastClaim === yesterdayStr
                ? (reward?.current_streak || 0) + 1
                : 1;

            const rewardAmount = calculateReward(newStreak);

            // Update or insert reward record
            const { error: upsertError } = await supabase
                .from('daily_rewards')
                .upsert({
                    user_id: userId,
                    last_claim_date: today,
                    current_streak: newStreak,
                    longest_streak: Math.max(newStreak, reward?.longest_streak || 0),
                    total_claimed: (reward?.total_claimed || 0) + 1,
                    total_rewards: (reward?.total_rewards || 0) + rewardAmount,
                });

            if (upsertError) throw upsertError;

            // Update user balance
            const { data: user } = await supabase
                .from('users')
                .select('balance')
                .eq('id', userId)
                .single();

            await supabase
                .from('users')
                .update({ balance: (user?.balance || 0) + rewardAmount })
                .eq('id', userId);

            // Record transaction
            await supabase
                .from('transactions')
                .insert({
                    user_id: userId,
                    type: 'daily_reward',
                    amount: rewardAmount,
                    balance_before: user?.balance || 0,
                    balance_after: (user?.balance || 0) + rewardAmount,
                    description: `Daily reward - Day ${newStreak}`,
                });

            return {
                success: true,
                reward: rewardAmount,
                streak: newStreak,
                newBalance: (user?.balance || 0) + rewardAmount,
            };
        } catch (error: any) {
            fastify.log.error(error);
            return reply.code(500).send({ error: error.message });
        }
    });

    // Get reward history
    fastify.get('/daily/history', async (request, reply) => {
        try {
            const userId = (request.query as any).userId;

            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .eq('user_id', userId)
                .eq('type', 'daily_reward')
                .order('created_at', { ascending: false })
                .limit(30);

            if (error) throw error;

            return data || [];
        } catch (error: any) {
            fastify.log.error(error);
            return reply.code(500).send({ error: error.message });
        }
    });
};

// Helper function to calculate reward amount
function calculateReward(day: number): number {
    const rewards = [50, 75, 100, 150, 200, 300, 500]; // 7-day cycle
    const index = ((day - 1) % 7);
    return rewards[index];
}

export default rewardRoutes;
