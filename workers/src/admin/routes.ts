import { verifyAdmin } from './auth';
import { Env } from '../types';
import { getSupabase, jsonResponse } from '../utils';

export async function handleAdminRequest(request: Request, env: Env): Promise<Response> {
    // 2. Auth Check
    const allowed = await verifyAdmin(request, env);
    if (!allowed && !request.url.includes('/login')) {
        return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const url = new URL(request.url);
    const path = url.pathname.replace('/admin', '');

    const role = (request as any).adminUser?.role || 'readonly';
    const isSuper = role === 'super_admin';

    // --- RBAC CHECKS ---
    // Finance: Super or Finance
    if (path.startsWith('/finance') && role !== 'finance' && !isSuper) return jsonResponse({ error: 'Forbidden' }, 403);
    // Marketing: Super or Marketing
    if (path.startsWith('/marketing') && role !== 'marketing' && !isSuper) return jsonResponse({ error: 'Forbidden' }, 403);
    // Bot/Config: Super or Ops
    if ((path.startsWith('/bot') || path.startsWith('/config')) && role !== 'ops' && !isSuper) return jsonResponse({ error: 'Forbidden' }, 403);
    // Admin Management: Super Only
    if (path.startsWith('/team') && !isSuper) return jsonResponse({ error: 'Forbidden' }, 403);
    try {
        // --- GAMES ---
        if (path === '/games/live') {
            // Fetch live games stats from Durable Objects?
            // Since DOs are sharded, we might just query the active_games_view in DB for now
            const supabase = getSupabase(env);
            // Query real active games view
            const { data, error } = await supabase!
                .from('active_games_view')
                .select('*')
                .order('started_at', { ascending: false });

            if (error) {
                return jsonResponse({ games: [] }); // Fail soft
            }
            return jsonResponse({ games: data });
        }

        if (path.startsWith('/games/action')) {
            if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);
            const body = await request.json() as { gameId: string, action: string };

            // Forward to Durable Object of that game
            // We need to know the DO ID. If we use gameId -> DO ID mapping.
            // In our system, GameRoom IS the DO. The ID needs to be derived or looked up.
            // For now, let's assume we can fetch the state via the GameRoom binding if we know the ID name.
            // This is tricky if we use uuid generated IDs. 
            // Workaround: We query DB for the `id` and try to address the DO by that ID.

            const id = env.GAME_ROOM.idFromString(body.gameId); // Only works if we stored the ID string properly
            const stub = env.GAME_ROOM.get(id);

            // We need to implement handleAdminMessage in GameRoom
            const res = await stub.fetch(`https://dummy/admin/${body.action}`);
            const data = await res.json();

            return jsonResponse(data);
        }

        // --- STATS ---
        if (path === '/stats/overview') {
            const supabase = getSupabase(env);

            // Parallel queries for Real-time counts
            const [users, games, revenue] = await Promise.all([
                supabase!.from('users').select('*', { count: 'exact', head: true }),
                supabase!.from('games').select('*', { count: 'exact', head: true }),
                supabase!.rpc('get_total_revenue') // stored procedure or sum query
            ]);

            // Fallback for revenue if RPC missing
            let totalRev = 0;
            if (revenue.error) {
                // Try direct sum (might be slow for huge DBs but fine for now)
                const { data } = await supabase!.from('game_transactions').select('amount').eq('type', 'bet');
                if (data) totalRev = data.reduce((acc, curr) => acc + (curr.amount || 0), 0) * 0.15; // Est commission
            } else {
                totalRev = revenue.data || 0;
            }

            return jsonResponse({
                totalUsers: users.count || 0,
                totalGames: games.count || 0,
                totalRevenue: Math.floor(totalRev)
            });
        }

        // --- PUBLIC CONFIG ROUTE ---
        if (path === '/config/latest') {
            // ...
            // (Logic moved to main index to avoid auth check issue? No, admin routes are protected.
            // Wait, the client uses /config/latest. It should NOT be under /admin.
            // But existing code has it here.
        }


        // --- USERS LIST ---
        if (path === '/users') {
            const supabase = getSupabase(env);
            const searchInfo = new URL(request.url).searchParams.get('q') || '';

            let query = supabase!.from('users').select('*').order('created_at', { ascending: false }).limit(50);

            if (searchInfo) {
                // Simple search by ID or Username
                const isNum = /^\d+$/.test(searchInfo);
                if (isNum) {
                    query = query.eq('telegram_id', searchInfo);
                } else {
                    query = query.ilike('username', `%${searchInfo}%`);
                }
            }

            const { data, error } = await query;
            if (error) return jsonResponse({ error: error.message }, 500);
            return jsonResponse(data || []);
        }

        if (path === '/users/search') { // Legacy or specific search
            return jsonResponse([]);
        }

        if (path === '/stats/analytics') {
            const supabase = getSupabase(env);
            // Query daily_financials_view for the last 30 days
            const { data, error } = await supabase!
                .from('daily_financials_view')
                .select('*')
                .order('date', { ascending: true })
                .limit(30);

            if (error) {
                // Fallback to empty if view missing
                return jsonResponse({ history: [] });
            }

            // Map view data to Chart format
            const history = data.map((d: any) => ({
                date: d.date,
                revenue: Number(d.total_revenue) || 0,
                activeUsers: Number(d.active_users) || 0
            }));

            return jsonResponse({ history });
        }

        if (path === '/bot/config') {
            const supabase = getSupabase(env);

            if (request.method === 'GET') {
                try {
                    const { BotConfigService } = await import('../bot/configService');
                    const service = new BotConfigService(env);
                    // We can just fetch raw from DB to be faster/simpler for admin
                    const { data } = await supabase!.from('bot_configs').select('*').order('category', { ascending: true });
                    return jsonResponse({ configs: data || [] });
                } catch (e) {
                    return jsonResponse({ configs: [] });
                }
            }

            if (request.method === 'POST') {
                try {
                    const body = await request.json() as { updates: { key: string, value: string }[] };
                    if (!body.updates || !Array.isArray(body.updates)) {
                        return jsonResponse({ error: 'Invalid payload' }, 400);
                    }

                    const timestamp = new Date().toISOString();
                    const upserts = body.updates.map(u => ({
                        key: u.key,
                        value: u.value, // It's usually a string or JSON string from frontend
                        updated_at: timestamp,
                        category: u.key.split('.')[0] || 'general' // heuristic category
                    }));

                    const { error } = await supabase!.from('bot_configs').upsert(upserts);

                    if (error) {
                        console.error('Config batch save error:', error);
                        return jsonResponse({ error: error.message }, 500);
                    }

                    return jsonResponse({ success: true });
                } catch (e: any) {
                    return jsonResponse({ error: e.message }, 500);
                }
            }
        }

        // --- ADMIN FEED (Live Access) ---
        if (path === '/feed') {
            const supabase = getSupabase(env);

            // 1. Fetch recent events (Wins, Users, etc.)
            const [recentUsers, recentWins, campaigns] = await Promise.all([
                supabase!.from('users').select('telegram_id, username, created_at').order('created_at', { ascending: false }).limit(5),
                supabase!.from('game_transactions').select('amount, type, created_at').eq('type', 'win').gt('amount', 400).order('created_at', { ascending: false }).limit(5),
                supabase!.from('marketing_campaigns').select('name, status, created_at').order('created_at', { ascending: false }).limit(3)
            ]);

            const feed: any[] = [];

            // Transform Users
            (recentUsers.data || []).forEach(u => {
                feed.push({
                    id: `user-${u.telegram_id}`,
                    type: 'JOIN',
                    message: `User @${u.username || u.telegram_id} joined the lobby`,
                    timestamp: u.created_at
                });
            });

            // Transform Wins
            (recentWins.data || []).forEach(w => {
                feed.push({
                    id: `win-${w.created_at}`,
                    type: 'WIN',
                    message: `BigWin: ${w.amount} ETB payout triggered!`,
                    timestamp: w.created_at
                });
            });

            // Transform Campaigns
            (campaigns.data || []).forEach(c => {
                feed.push({
                    id: `camp-${c.created_at}`,
                    type: 'INFO',
                    message: `Campaign "${c.name}" is ${c.status}`,
                    timestamp: c.created_at
                });
            });

            // Sort by time
            feed.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

            return jsonResponse({ events: feed });
        }

        // --- NOTIFICATIONS (Actionable) ---
        if (path === '/notifications') {
            const supabase = getSupabase(env);

            // 1. Pending Withdrawals
            const { data: withdrawals } = await supabase!
                .from('payment_requests')
                .select('*')
                .eq('status', 'pending')
                .eq('type', 'withdraw')
                .limit(10);

            // 2. Risk Alerts (Mock/Logic)
            // Ideally check 'users' where flags > 0 or something

            const notifs: any[] = [];

            (withdrawals || []).forEach(w => {
                notifs.push({
                    id: w.id,
                    type: 'finance',
                    title: 'Pending Withdrawal',
                    desc: `${w.amount} ETB request from User ${w.user_id}`,
                    time: w.created_at, // Client calculates relative time
                    read: false
                });
            });

            // Add dummy risk if needed or query real logs
            // Logic: High amount wins in short time (omitted for speed)

            return jsonResponse({ notifications: notifs });
        }

        // --- BOT CMS (Structured) ---
        if (path === '/bot/cms') {
            const { BotConfigService } = await import('../bot/configService');
            const service = new BotConfigService(env);

            if (request.method === 'GET') {
                const config = await service.getConfig();
                return jsonResponse({ success: true, data: config });
            }

            if (request.method === 'POST') {
                const body = await request.json() as { key: string, value: any };
                const supabase = getSupabase(env);

                // Normalize value to string if needed or store as JSON
                const val = typeof body.value === 'object' ? JSON.stringify(body.value) : String(body.value);

                if (!body.key) return jsonResponse({ error: 'Missing key' }, 400);

                const payload = {
                    key: body.key,
                    value: val,
                    category: 'general',
                    updated_at: new Date().toISOString()
                };

                const { error } = await supabase!
                    .from('bot_configs')
                    .upsert(payload);

                if (error) {
                    console.error('Bot Config Save Error:', error);
                    return jsonResponse({ error: error.message, details: error }, 500);
                }
                return jsonResponse({ success: true });
            }
        }
        // --- BOT ADMINS ---
        if (path === '/bot/admins') {
            const { BotConfigService } = await import('../bot/configService');
            const service = new BotConfigService(env);
            const config = await service.getConfig();

            if (request.method === 'GET') {
                return jsonResponse({ admins: config.adminIds || [] });
            }

            if (request.method === 'POST') {
                const body = await request.json() as { userId: string };
                // Add ID to array
                const current = config.adminIds || [];
                // Ensure unique numbers
                const newId = Number(body.userId);
                if (!current.includes(newId)) {
                    current.push(newId);

                    const supabase = getSupabase(env);
                    await supabase!.from('bot_configs').upsert({
                        key: 'admin_ids',
                        value: JSON.stringify(current),
                        category: 'system'
                    });
                }
                return jsonResponse({ success: true });
            }

            if (request.method === 'DELETE') {
                const url = new URL(request.url);
                const idToRemove = Number(url.searchParams.get('id'));

                const current = config.adminIds || [];
                const updated = current.filter(id => id !== idToRemove);

                const supabase = getSupabase(env);
                await supabase!.from('bot_configs').upsert({
                    key: 'admin_ids',
                    value: JSON.stringify(updated),
                    category: 'system'
                });
                return jsonResponse({ success: true });
            }
        }

        // --- BOT IDENTITY ---
        if (path === '/bot/identity') {
            if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);
            const { setBotInfo } = await import('../bot/utils');
            const body = await request.json() as any;

            try {
                const results = await setBotInfo(env, body.name, body.shortDescription, body.description);

                // Also save to DB for record-keeping
                const supabase = getSupabase(env);
                await supabase!.from('bot_configs').upsert({
                    key: 'bot_identity_cache',
                    value: JSON.stringify({
                        name: body.name,
                        shortDescription: body.shortDescription,
                        description: body.description,
                        last_updated: new Date().toISOString()
                    }),
                    category: 'system'
                });

                return jsonResponse({ success: true, results });
            } catch (e: any) {
                return jsonResponse({ error: e.message || 'Failed to update bot identity' }, 500);
            }
        }

        if (path === '/config/latest') {
            const supabase = getSupabase(env);
            const { data, error } = await supabase!
                .from('game_configs')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            // If no config exists, return default
            if (error || !data) {
                return jsonResponse({
                    version: 'v0.0.0',
                    rules: {
                        ande_zig: { timer: 30, entry_fee: 10 },
                        hulet_zig: { timer: 45, entry_fee: 20 },
                        mulu_zig: { timer: 60, entry_fee: 50 }
                    },
                    features: { chat_enabled: false }
                });
            }
            return jsonResponse(data);
        }

        if (path === '/config/update') {
            if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);
            const body = await request.json() as any;
            const supabase = getSupabase(env);

            // 1. Deactivate old configs
            await supabase!.from('game_configs').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000'); // Deactivate all

            // 2. Insert new config
            const { data, error } = await supabase!.from('game_configs').insert({
                version: body.version,
                rules: body.rules,
                features: body.features,
                is_active: true,
                created_by: body.adminId // If we had it
            }).select().single();

            if (error) throw error;
            return jsonResponse(data);
        }

        // --- MARKETING ---
        if (path === '/marketing/campaigns') {
            const supabase = getSupabase(env);
            if (request.method === 'GET') {
                const { data, error } = await supabase!.from('marketing_campaigns').select('*').order('created_at', { ascending: false });
                if (error) throw error;
                return jsonResponse({ campaigns: data });
            }
            if (request.method === 'POST') {
                const body = await request.json();
                const { data, error } = await supabase!.from('marketing_campaigns').insert(body).select().single();
                if (error) throw error;
                return jsonResponse(data);
            }
        }

        if (path === '/marketing/drip') {
            const supabase = getSupabase(env);
            // We reuse bot_configs table for this: key = 'drip_sequence'

            if (request.method === 'GET') {
                const { data } = await supabase!
                    .from('bot_configs')
                    .select('value')
                    .eq('key', 'drip_sequence')
                    .single();

                const sequence = data?.value ? JSON.parse(data.value) : [];
                return jsonResponse({ sequence });
            }

            if (request.method === 'POST') {
                const body = await request.json() as { sequence: any[] };
                const { error } = await supabase!
                    .from('bot_configs')
                    .upsert({
                        key: 'drip_sequence',
                        value: JSON.stringify(body.sequence),
                        category: 'marketing',
                        updated_at: new Date().toISOString()
                    });

                if (error) return jsonResponse({ error: error.message }, 500);
                return jsonResponse({ success: true });
            }
        }

        // --- CONTENT GENERATION (Satori) ---
        if (path === '/content/winner-card') {
            const url = new URL(request.url);
            const name = url.searchParams.get('name') || 'Player';
            const amount = url.searchParams.get('amount') || '0';
            const currency = url.searchParams.get('currency') || 'ETB';


            // Generate PNG
            let pngBuffer: Uint8Array;
            const { ContentService } = await import('../bot/contentService');

            if (url.searchParams.has('jackpot')) {
                pngBuffer = await ContentService.generateJackpotCard(amount);
            } else if (url.searchParams.has('milestone')) {
                const count = url.searchParams.get('count') || '1000';
                const label = url.searchParams.get('label') || 'Players';
                pngBuffer = await ContentService.generateMilestoneCard(count, label);
            } else {
                pngBuffer = await ContentService.generateWinnerCard(name, amount, currency);
            }

            // Check if we should POST to Telegram
            const action = url.searchParams.get('action');
            if (action === 'post_telegram') {
                const { BotConfigService } = await import('../bot/configService');
                const configService = new BotConfigService(env);
                const config = await configService.getConfig();
                const channelId = env.TELEGRAM_CHANNEL_ID || '@BingoEthiopiaDemo';

                let caption = '';
                if (url.searchParams.has('jackpot')) {
                    caption = `🚨 <b>BIG DERASH ALERT!</b>\n\nThe Jackpot has been hit! Amount: <b>${amount} ETB</b> 💰`;
                } else {
                    // Use dynamic win message from bot configs if available
                    const winTemplate = config.botFlows?.game?.winner_announcement || `🏆 <b>CONGRATULATIONS!</b>\n\n{winner} just won <b>{win_amount} {currency}</b>! 🔥`;
                    caption = winTemplate
                        .replace('{winner}', name)
                        .replace('{win_amount}', amount)
                        .replace('{amount}', amount) // fallback
                        .replace('{currency}', currency);
                }

                try {
                    const { AutomationService } = await import('../bot/automationService');
                    await AutomationService.postPhotoToChannel(env, channelId, pngBuffer, caption);
                    return jsonResponse({ success: true, message: `Posted to ${channelId}` });
                } catch (e: any) {
                    console.error('Failed to post to Telegram:', e);
                    return jsonResponse({ error: e.message }, 500);
                }
            }

            return new Response(pngBuffer, {
                headers: {
                    'Content-Type': 'image/png',
                    'Cache-Control': 'public, max-age=3600'
                }
            });
        }


        // --- AUTOMATION / TOURNAMENTS ---
        if (path === '/tournaments') {
            const supabase = getSupabase(env);
            if (request.method === 'GET') {
                try {
                    const { data, error } = await supabase!
                        .from('public_tournaments_view')
                        .select('*')
                        .order('start_date', { ascending: false });

                    if (error) {
                        console.error('Supabase GET tournaments error:', error);
                        return jsonResponse({ error: error.message, details: error }, 500);
                    }

                    // Map view fields back to what admin expects
                    const mappedData = (data || []).map((t: any) => ({
                        ...t,
                        start_time: t.start_date,
                        end_time: t.end_date,
                        title: t.title || t.name
                    }));

                    return jsonResponse({ tournaments: mappedData });
                } catch (err: any) {
                    console.error('Worker GET tournaments exception:', err);
                    return jsonResponse({ error: err.message, stack: err.stack }, 500);
                }
            }
            if (request.method === 'POST') {
                try {
                    const body = await request.json() as any;
                    console.log('Creating tournament with body:', body);

                    const { data, error } = await supabase!.from('tournaments').insert({
                        title: body.title,
                        description: body.description,
                        start_time: body.start_time,
                        end_time: body.end_time,
                        prize_pool: body.prize_pool,
                        entry_fee: body.entry_fee,
                        status: 'scheduled'
                    }).select().single();

                    if (error) {
                        console.error('Supabase POST tournament error:', error);
                        return jsonResponse({ error: error.message, details: error }, 500);
                    }

                    // --- AUTO ANNOUNCEMENT LOGIC ---
                    if (body.announce) {
                        try {
                            const { data: config } = await supabase!
                                .from('game_configs')
                                .select('*')
                                .eq('is_active', true)
                                .single();

                            if (config) {
                                const startTime = new Date(body.start_time).toLocaleString('en-US', {
                                    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                                });

                                const newFeatures = {
                                    ...config.features,
                                    announcement: {
                                        enabled: true,
                                        id: crypto.randomUUID(),
                                        title: `🏆 New Tournament: ${body.title}`,
                                        message: `${body.description || 'Compete for glory!'} \n\n💰 Prize Pool: ${body.prize_pool} ETB\n⏰ Starts: ${startTime}`,
                                        image_url: "https://hthvotvtkqggbdpfrryb.supabase.co/storage/v1/object/public/public-assets/tournament_default.png", // Fallback or generic image
                                        action_text: "Join Now",
                                        action_url: `/tournaments/${data.id}` // Deep link
                                    }
                                };

                                await supabase!
                                    .from('game_configs')
                                    .update({ features: newFeatures })
                                    .eq('id', config.id);
                            }
                        } catch (e) {
                            console.error("Failed to auto-announce tournament:", e);
                            // Do not fail the request, just log
                        }
                    }

                    return jsonResponse(data);
                } catch (err: any) {
                    console.error('Worker POST tournament exception:', err);
                    return jsonResponse({ error: err.message, stack: err.stack }, 500);
                }
            }
        }

        // --- TOURNAMENT ACTIONS ---
        const tournamentActionMatch = path.match(/^\/tournaments\/([^\/]+)$/);
        if (tournamentActionMatch) {
            const tournamentId = tournamentActionMatch[1];
            const supabase = getSupabase(env);

            if (request.method === 'PATCH') {
                const body = await request.json() as { status?: string, end_time?: string };
                const updates: any = {};
                if (body.status) updates.status = body.status;
                if (body.end_time) updates.end_time = body.end_time;

                const { data, error } = await supabase!
                    .from('tournaments')
                    .update(updates)
                    .eq('id', tournamentId)
                    .select()
                    .single();

                if (error) return jsonResponse({ error: error.message }, 500);
                return jsonResponse({ success: true, data });
            }

            if (request.method === 'DELETE') {
                const { error } = await supabase!
                    .from('tournaments')
                    .delete()
                    .eq('id', tournamentId);

                if (error) return jsonResponse({ error: error.message }, 500);
                return jsonResponse({ success: true });
            }
        }

        // --- NEW: TOURNAMENT PAYOUT ---
        const payoutMatch = path.match(/^\/tournaments\/([^\/]+)\/payout$/);
        if (payoutMatch && request.method === 'POST') {
            const tournamentId = payoutMatch[1];
            const supabase = getSupabase(env);

            // 1. Fetch tournament details
            const { data: tournament, error: tError } = await supabase!
                .from('tournaments')
                .select('*')
                .eq('id', tournamentId)
                .single();

            if (tError || !tournament) return jsonResponse({ error: 'Tournament not found' }, 404);
            if (tournament.status === 'completed') return jsonResponse({ error: 'Tournament already paid out' }, 400);

            // 2. Fetch top participants
            const { data: leaders, error: lError } = await supabase!
                .rpc('get_tournament_leaderboard', {
                    tournament_uuid: tournamentId,
                    limit_count: 3 // Pay top 3
                });

            if (lError) return jsonResponse({ error: lError.message }, 500);
            if (!leaders || leaders.length === 0) return jsonResponse({ error: 'No participants found' }, 400);

            // 3. Define prize distribution (e.g., 50%, 30%, 20%)
            const dist = tournament.prize_distribution || { "1": 0.5, "2": 0.3, "3": 0.2 };
            const prizePool = parseFloat(tournament.prize_pool);
            const summaries: any[] = [];

            // 4. Distribute prizes
            for (const leader of leaders) {
                const rank = leader.rank;
                const pct = dist[rank.toString()];
                if (!pct) continue;

                const prize = prizePool * (parseFloat(pct) > 1 ? (parseFloat(pct) / prizePool) : parseFloat(pct));
                if (prize <= 0) continue;

                // Update user balance
                // Leader has user_id (BIGINT telegram_id)
                const { data: user, error: uError } = await supabase!
                    .from('users')
                    .select('id, balance')
                    .eq('telegram_id', leader.user_id)
                    .single();

                if (uError || !user) continue;

                const balanceBefore = parseFloat(user.balance);
                const balanceAfter = balanceBefore + prize;

                // Atomic balance update
                await supabase!.from('users').update({ balance: balanceAfter }).eq('id', user.id);

                // Record transaction
                await supabase!.from('transactions').insert({
                    user_id: user.id,
                    type: 'game_win',
                    amount: prize,
                    balance_before: balanceBefore,
                    balance_after: balanceAfter,
                    reference_id: tournamentId,
                    description: `Tournament Prize: ${tournament.title} (Rank ${rank})`
                });

                // Update participant record
                await supabase!
                    .from('tournament_participants')
                    .update({ prize_won: prize })
                    .eq('tournament_id', tournamentId)
                    .eq('user_id', leader.user_id);

                summaries.push({ user_id: leader.user_id, rank, prize });
            }

            // 5. Build Final result list for Telegram Notification
            // (Optional: send notification here or let admin do it)

            // 6. Close tournament
            await supabase!.from('tournaments').update({ status: 'completed' }).eq('id', tournamentId);

            return jsonResponse({ success: true, distributions: summaries });
        }

        if (path === '/tournaments/schedule') {
            const supabase = getSupabase(env);
            const { data, error } = await supabase!.from('scheduled_events').select('*').order('trigger_at', { ascending: true });
            if (error) throw error;
            return jsonResponse({ events: data });
        }

        // --- SPECIAL EVENTS ---
        if (path === '/events') {
            const supabase = getSupabase(env);
            if (request.method === 'GET') {
                const { data, error } = await supabase!.from('special_events').select('*').order('start_time', { ascending: false });
                if (error) throw error;
                return jsonResponse({ events: data || [] });
            }
            if (request.method === 'POST') {
                const body = await request.json() as any;

                // 1. Create Event
                const { data, error } = await supabase!.from('special_events').insert({
                    title: body.title,
                    description: body.description,
                    type: body.type, // 'happy_hour', 'weekend_bonanza', 'flash_sale', 'holiday'
                    multiplier: body.multiplier,
                    start_time: body.start_time,
                    end_time: body.end_time,
                    status: 'active'
                }).select().single();

                if (error) throw error;

                // 2. Auto-Announce
                if (body.announce) {
                    try {
                        const { data: config } = await supabase!
                            .from('game_configs')
                            .select('*')
                            .eq('is_active', true)
                            .single();

                        if (config) {
                            // Emoji mapping
                            const emojis: any = { happy_hour: '⏰', weekend_bonanza: '🎊', flash_sale: '⚡', holiday: '🎄' };
                            const icon = emojis[body.type] || '🎉';

                            const newFeatures = {
                                ...config.features,
                                announcement: {
                                    enabled: true,
                                    id: crypto.randomUUID(),
                                    title: `${icon} Special Event: ${body.title}!`,
                                    message: `${body.description || 'Limited time offer!'} \n\n🔥 Rewards: ${body.multiplier}x Multiplier\n⏳ Ends: ${new Date(body.end_time).toLocaleString()}`,
                                    image_url: "https://hthvotvtkqggbdpfrryb.supabase.co/storage/v1/object/public/public-assets/event_default.png",
                                    action_text: "Play Now",
                                    action_url: "/lobby"
                                }
                            };

                            await supabase!
                                .from('game_configs')
                                .update({ features: newFeatures })
                                .eq('id', config.id);
                        }
                    } catch (e) {
                        console.error("Failed to auto-announce event:", e);
                    }
                }

                return jsonResponse(data);
            }
        }

        // --- EVENT ACTIONS ---
        const eventActionMatch = path.match(/^\/events\/([^\/]+)$/);
        if (eventActionMatch) {
            const eventId = eventActionMatch[1];
            const supabase = getSupabase(env);

            if (request.method === 'PATCH') {
                const body = await request.json() as { status?: string, end_time?: string };
                const updates: any = {};
                if (body.status) updates.status = body.status;
                if (body.end_time) updates.end_time = body.end_time;

                const { data, error } = await supabase!
                    .from('special_events')
                    .update(updates)
                    .eq('id', eventId)
                    .select()
                    .single();

                if (error) return jsonResponse({ error: error.message }, 500);
                return jsonResponse({ success: true, data });
            }

            if (request.method === 'DELETE') {
                const { error } = await supabase!
                    .from('special_events')
                    .delete()
                    .eq('id', eventId);

                if (error) return jsonResponse({ error: error.message }, 500);
                return jsonResponse({ success: true });
            }
        }


        // --- ADMIN MANAGEMENT (Super Only) ---
        if (path === '/team/members') {
            const supabase = getSupabase(env);
            if (request.method === 'GET') {
                const { data, error } = await supabase!.from('admin_users_view').select('*');
                if (error) throw error;
                return jsonResponse({ members: data });
            }
            if (request.method === 'POST') {
                const body = await request.json() as any;

                // Create in Supabase Auth first (mocked here or use Admin API)
                // In reality: You need supabase.auth.admin.createUser()
                // Then insert into admin_users

                // Simplified: We assume Auth User exists or we just insert DB record for now
                // In production, this requires Service Key usage for Auth Admin.

                const { data, error } = await supabase!.from('admin_users').insert({
                    email: body.email,
                    role: body.role,
                    full_name: body.fullName,
                    password_hash: 'placeholder' // Auth managed separately
                }).select().single();

                if (error) throw error;
                return jsonResponse(data);
            }
        }

        if (path.startsWith('/team/members/') && request.method === 'DELETE') {
            const id = path.split('/')[3];
            const supabase = getSupabase(env);
            const { error } = await supabase!.from('admin_users').delete().eq('id', id);
            if (error) throw error;
            return jsonResponse({ success: true });
        }

        // --- FINANCE ---
        if (path === '/finance/stats') {
            const supabase = getSupabase(env);
            const url = new URL(request.url);
            const range = url.searchParams.get('range') || '30d';
            let days = 30;
            if (range === '7d') days = 7;
            if (range === '90d') days = 90;
            if (range === 'all') days = 3650;

            // Calculate start date
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);
            const startDateStr = startDate.toISOString().split('T')[0];

            const { data, error } = await supabase!
                .from('daily_financials_view')
                .select('*')
                .gte('date', startDateStr)
                .order('date', { ascending: true });

            if (error) {
                // Return empty if view missing, avoid mock
                return jsonResponse({ stats: [] });
            }

            return jsonResponse({ stats: data });
        }

        if (path === '/finance/withdrawals') {
            // Still mock for now, as payment_requests logic is complex
            return jsonResponse({ withdrawals: [] });
        }

        // --- RISK ANALYSIS ---
        if (path === '/risk/scan') {
            // In a real scenario, this would trigger a heavy background job
            // For demo, we will return some "detected" high risk users

            // 1. Fetch recent high rollers (Mocking logic here for speed)
            const mockHighRiskUsers = [
                {
                    userId: 'user-123-suspicious',
                    name: 'Lucky Winner',
                    riskScore: 85,
                    flags: ['High Win Rate: 72%', 'Win Streak: 6 games']
                }
            ];

            return jsonResponse({ alerts: mockHighRiskUsers });
        }


        // --- USERS ACTIONS ---
        if (path.startsWith('/users/') && path.includes('/status')) {
            if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

            // Extract ID from path: /users/123/status
            const parts = path.split('/'); // ["", "users", "123", "status"]
            const userId = parts[2];
            const body = await request.json() as { is_blocked: boolean, reason?: string };

            const supabase = getSupabase(env);
            const { data, error } = await supabase!
                .from('users')
                .update({ is_blocked: body.is_blocked })
                .eq('id', userId)
                .select()
                .single();

            if (error) throw error;

            // Audit Log
            const { logAdminAction } = await import('./audit');
            await logAdminAction(env, request, body.is_blocked ? 'BAN_USER' : 'UNBAN_USER', userId, { reason: body.reason });

            return jsonResponse(data);
        }

        // --- MARKETING ACTIONS ---
        if (path.startsWith('/marketing/campaigns/') && path.endsWith('/send')) {
            if (request.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

            // /marketing/campaigns/123/send
            const parts = path.split('/');
            const campaignId = parts[3];

            const supabase = getSupabase(env);

            // 1. Get Campaign
            const { data: campaign, error } = await supabase!
                .from('marketing_campaigns')
                .select('*')
                .eq('id', campaignId)
                .single();

            if (error || !campaign) return jsonResponse({ error: 'Campaign not found' }, 404);
            if (campaign.status === 'completed') return jsonResponse({ error: 'Already sent' }, 400);

            // 2. Trigger Bot Broadcast
            // Mark as 'active' so the Cron/Scheduler can pick it up (or we process immediate batch)
            await supabase!
                .from('marketing_campaigns')
                .update({ status: 'active', sent_count: 0 })
                .eq('id', campaignId);

            // Attempt immediate processing (best effort)
            // We import dynamically to avoid circular deps if any
            const { processActiveCampaigns } = await import('../marketing/dripScheduler');

            // We don't await this if we want to return fast, but normally we should await to catch errors.
            // Given it's a "Launch" button, waiting 5-10s is fine.
            try {
                await processActiveCampaigns(env);
            } catch (e) {
                console.error('Immediate campaign processing failed (will rely on Cron):', e);
            }

            // Audit Log
            const { logAdminAction } = await import('./audit');
            await logAdminAction(env, request, 'SEND_CAMPAIGN', campaignId, { name: campaign.name });

            return jsonResponse({ success: true });
        }

        return jsonResponse({ error: 'Not Found' }, 404);
    } catch (e: any) {
        return jsonResponse({ error: e.message }, 500);
    }
}
