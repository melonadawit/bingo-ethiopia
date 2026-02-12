
import { GameRoom } from './durable-objects/GameRoom';
import { PlayerTracker } from './durable-objects/PlayerTracker';
import { handleGameRoutes } from './routes/game';
import { handleRewardsRoutes } from './routes/rewards';
import { handleTournamentRoutes } from './routes/tournaments';
import { handleEventRoutes } from './routes/events';
import { handleStatsRoutes } from './routes/stats';
import { handleAuthRoutes } from './routes/auth';
import { handleActiveGameRoutes } from './routes/activeGame';
import { handlePaymentRoutes } from './routes/payments';
import { handleBotWebhook } from './bot/webhook';
import { corsHeaders, jsonResponse } from './utils';
import { handleAdminRequest } from './admin/routes'; // Static import

export interface Env {
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
    SUPABASE_SERVICE_KEY: string;
    BOT_TOKEN: string;
    UPSTASH_REDIS_REST_URL: string;
    UPSTASH_REDIS_REST_TOKEN: string;
    GAME_ROOM: DurableObjectNamespace;
    PLAYER_TRACKER: DurableObjectNamespace;
    AI: any; // Cloudflare AI Binding

    // Telegram (Optional)
    TELEGRAM_BOT_TOKEN?: string;
    TELEGRAM_CHANNEL_ID?: string;
    TELEGRAM_ADMIN_CHAT_ID?: string;
}

