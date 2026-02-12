import type { Env } from '../types';
import { getSupabase, jsonResponse } from '../utils';

export async function handleRewardsRoutes(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/rewards', '').replace('/rewards', '');
    const supabase = getSupabase(env);

    // Fetch active config for reward amounts
    const { data: config } = await supabase!
        .from('game_configs')
        .select('features')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    const configRewards = config?.features?.daily_rewards || [50, 75, 100, 150, 200, 300, 500];

    // GET /api/rewards/daily/check
    if (path === '/daily/check' && request.method === 'GET') {
        const userId = url.searchParams.get('userId');

        if (!userId) {
            return jsonResponse({ error: 'userId required' }, 400);
        }

        const { data: reward } = await supabase!
            .from('daily_rewards')
            .select('*')
            .eq('user_id', userId)
            .single();

        const today = new Date().toISOString().split('T')[0];
        const canClaim = !reward?.last_claim_date || reward.last_claim_date !== today;

        // Calculate streak and day logic
        const streak = reward?.current_streak || 0;
        const lastClaimDate = reward?.last_claim_date;
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        // If they missed a day, streak effectively resets for the UI
        const isStreakActive = lastClaimDate === yesterdayStr || lastClaimDate === today;
        const currentStreak = isStreakActive ? streak : 0;

        // If they can claim, they are on day currentStreak + 1
        const cycleDays = configRewards.length;
        const dayToClaim = canClaim ? (currentStreak % cycleDays) + 1 : (currentStreak % cycleDays || cycleDays);

        return jsonResponse({
            available: canClaim,
            canClaim,
            day: dayToClaim,
            amount: calculateReward(dayToClaim, configRewards),
            streak: currentStreak,
            lastClaimDate: reward?.last_claim_date,
            nextReward: calculateReward(dayToClaim + 1, configRewards),
            allRewards: configRewards
        });
    }

    // POST /api/rewards/daily/claim
    if (path === '/daily/claim' && request.method === 'POST') {
        const { userId } = await request.json();

        const { data: reward } = await supabase!
            .from('daily_rewards')
            .select('*')
            .eq('user_id', userId)
            .single();

        const today = new Date().toISOString().split('T')[0];

        if (reward?.last_claim_date === today) {
            return jsonResponse({ error: 'Already claimed today' }, 400);
        }

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        const newStreak = reward?.last_claim_date === yesterdayStr
            ? (reward.current_streak || 0) + 1
            : 1;

        const rewardAmount = calculateReward(newStreak, configRewards);

        // Update reward record
        await supabase!
            .from('daily_rewards')
            .upsert({
                user_id: userId,
                last_claim_date: today,
                current_streak: newStreak,
                longest_streak: Math.max(newStreak, reward?.longest_streak || 0),
                total_claimed: (reward?.total_claimed || 0) + 1,
                total_rewards: (reward?.total_rewards || 0) + rewardAmount,
            }, { onConflict: 'user_id' });

        // Update user balance
        const { data: user } = await supabase!
            .from('users')
            .select('balance')
            .eq('id', userId)
            .single();

        await supabase!
            .from('users')
            .update({ balance: (user?.balance || 0) + rewardAmount })
            .eq('id', userId);

        return jsonResponse({
            success: true,
            reward: rewardAmount,
            streak: newStreak,
            newBalance: (user?.balance || 0) + rewardAmount,
        });
    }

    return jsonResponse({ error: 'Not found' }, 404);
}

function calculateReward(day: number, rewards: number[]): number {
    return rewards[((day - 1) % rewards.length)];
}
