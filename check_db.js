const { createClient } = require('@supabase/supabase-js');

async function checkConfig() {
    const supabase = createClient(
        'https://hthvotvtkqggbdpfrryb.supabase.co',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0aHZvdHZ0a3FnZ2JkcGZycnliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTgwMTY5OCwiZXhwIjoyMDgxMzc3Njk4fQ.xfwiBDtCiOyWyiAna9DgiM7mjrbQxcr0loDVwAnATAc'
    );

    const { data: config } = await supabase
        .from('game_configs')
        .select('*')
        .order('id', { ascending: false })
        .limit(1)
        .single();

    console.log('--- LATEST CONFIG ---');
    console.log(JSON.stringify(config, null, 2));

    const { data: tournaments } = await supabase
        .from('tournaments')
        .select('id, title, status, end_time');

    console.log('\n--- TOURNAMENTS (ALL) ---');
    console.log(tournaments);

    const { data: activeT } = await supabase
        .from('public_tournaments_view')
        .select('*')
        .eq('is_strictly_active', true);

    console.log('\n--- ACTIVE TOURNAMENTS (VIEW) ---');
    console.log(activeT);
}

checkConfig();
