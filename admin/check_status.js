const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://hthvotvtkqggbdpfrryb.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0aHZvdHZ0a3FnZ2JkcGZycnliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTgwMTY5OCwiZXhwIjoyMDgxMzc3Njk4fQ.xfwiBDtCiOyWyiAna9DgiM7mjrbQxcr0loDVwAnATAc';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
    try {
        const { data: configs, error: configError } = await supabase
            .from('bot_configs')
            .select('*')
            .in('key', ['bot_settings.maintenance_mode', 'welcome_message', 'bot_settings.welcome_message']);

        console.log('Bot Configs Keys:', configs ? configs.map(c => c.key) : 'none');
        console.log('Bot Configs Values:', JSON.stringify(configs, null, 2));

        const { data: users, error: userError } = await supabase
            .from('users')
            .select('telegram_id, username, is_registered')
            .order('updated_at', { ascending: false })
            .limit(5);

        console.log('Recent users:', JSON.stringify(users, null, 2));
    } catch (e) {
        console.error(e);
    }
}

main();
