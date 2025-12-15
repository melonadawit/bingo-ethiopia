import { FastifyPluginAsync } from 'fastify';
import { supabase } from '../index.fastify';

const walletRoutes: FastifyPluginAsync = async (fastify) => {
    // Get user balance
    fastify.get('/balance', async (request, reply) => {
        try {
            const userId = (request.query as any).userId;

            if (!userId) {
                return reply.code(400).send({ error: 'userId is required' });
            }

            const { data: user, error } = await supabase
                .from('users')
                .select('balance')
                .eq('id', userId)
                .single();

            if (error) throw error;

            return { balance: user?.balance || 0 };
        } catch (error: any) {
            fastify.log.error(error);
            return reply.code(500).send({ error: error.message });
        }
    });

    // Deposit funds
    fastify.post('/deposit', async (request, reply) => {
        const { userId, amount } = request.body as { userId: string; amount: number };

        try {
            if (!userId || !amount || amount <= 0) {
                return reply.code(400).send({ error: 'Invalid request' });
            }

            const { data: user } = await supabase
                .from('users')
                .select('balance')
                .eq('id', userId)
                .single();

            const oldBalance = user?.balance || 0;
            const newBalance = oldBalance + amount;

            // Update balance
            await supabase
                .from('users')
                .update({ balance: newBalance })
                .eq('id', userId);

            // Record transaction
            await supabase
                .from('transactions')
                .insert({
                    user_id: userId,
                    type: 'deposit',
                    amount,
                    balance_before: oldBalance,
                    balance_after: newBalance,
                    description: 'Deposit',
                });

            return {
                success: true,
                balance: newBalance,
                amount,
            };
        } catch (error: any) {
            fastify.log.error(error);
            return reply.code(500).send({ error: error.message });
        }
    });

    // Withdraw funds
    fastify.post('/withdraw', async (request, reply) => {
        const { userId, amount } = request.body as { userId: string; amount: number };

        try {
            if (!userId || !amount || amount <= 0) {
                return reply.code(400).send({ error: 'Invalid request' });
            }

            const { data: user } = await supabase
                .from('users')
                .select('balance')
                .eq('id', userId)
                .single();

            const oldBalance = user?.balance || 0;

            if (oldBalance < amount) {
                return reply.code(400).send({ error: 'Insufficient balance' });
            }

            const newBalance = oldBalance - amount;

            // Update balance
            await supabase
                .from('users')
                .update({ balance: newBalance })
                .eq('id', userId);

            // Record transaction
            await supabase
                .from('transactions')
                .insert({
                    user_id: userId,
                    type: 'withdraw',
                    amount,
                    balance_before: oldBalance,
                    balance_after: newBalance,
                    description: 'Withdrawal',
                });

            return {
                success: true,
                balance: newBalance,
                amount,
            };
        } catch (error: any) {
            fastify.log.error(error);
            return reply.code(500).send({ error: error.message });
        }
    });

    // Get transaction history
    fastify.get('/transactions', async (request, reply) => {
        try {
            const userId = (request.query as any).userId;
            const limit = parseInt((request.query as any).limit || '50');

            if (!userId) {
                return reply.code(400).send({ error: 'userId is required' });
            }

            const { data, error } = await supabase
                .from('transactions')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

            return data || [];
        } catch (error: any) {
            fastify.log.error(error);
            return reply.code(500).send({ error: error.message });
        }
    });
};

export default walletRoutes;
