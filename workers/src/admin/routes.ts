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

    // 3. Routing
    try {
        // --- GAMES ---
        if (path === '/games/live') {
            // Fetch live games stats from Durable Objects?
            // Since DOs are sharded, we might just query the active_games_view in DB for now
            const supabase = getSupabase(env);
            const { data, error } = await supabase!.from('active_games_view').select('*');
            if (error) throw error;
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

            // Parallel queries
            const [users, games, revenue] = await Promise.all([
                supabase!.from('users').select('count', { count: 'exact', head: true }),
                supabase!.from('games').select('count', { count: 'exact', head: true }),
                supabase!.from('game_transactions').select('amount').eq('type', 'bet') // Estimate
            ]);

            return jsonResponse({
                totalUsers: users.count,
                totalGames: games.count,
                // revenue: ... sum logic
            });
        }

        if (path === '/stats/analytics') {
            // Mock 30-day history for charts
            // In real app: use RPC call to aggregate date_trunc('day', created_at)
            const days = Array.from({ length: 30 }, (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - (29 - i));
                return {
                    date: date.toISOString().split('T')[0],
                    revenue: Math.floor(Math.random() * 500) + 100, // Mock
                    activeUsers: Math.floor(Math.random() * 100) + 20, // Mock
                };
            });

            return jsonResponse({ history: days });
        }

        // --- BOT CONFIG ---
        if (path === '/bot/config') {
            const supabase = getSupabase(env);
            if (request.method === 'GET') {
                const { data, error } = await supabase!.from('bot_configs').select('*').order('category', { ascending: true });
                // If table doesn't exist yet (migration not run), return graceful empty or error
                if (error) {
                    // console.error('Bot config error:', error);
                    return jsonResponse({ configs: [] }); // Fail soft
                }
                return jsonResponse({ configs: data });
            }
            if (request.method === 'POST') {
                const body = await request.json() as any;

                // Support Batch Update
                if (body.updates && Array.isArray(body.updates)) {
                    const updates = body.updates.map((u: any) => ({
                        key: u.key,
                        value: u.value,
                        updated_by: (request as any).adminUser?.id
                    }));

                    const { data, error } = await supabase!
                        .from('bot_configs')
                        .upsert(updates)
                        .select();

                    if (error) throw error;
                    return jsonResponse({ success: true, count: data.length });
                }

                // Legacy Single Update (for backward compatibility if needed)
                const { data, error } = await supabase!
                    .from('bot_configs')
                    .upsert({
                        key: body.key,
                        value: body.value,
                        updated_by: (request as any).adminUser?.id
                    })
                    .select()
                    .single();
                if (error) throw error;
                return jsonResponse(data);
            }
            return jsonResponse({ error: 'Method not allowed' }, 405);
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

                const { error } = await supabase!
                    .from('bot_configs')
                    .upsert({
                        key: body.key,
                        value: val,
                        category: 'general', // Default category
                        updated_by: (request as any).adminUser?.id
                    });

                if (error) throw error;
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
                    const { AutomationService } = await import('../bot/automationService');
                    const channelId = env.TELEGRAM_CHANNEL_ID || '@BingoEthiopiaDemo'; // Default or Env

                    let caption = '';
                    if (url.searchParams.has('jackpot')) caption = `🚨 <b>BIG DERASH ALERT!</b>\n\nThe Jackpot has been hit! Amount: <b>${amount} ETB</b> 💰`;
                    else caption = `🏆 <b>CONGRATULATIONS!</b>\n\n${name} just won <b>${amount} ${currency}</b>! 🔥`;

                    try {
                        await AutomationService.postPhotoToChannel(env, channelId, pngBuffer, caption);
                        return jsonResponse({ success: true, message: `Posted to ${channelId}` });
                    } catch (e: any) {
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
                    const { data, error } = await supabase!.from('tournaments').select('*').order('start_time', { ascending: false });
                    if (error) throw error;
                    return jsonResponse({ tournaments: data });
                }
                if (request.method === 'POST') {
                    const body = await request.json() as any;
                    const { data, error } = await supabase!.from('tournaments').insert({
                        title: body.title,
                        description: body.description,
                        start_time: body.start_time,
                        end_time: body.end_time,
                        prize_pool: body.prize_pool,
                        entry_fee: body.entry_fee,
                        status: 'scheduled'
                    }).select().single();

                    if (error) throw error;
                    return jsonResponse(data);
                }
            }

            if (path === '/tournaments/schedule') {
                const supabase = getSupabase(env);
                const { data, error } = await supabase!.from('scheduled_events').select('*').order('trigger_at', { ascending: true });
                if (error) throw error;
                return jsonResponse({ events: data });
            }

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
                    // If view doesn't exist yet, return mock for UI dev
                    // console.error('Finance stats error:', error);
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

                // 2. Trigger Bot Broadcast (Mocked for now or call Bot API)
                // In real world: Enqueue a background job
                // For now: Just mark as 'active' or 'completed' and log

                await supabase!
                    .from('marketing_campaigns')
                    .update({ status: 'completed', sent_count: 100 }) // Mock success
                    .eq('id', campaignId);

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
