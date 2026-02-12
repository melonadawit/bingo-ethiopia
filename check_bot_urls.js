const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://hthvotvtkqggbdpfrryb.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0aHZvdHZ0a3FnZ2JkcGZycnliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTgwMTY5OCwiZXhwIjoyMDgxMzc3Njk4fQ.xfwiBDtCiOyWyiAna9DgiM7mjrbQxcr0loDVwAnATAc";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkConfigs() {
    console.log('Checking bot_configs for old URLs...');
    const { data: configs, error } = await supabase
        .from('bot_configs')
        .select('*');

    if (error) {
        console.error('Error fetching configs:', error);
        return;
    }

    const oldUrl = 'bingo-ethiopia.pages.dev';
    const newUrl = 'main.bingo-ethiopia.pages.dev';

    for (const config of configs) {
        if (typeof config.value === 'string' && config.value.includes(oldUrl)) {
            console.log(`Found old URL in key: ${config.key}`);
            console.log(`Original value: ${config.value}`);

            const newValue = config.value.replace(new URLSearchParams({ v: 'v3.8-SYNCED' }).toString(), new URLSearchParams({ v: 'v3.9-STABLE' }).toString())
                .split(oldUrl).join(newUrl);

            console.log(`Target value: ${newValue}`);

            // Uncomment to actually update
            const { error: updateError } = await supabase
                .from('bot_configs')
                .update({ value: newValue })
                .eq('key', config.key);

            if (updateError) {
                console.error(`Error updating ${config.key}:`, updateError);
            } else {
                console.log(`Successfully updated ${config.key}`);
            }
        }
    }
}

checkConfigs();
