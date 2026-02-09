import { Env } from '../types';
import { jsonResponse } from '../utils';

// Helper functions for Telegram Bot

export const APP_VERSION = 'v3.8-SYNCED'; // Force another refresh

export function getWebAppUrl(userId?: number): string {
    // Standardize: No trailing slash before query params to match user's working "keyboard" link
    // Pattern: https://bingo-ethiopia.pages.dev?v=...
    const baseUrl = 'https://bingo-ethiopia.pages.dev';
    const params = new URLSearchParams();

    if (userId) params.append('tgid', userId.toString());
    params.append('v', APP_VERSION);
    // Add random timestamp to force fresh load inside Telegram WebApp (bypasses strong caching)
    params.append('t', Date.now().toString());

    return `${baseUrl}?${params.toString()}`;
}

export async function sendMessage(chatId: number, text: string, env: Env, replyMarkup?: any) {
    const res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: 'HTML',
            reply_markup: replyMarkup,
        }),
    });
    return await res.json();
}

export async function sendPhoto(chatId: number, photoUrl: string, caption: string, env: Env, replyMarkup?: any) {
    await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            photo: photoUrl,
            caption: caption,
            parse_mode: 'HTML',
            reply_markup: replyMarkup,
        }),
    });
}

export async function answerCallback(callbackQueryId: string, env: Env, text?: string) {
    await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            callback_query_id: callbackQueryId,
            text: text || '',
        }),
    });
}

export async function deleteMessage(chatId: number, messageId: number, env: Env) {
    await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/deleteMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
        }),
    });
}

// Function to update the Menu Button URL programmatically
export async function updateMenuButton(env: Env, webAppUrl: string, menuText: string = '🎮') {
    const response = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/setChatMenuButton`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            menu_button: {
                type: 'web_app',
                text: menuText,
                web_app: {
                    url: webAppUrl
                }
            }
        }),
    });

    const result = await response.json();
    console.log('Menu button update result:', result);
    return result;
}

// Function to set personalized Menu Button for a specific user
export async function setPersonalizedMenuButton(userId: number, env: Env) {
    const webAppUrl = getWebAppUrl(userId);

    try {
        const response = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/setChatMenuButton`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: userId, // Set for this specific user
                menu_button: {
                    type: 'web_app',
                    text: '🎮', // Game Controller Emoji
                    web_app: {
                        url: webAppUrl
                    }
                }
            }),
        });
        const result = await response.json();
        console.log(`Personalized menu button set for ${userId}:`, result);
    } catch (e) {
        console.error(`Failed to set personalized menu button for ${userId}:`, e);
    }
}


// Export function to update menu button (can be called via API endpoint)
export async function updateBotMenuButton(env: Env): Promise<Response> {
    const WEBAPP_URL = getWebAppUrl();
    await updateMenuButton(env, WEBAPP_URL);
    return jsonResponse({ success: true, url: WEBAPP_URL });
}

// [UPDATED] Dynamic Keyboard
export function getMainKeyboard(userId?: number, config?: any) {
    const webAppUrl = getWebAppUrl(userId);

    // Default if no config provided
    const defaultButtons = [
        [{ text: '🎮', web_app: { url: webAppUrl } }],
        [{ text: '💰 Balance' }, { text: '💳 Deposit' }],
        [{ text: '💸 Withdraw' }, { text: '🎁 Referral' }],
        [{ text: '🎁 Daily Bonus' }, { text: '📞 Support' }]
    ];

    if (!config?.botMenuButtons || config.botMenuButtons.length === 0) {
        return {
            keyboard: defaultButtons,
            resize_keyboard: true,
        };
    }

    // Process custom buttons to inject WebApp URL if type is web_app
    const customButtons = config.botMenuButtons.map((row: any[]) =>
        row.map(btn => {
            if (btn.type === 'web_app') {
                return { text: btn.text, web_app: { url: webAppUrl } };
            }
            return { text: btn.text };
        })
    );

    return {
        keyboard: customButtons,
        resize_keyboard: true,
    };
}

export function generateRefCode(prefix: string): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${prefix}-${code}`;
}

export async function generateUniqueReferralCode(supabase: any): Promise<string> {
    let code = '';
    let exists = true;

    while (exists) {
        code = 'BINGO' + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
        const { data } = await supabase
            .from('users')
            .select('referral_code')
            .eq('referral_code', code)
            .single();
        exists = !!data;
    }

    return code;
}

// Bot Identity Updates
export async function setBotInfo(env: Env, name?: string, shortDescription?: string, description?: string) {
    const results = [];

    if (name) {
        const res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/setMyName`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        results.push({ field: 'name', result: await res.json() });
    }

    if (shortDescription) {
        const res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/setMyShortDescription`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ short_description: shortDescription })
        });
        results.push({ field: 'short_description', result: await res.json() });
    }

    if (description) {
        const res = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/setMyDescription`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ description })
        });
        results.push({ field: 'description', result: await res.json() });
    }

    return results;
}
