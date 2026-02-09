
import { Env } from '../types';
import { getSupabase } from '../utils';
import { sendMessage, sendPhoto } from '../bot/utils';

interface DripStep {
    id: string;
    type: 'EMAIL' | 'SMS' | 'TELEGRAM' | 'WAIT';
    label: string;
    details: string;
    message?: string;
    delay?: string;
}

export async function processDripCampaign(env: Env) {
    const supabase = getSupabase(env);

    // 1. Get Drip Sequence
    const { data: config } = await supabase!
        .from('bot_configs')
        .select('value')
        .eq('key', 'drip_sequence')
        .single();

    if (!config?.value) {
        console.log('[DRIP] No sequence configured.');
        return;
    }

    const sequence = JSON.parse(config.value) as DripStep[];
    if (sequence.length === 0) return;

    // 2. Calculate offsets
    // efficient way: iterate and accumulate time
    let accumulatedMs = 0;

    for (let i = 0; i < sequence.length; i++) {
        const step = sequence[i];

        if (step.type === 'WAIT') {
            const delayStr = step.delay || '24h';
            const unit = delayStr.slice(-1);
            const val = parseInt(delayStr.slice(0, -1));
            let ms = 0;
            if (unit === 'h') ms = val * 60 * 60 * 1000;
            if (unit === 'd') ms = val * 24 * 60 * 60 * 1000;
            accumulatedMs += ms;
            continue;
        }

        if (step.type === 'TELEGRAM') {
            // This step should be sent after `accumulatedMs` from signup
            // Target Window: Users who joined approx `accumulatedMs` ago, but we check "older than X" and "not sent yet"

            const cutoffDate = new Date(Date.now() - accumulatedMs);
            const bufferWindow = 2 * 60 * 60 * 1000; // Look back 2 extra hours (grace period)
            // Actually, we just need users joined BEFORE cutoffDate.
            // AND user has NOT received this step.

            // To be safe and not scan millions, maybe limit to those joined in last 30 days?
            const reasonableStart = new Date(Date.now() - accumulatedMs - (30 * 24 * 60 * 60 * 1000));

            // Finding users who:
            // 1. Joined BEFORE cutoffDate (so they are "old enough")
            // 2. NOT in user_drip_progress for this step_id

            // Using a stored procedure or complex query is best, but let's try a robust select.
            // "Select users created < cutoff, exclude users in drip table"

            // Supabase/PostgREST doesn't support NOT IN efficiently on joined tables easily in one GET.
            // RPC is best here.

            try {
                // We'll call an RPC function for atomicity and speed
                const { data: userIds, error } = await supabase!.rpc('get_users_for_drip', {
                    max_created_at: cutoffDate.toISOString(),
                    target_step_id: step.id,
                    limit_count: 50 // Process 50 at a time per hour to avoid blocking
                });

                if (error) {
                    console.error('[DRIP] RPC Error:', error);
                    continue;
                }

                if (!userIds || userIds.length === 0) continue;

                console.log(`[DRIP] Processing step ${step.id} for ${userIds.length} users.`);

                // Send messages
                for (const user of userIds) {
                    try {
                        if (user.telegram_id && step.message) {
                            await sendMessage(Number(user.telegram_id), step.message, env);

                            // Mark as sent
                            await supabase!.from('user_drip_progress').insert({
                                user_id: user.id,
                                step_id: step.id
                            });
                        }
                    } catch (e) {
                        console.error(`[DRIP] Failed for user ${user.id}:`, e);
                    }
                }

            } catch (e) {
                console.error('[DRIP] Processing error:', e);
            }
        }

    }
}

export async function processActiveCampaigns(env: Env) {
    const supabase = getSupabase(env);

    // 1. Fetch 'active' campaigns
    const { data: campaigns } = await supabase!
        .from('marketing_campaigns')
        .select('*')
        .eq('status', 'active');

    if (!campaigns || campaigns.length === 0) return;

    console.log(`[CAMPAIGN] Found ${campaigns.length} active campaigns.`);

    for (const campaign of campaigns) {
        console.log(`[CAMPAIGN] Processing ${campaign.id} (${campaign.name})`);

        const message = campaign.message_template || campaign.message;
        if (!message && !campaign.media_url) {
            // Invalid campaign
            await supabase!.from('marketing_campaigns').update({ status: 'failed' }).eq('id', campaign.id);
            continue;
        }

        // Construct Keyboard
        let replyMarkup = undefined;
        if (campaign.button_text && campaign.action_url) {
            replyMarkup = {
                inline_keyboard: [[
                    { text: campaign.button_text, url: campaign.action_url }
                ]]
            };
        }

        // 2. Fetch Audience
        const { data: users } = await supabase!
            .from('users')
            .select('id, telegram_id')
            .not('telegram_id', 'is', null)
            .limit(100)
            .order('created_at', { ascending: false });

        if (users && users.length > 0) {
            let sent = 0;
            for (const user of users) {
                if (user.telegram_id) {
                    try {
                        if (campaign.media_url) {
                            await sendPhoto(Number(user.telegram_id), campaign.media_url, message || '', env, replyMarkup);
                        } else {
                            await sendMessage(Number(user.telegram_id), message, env, replyMarkup);
                        }
                        sent++;
                    } catch (e) {
                        console.error(`[CAMPAIGN] Failed to send to ${user.telegram_id}:`, e);
                    }
                }
            }

            // Update progress & Mark Completed (Assume batch finished for MVP)
            await supabase!
                .from('marketing_campaigns')
                .update({
                    sent_count: (campaign.sent_count || 0) + sent,
                    status: 'completed'
                })
                .eq('id', campaign.id);

            console.log(`[CAMPAIGN] Finished ${campaign.id}. Sent: ${sent}`);
        } else {
            await supabase!.from('marketing_campaigns').update({ status: 'completed' }).eq('id', campaign.id);
        }
    }
}