// Export Durable Objects
export { GameRoom, PlayerTracker };

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);

        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                headers: corsHeaders(),
            });
        }

        // Health check
        if (url.pathname === '/health' || url.pathname === '/') {
            return jsonResponse({
                status: 'ok',
                version: '3.0.0',
                platform: 'cloudflare-workers',
                database: 'supabase',
                timestamp: new Date().toISOString(),
            });
        }

        // --- Admin Config Routes (Top Priority) ---
        if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/api/admin')) {
            // Inline handlers for special admin tasks (Keep existing logic)

            // --- Admin AI Generation ---
            if (url.pathname === '/admin/generate-announcement' && request.method === 'POST') {
                try {
                    const { topic, type } = await request.json() as any;
                    let systemPrompt = "You are a hyped game announcer for 'Bingo Ethiopia'. Write a short, exciting headline and a 1-sentence message body. Output ONLY JSON with { title, message } format if possible, or just text.";
                    if (type === 'tournament') systemPrompt += " Focus on big prizes and competition.";
                    else if (type === 'win') systemPrompt += " Celebrate a massive jackpot winner.";

                    const response = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
                        messages: [
                            { role: "system", content: systemPrompt },
                            { role: "user", content: `Generate an announcement for: ${topic}` }
                        ]
                    });
                    const text = response.response || "";
                    try {
                        const jsonMatch = text.match(/\{[\s\S]*\}/);
                        if (jsonMatch) return jsonResponse(JSON.parse(jsonMatch[0]));
                    } catch (e) { }
                    const lines = text.split('\n').filter((l: string) => l.trim().length > 0);
                    return jsonResponse({ title: lines[0]?.replace(/^["']|["']$/g, '').replace('**', '') || "Big News!", message: lines.slice(1).join(' ').replace(/^["']|["']$/g, '') || text });
                } catch (err: any) {
                    return jsonResponse({ error: err.message }, 500);
                }
            }

            // --- Admin Broadcast ---
            if ((url.pathname === '/admin/broadcast' || url.pathname === '/admin/broadcast/') && request.method === 'POST') {
                // Re-use logic or fallback to dynamic? 
                // Let's assume the handleAdminRequest handles regular CRUD, but these special ones might be distinct or migrated.
                // For SAFETY, since I'm fixing a regression, I will rely on handleAdminRequest for CRUD (tournaments) 
                // and leave these here for now.

                // ACTUALLY, checking admin/routes.ts, it DOES NOT seem to have 'broadcast'.
                // So I MUST preserve this block.
                try {
                    console.log('[BROADCAST] Received request');
                    const body = await request.json() as any;
                    console.log('[BROADCAST] Payload:', JSON.stringify(body));
                    const { message, targetAudience, region, image, actions } = body;

                    const { sendMessage, sendPhoto } = await import('./bot/utils');
                    const { getSupabase } = await import('./utils');
                    const supabase = getSupabase(env);

                    // Fetch users with filters
                    let query = supabase.from('users').select('telegram_id').not('telegram_id', 'is', null);

                    if (targetAudience === 'VIP') {
                        query = query.gt('balance', 1000);
                    } else if (targetAudience === 'ACTIVE') {
                        query = query.gt('total_games_played', 5);
                    } else if (targetAudience === 'NEW') {
                        const yesterday = new Date();
                        yesterday.setHours(yesterday.getHours() - 24);
                        query = query.gt('created_at', yesterday.toISOString());
                    }

                    const { data: users, error: dbError } = await query.limit(500);

                    if (dbError) {
                        console.error('[BROADCAST] DB Error:', dbError);
                        return jsonResponse({ error: dbError.message }, 500);
                    }

                    if (!users || users.length === 0) {
                        console.log('[BROADCAST] No users found for current filters');
                        return jsonResponse({ count: 0, success: true, message: 'No users found matching filters' });
                    }

                    console.log(`[BROADCAST] Found ${users.length} users. Sending with ${image ? 'photo' : 'text'}...`);

                    let reply_markup = undefined;
                    if (actions && actions.length > 0) {
                        const inlineKeyboard = actions.filter((a: any) => a.text && a.url).map((a: any) => ([{ text: a.text, url: a.url }]));
                        if (inlineKeyboard.length > 0) reply_markup = { inline_keyboard: inlineKeyboard };
                    }

                    let sentCount = 0;
                    let failCount = 0;

                    // Simple batching/throttle to avoid Telegram limits if possible
                    for (const user of users) {
                        try {
                            if (image) await sendPhoto(Number(user.telegram_id), image, message, env, reply_markup);
                            else await sendMessage(Number(user.telegram_id), message, env, reply_markup);
                            sentCount++;
                            // Subtle delay every 20 messages?
                            if (sentCount % 20 === 0) await new Promise(r => setTimeout(r, 100));
                        } catch (e: any) {
                            console.error(`[BROADCAST] Failed for user ${user.telegram_id}:`, e.message);
                            failCount++;
                        }
                    }

                    console.log(`[BROADCAST] Done. Sent: ${sentCount}, Failed: ${failCount}`);

                    // [FIX] Update Game Config for Client Pop-up
                    try {
                        const announcementData = {
                            title: "📢 Announcement", // Using generic title or could ideally pass it
                            message: message,
                            actions: actions || [],
                            image: image || null,
                            created_at: new Date().toISOString()
                        };

                        // Fetch latest active config
                        const { data: latestConfig } = await supabase
                            .from('game_configs')
                            .select('id, announcement')
                            .eq('is_active', true)
                            .order('created_at', { ascending: false })
                            .limit(1)
                            .single();

                        if (latestConfig) {
                            await supabase
                                .from('game_configs')
                                .update({ announcement: announcementData })
                                .eq('id', latestConfig.id);
                        } else {
                            // Verify if we should create a new config? Probably not, just ignore or log.
                            console.warn("No active game config found to update announcement.");
                        }
                    } catch (dbErr) {
                        console.error("Failed to update game_configs:", dbErr);
                        // Don't fail the request, just log
                    }

                    return jsonResponse({ count: sentCount, success: true });
                } catch (err: any) {
                    return jsonResponse({ error: err.message }, 500);
                }
            }

            // --- Admin Image Upload/Gen ---
            if (url.pathname === '/admin/generate-image' && request.method === 'POST') {
                // Preserving existing logic...
                try {
                    const { prompt } = await request.json() as any;
                    const inputs = { prompt: prompt + ", high quality, 4k, vibrant colors" };
                    const response = await env.AI.run('@cf/stabilityai/stable-diffusion-xl-base-1.0', inputs);
                    const arrayBuffer = await new Response(response).arrayBuffer();
                    const { uploadToStorage } = await import('./storage');
                    const publicUrl = await uploadToStorage(env, new Uint8Array(arrayBuffer), `ai-gen-poster.png`, 'image/png');
                    return jsonResponse({ url: publicUrl });
                } catch (err: any) {
                    return jsonResponse({ error: err.message }, 500);
                }
            }

            if (url.pathname === '/admin/upload-image' && request.method === 'POST') {
                const formData = await request.formData();
                const file = formData.get('file');
                if (!file || typeof file === 'string') return new Response('No file or invalid file type', { status: 400 });

                const arrayBuffer = await (file as any).arrayBuffer();
                const { uploadToStorage } = await import('./storage');
                const publicUrl = await uploadToStorage(env, new Uint8Array(arrayBuffer), (file as any).name, (file as any).type);
                return jsonResponse({ url: publicUrl });
            }

            // --- Main Admin Handler (Tournaments, Logic, etc) ---
            try {
                return await handleAdminRequest(request, env);
            } catch (err: any) {
                console.error('Admin route error:', err);
                return jsonResponse({ error: 'Admin Error', details: err.message, stack: err.stack }, 500);
            }
        }


        // Game routes
        if (url.pathname.startsWith('/game') || url.pathname.startsWith('/api/game')) {
            return handleGameRoutes(request, env);
        }

        // Rewards routes
        if (url.pathname.startsWith('/rewards') || url.pathname.startsWith('/api/rewards')) {
            return handleRewardsRoutes(request, env);
        }

        // Tournament routes (Client facing)
        if (url.pathname.startsWith('/tournaments') || url.pathname.startsWith('/api/tournaments')) {
            return handleTournamentRoutes(request, env);
        }

        // Event routes
        if (url.pathname.startsWith('/events') || url.pathname.startsWith('/api/events')) {
            return handleEventRoutes(request, env);
        }

        // Stats routes
        if (url.pathname.startsWith('/stats') || url.pathname.startsWith('/api/stats') || url.pathname.startsWith('/api/leaderboard')) {
            return handleStatsRoutes(request, env);
        }

        // Auth routes
        if (url.pathname.startsWith('/auth') || url.pathname.startsWith('/api/auth')) {
            return handleAuthRoutes(request, env);
        }

        // Active game routes
        if (url.pathname.startsWith('/api/user/active-game') ||
            url.pathname.startsWith('/api/user/set-active-game') ||
            url.pathname.startsWith('/api/user/clear-active-game')) {
            return handleActiveGameRoutes(request, env);
        }

        // Payment routes
        if (url.pathname.startsWith('/payments') || url.pathname.startsWith('/api/payments')) {
            return handlePaymentRoutes(request, env);
        }

        // --- PUBLIC CONFIG ROUTE ---
        if (url.pathname.startsWith('/config')) {
            // ... existing logic ...
            if (url.pathname === '/config/latest') {
                const { getSupabase } = await import('./utils');
                const supabase = getSupabase(env);
                const { data, error } = await supabase!
                    .from('game_configs')
                    .select('*')
                    .eq('is_active', true)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();
                if (error || !data) {
                    return jsonResponse({
                        version: 'v0.0.0',
                        rules: { ande_zig: { timer: 30, entry_fee: 10 }, hulet_zig: { timer: 45, entry_fee: 20 }, mulu_zig: { timer: 60, entry_fee: 50 } },
                        features: { chat_enabled: false }
                    });
                }

                // HARDEN: Filter stale announcements OR announcements for ended events
                let announcement = data.features?.announcement;
                if (announcement && announcement.enabled) {
                    const createdAt = new Date(announcement.created_at || data.updated_at || data.created_at);
                    const now = new Date();
                    const ageHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

                    // 1. Time-based stale check (Reduce to 24h to be more aggressive)
                    if (ageHours > 24) {
                        announcement = null;
                    } else if (announcement.action_url) {
                        const actionUrl = announcement.action_url.toLowerCase();

                        // 2. Logic-based check if announcement is tied to an event/tournament
                        if (actionUrl.includes('/tournaments')) {
                            const tid = announcement.action_url.split(/\/tournaments\//i)[1]?.split(/[?#/]/)[0];
                            if (tid && tid.length > 20) {
                                const { data: t } = await supabase!.from('public_tournaments_view').select('is_strictly_active').eq('id', tid).single();
                                if (!t || !t.is_strictly_active) announcement = null;
                            } else {
                                const { data: t } = await supabase!.from('public_tournaments_view').select('id').eq('is_strictly_active', true).limit(1);
                                if (!t || t.length === 0) announcement = null;
                            }
                        } else if (actionUrl.includes('/events') || actionUrl.includes('/special-events')) {
                            const eid = announcement.action_url.split(/\/events\/|\/special-events\//i)[1]?.split(/[?#/]/)[0];
                            if (eid && eid.length > 20) {
                                const { data: events } = await supabase!.rpc('get_public_events');
                                const e = (events || []).find((x: any) => x.id === eid);
                                if (!e || !e.is_strictly_active) announcement = null;
                            } else {
                                const { data: events } = await supabase!.rpc('get_public_events');
                                const active = (events || []).filter((e: any) => e.is_strictly_active);
                                if (active.length === 0) announcement = null;
                            }
                        }
                    }

                    // 3. Status check: Any final fallback could go here
                } else if (announcement && !announcement.enabled) {
                    announcement = null;
                }

                return jsonResponse({
                    ...data,
                    announcement: announcement === null ? null : (data.announcement || announcement),
                    features: {
                        ...data.features,
                        announcement
                    }
                });
            }
        }

        // --- PUBLIC CONFIG ROUTE ---
        if (url.pathname === '/config/latest') {
            const { getSupabase } = await import('./utils');
            const supabase = getSupabase(env);
            const { data, error } = await supabase!
                .from('game_configs')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error || !data) {
                return jsonResponse({
                    version: 'v0.0.0',
                    rules: { ande_zig: { timer: 30, entry_fee: 10 }, hulet_zig: { timer: 45, entry_fee: 20 }, mulu_zig: { timer: 60, entry_fee: 50 } },
                    features: { chat_enabled: false }
                });
            }

            // HARDEN: Filter stale announcements OR announcements for ended events
            let announcement = data.features?.announcement;
            if (announcement && announcement.enabled) {
                const createdAt = new Date(announcement.created_at || data.updated_at || data.created_at);
                const now = new Date();
                const ageHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

                // 1. Time-based stale check (24h)
                if (ageHours > 24) {
                    announcement = null;
                } else if (announcement.action_url) {
                    const actionUrl = announcement.action_url.toLowerCase();

                    // 2. Logic-based check if announcement is tied to an event/tournament
                    if (actionUrl.includes('/tournaments')) {
                        const tid = announcement.action_url.split(/\/tournaments\//i)[1]?.split(/[?#/]/)[0];
                        if (tid && tid.length > 20) {
                            const { data: t } = await supabase!.from('public_tournaments_view').select('is_strictly_active').eq('id', tid).single();
                            if (!t || !t.is_strictly_active) announcement = null;
                        } else {
                            const { data: t } = await supabase!.from('public_tournaments_view').select('id').eq('is_strictly_active', true).limit(1);
                            if (!t || t.length === 0) announcement = null;
                        }
                    } else if (actionUrl.includes('/events') || actionUrl.includes('/special-events')) {
                        const eid = announcement.action_url.split(/\/events\/|\/special-events\//i)[1]?.split(/[?#/]/)[0];
                        if (eid && eid.length > 20) {
                            const { data: events } = await supabase!.rpc('get_public_events');
                            const e = (events || []).find((x: any) => x.id === eid);
                            if (!e || !e.is_strictly_active) announcement = null;
                        } else {
                            const { data: events } = await supabase!.rpc('get_public_events');
                            const active = (events || []).filter((e: any) => e.is_strictly_active);
                            if (active.length === 0) announcement = null;
                        }
                    }
                }
            } else if (announcement && !announcement.enabled) {
                announcement = null;
            }

            return jsonResponse({
                ...data,
                features: {
                    ...data.features,
                    announcement
                }
            });
        }

        // Bot webhook
        if (url.pathname === '/bot/webhook' || url.pathname === '/webhook-v2-secure-99') {
            return handleBotWebhook(request, env);
        }

        // Update menu button
        if (url.pathname === '/bot/update-menu' && request.method === 'POST') {
            const { updateBotMenuButton } = await import('./bot/utils');
            return updateBotMenuButton(env);
        }

        // WebSocket
        if (url.pathname.startsWith('/ws/game/')) {
            const gameId = url.pathname.split('/').pop();
            if (!gameId) return jsonResponse({ error: 'Game ID required' }, 400);
            const id = env.GAME_ROOM.idFromName(gameId);
            return env.GAME_ROOM.get(id).fetch(request);
        }

        return jsonResponse({ error: 'Not found' }, 404);
    },

    // Add scheduled handler to silence errors
    async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
        try {
            const { processDripCampaign, processActiveCampaigns } = await import('./marketing/dripScheduler');
            await processDripCampaign(env);
            await processActiveCampaigns(env);
        } catch (error) {
            console.error('[CRON] Error:', error);
        }
    },
};
