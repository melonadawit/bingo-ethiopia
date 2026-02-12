
import { Env } from '../types';

export class AutomationService {

    // Post an Image (Buffer) to Telegram
    static async postPhotoToChannel(env: Env, channelId: string, photoBuffer: Uint8Array, caption: string): Promise<any> {
        const formData = new FormData();

        // Create Blob from buffer (Cloudflare Workers supports standard Blob)
        const blob = new Blob([photoBuffer], { type: 'image/png' });
        formData.append('photo', blob, 'image.png');
        formData.append('chat_id', channelId);
        formData.append('caption', caption);
        formData.append('parse_mode', 'HTML');

        const token = env.TELEGRAM_BOT_TOKEN;
        const url = `https://api.telegram.org/bot${token}/sendPhoto`;

        const res = await fetch(url, {
            method: 'POST',
            body: formData,
        });

        const data = await res.json() as any;
        if (!data.ok) {
            console.error('Failed to post photo to Telegram:', data);
            throw new Error(`Telegram Error: ${data.description}`);
        }
        return data;
    }

    // Helper to post a text message
    static async postMessageToChannel(env: Env, channelId: string, text: string): Promise<any> {
        const token = env.TELEGRAM_BOT_TOKEN;
        const url = `https://api.telegram.org/bot${token}/sendMessage`;

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: channelId,
                text: text,
                parse_mode: 'HTML'
            })
        });

        return await res.json();
    }
}
