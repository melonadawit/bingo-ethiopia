const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://hthvotvtkqggbdpfrryb.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0aHZvdHZ0a3FnZ2JkcGZycnliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImh0aHZvdHZ0a3FnZ2JkcGZycnliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImh0aHZvdHZ0a3FnZ2JkcGZycnliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSJ9.xfwiBDtCiOyWyiAna9DgiM7mjrbQxcr0loDVwAnATAc';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
    try {
        const { data: configs, error: configError } = await supabase
            .from('bot_configs')
            .select('*')
            .in('key', ['admin_ids', 'bot_settings.maintenance_mode']);

        console.log('Configs:', JSON.stringify(configs, null, 2));

    } catch (e) {
        console.error(e);
    }
}

main();
