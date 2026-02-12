import type { Env } from '../types';
import { getSupabase, jsonResponse, corsHeaders } from '../utils';

export async function handlePaymentRoutes(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const supabase = getSupabase(env);

    // GET /api/payments/history - Fetch user's payment history
    if (url.pathname.endsWith('/history') && request.method === 'GET') {
        const userId = url.searchParams.get('user_id');

        if (!userId) {
            return jsonResponse({ success: false, error: 'user_id required' }, 400);
        }

        try {
            const { data: payments, error } = await supabase
                .from('payment_requests')
                .select('*')
                .eq('user_id', parseInt(userId))
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) {
                console.error('Failed to fetch payment history:', error);
                return jsonResponse({ success: false, error: error.message }, 500);
            }

            return jsonResponse({
                success: true,
                transactions: payments || []
            });
        } catch (error) {
            console.error('Payment history error:', error);
            return jsonResponse({ success: false, error: 'Failed to fetch payment history' }, 500);
        }
    }

    // GET /api/payments/stats - Get payment statistics
    if (url.pathname.endsWith('/stats') && request.method === 'GET') {
        const userId = url.searchParams.get('user_id');

        if (!userId) {
            return jsonResponse({ success: false, error: 'user_id required' }, 400);
        }

        try {
            const { data: payments, error } = await supabase
                .from('payment_requests')
                .select('type, amount, status')
                .eq('user_id', parseInt(userId))
                .eq('status', 'approved');

            if (error) {
                console.error('Failed to fetch payment stats:', error);
                return jsonResponse({ success: false, error: error.message }, 500);
            }

            const totalDeposits = payments
                ?.filter(p => p.type === 'deposit')
                .reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;

            const totalWithdrawals = payments
                ?.filter(p => p.type === 'withdraw')
                .reduce((sum, p) => sum + parseFloat(p.amount), 0) || 0;

            return jsonResponse({
                success: true,
                stats: {
                    totalDeposits,
                    totalWithdrawals,
                    netBalance: totalDeposits - totalWithdrawals,
                    transactionCount: payments?.length || 0
                }
            });
        } catch (error) {
            console.error('Payment stats error:', error);
            return jsonResponse({ success: false, error: 'Failed to fetch payment stats' }, 500);
        }
    }

    return jsonResponse({ success: false, error: 'Route not found' }, 404);
}
