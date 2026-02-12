
const { createClient } = require('@supabase/supabase-js');

async function main() {
    const supabaseUrl = 'https://hthvotvtkqggbdpfrryb.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Keys that are redundant now because we have authoritative visual flow keys
    const keysToDelete = [
        'botFlows.onboarding.welcome',
        'bot_flows',
        'botFlows.referral.share_message',
        'bot_settings.welcome_message'
    ];

    console.log('Cleaning up redundant config keys...');

    for (const key of keysToDelete) {
        const { error } = await supabase.from('bot_configs').delete().eq('key', key);
        if (error) {
            console.error(`Error deleting ${key}:`, error);
        } else {
            console.log(`Deleted ${key}`);
        }
    }
}

main();
