// Telegram Web App authentication and user sync
import type { Env } from '../types';
import { getSupabase } from '../utils';
import { jsonResponse } from '../utils';

export async function handleAuthRoutes(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const supabase = getSupabase(env);

    // POST /auth/telegram - Sync Telegram user with database
    if (url.pathname === '/auth/telegram' && request.method === 'POST') {
        console.log('🔍 AUTH ENDPOINT CALLED');
        console.log('================================');

        const body = await request.json() as any;
        const { initData } = body;

        console.log('1. Request body:', JSON.stringify(body));
        console.log('2. initData exists?', !!initData);
        console.log('3. initData type:', typeof initData);
        console.log('4. initData length:', initData?.length || 0);
        console.log('5. initData content:', initData);
        console.log('================================');

        if (!initData) {
            console.log('❌ MISSING initData - returning 400');
            return jsonResponse({ error: 'Missing initData' }, 400);
        }

        // Parse Telegram WebApp initData
        const params = new URLSearchParams(initData);
        const userDataStr = params.get('user');

        console.log('6. Parsed params:', Array.from(params.entries()));
        console.log('7. User string from params:', userDataStr);

        if (!userDataStr) {
            console.log('❌ NO USER in initData - returning 400');
            return jsonResponse({ error: 'No user data in initData' }, 400);
        }

        let telegramUser;
        try {
            telegramUser = JSON.parse(userDataStr);
            console.log('✅ Parsed Telegram user:', telegramUser);
        } catch (e) {
            console.log('❌ Failed to parse user JSON:', e);
            return jsonResponse({ error: 'Invalid user data' }, 400);
        }

        const telegramId = telegramUser.id;
        const username = telegramUser.username || '';
        const firstName = telegramUser.first_name || '';
        const lastName = telegramUser.last_name || '';

        // Get or create user in database
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('telegram_id', telegramId)
            .maybeSingle();

        if (error) {
            console.error('User lookup error:', error);
            return jsonResponse({ error: 'Database error' }, 500);
        }

        // If user exists and is registered, return their data
        if (user && user.is_registered) {
            return jsonResponse({
                user: {
                    id: user.id,
                    telegram_id: user.telegram_id,
                    username: user.username || username,
                    firstName: user.first_name || firstName,
                    phone_number: user.phone_number,
                    balance: parseFloat(user.balance || '0'),
                    referral_code: user.referral_code,
                    is_registered: user.is_registered
                },
                token: `telegram-${telegramId}-${Date.now()}`
            });
        }

        // User not registered - return minimal data from Telegram
        return jsonResponse({
            user: {
                telegram_id: telegramId,
                username: username || 'Player',
                firstName: firstName || 'Player',
                balance: 0,
                is_registered: false
            },
            token: null,
            message: 'Please register via Telegram bot first'
        });
    }

    // GET /auth/user/:telegramId - Get user data
    const userMatch = url.pathname.match(/^\/auth\/user\/(\d+)$/);
    if (userMatch && request.method === 'GET') {
        const telegramId = parseInt(userMatch[1]);

        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('telegram_id', telegramId)
            .maybeSingle();

        if (error || !user) {
            return jsonResponse({ error: 'User not found' }, 404);
        }

        return jsonResponse({
            user: {
                id: user.id,
                telegram_id: user.telegram_id,
                username: user.username,
                firstName: user.first_name,
                balance: parseFloat(user.balance),
                referral_code: user.referral_code,
                referral_count: user.referral_count,
                referral_earnings: parseFloat(user.referral_earnings || 0),
                daily_streak: user.daily_streak,
                total_games_played: user.total_games_played,
                total_wins: user.total_wins,
                total_winnings: parseFloat(user.total_winnings || 0),
                is_registered: user.is_registered
            }
        });
    }

    return jsonResponse({ error: 'Not found' }, 404);
}
