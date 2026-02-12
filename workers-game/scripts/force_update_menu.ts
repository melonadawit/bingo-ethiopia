
import { updateBotMenuButton } from '../src/bot/utils';
import { Env } from '../src/types';

// Mock Env
const env: Env = {
    // We only need BOT_TOKEN for this
    BOT_TOKEN: '8214698066:AAFVjf2wjI1KcxXq0jKYXcjNyIYEMmiXvYE', // Real token from wrangler.toml
    // Others not needed for this specific util
    SUPABASE_URL: '',
    SUPABASE_KEY: '',
    UPSTASH_REDIS_REST_URL: '',
    UPSTASH_REDIS_REST_TOKEN: '',
    GAME_ROOM: {} as any,
    PLAYER_TRACKER: {} as any
};

async function run() {
    console.log('🔄 Forcing Menu Button Update...');
    try {
        const result = await updateBotMenuButton(env);
        console.log('✅ Update Result:', JSON.stringify(result, null, 2));
    } catch (e) {
        console.error('❌ Failed:', e);
    }
}

run();
