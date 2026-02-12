
const { createClient } = require('@supabase/supabase-js');

async function main() {
    const supabaseUrl = 'https://hthvotvtkqggbdpfrryb.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || ''; // I saw this in .env.local

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase.from('bot_configs').select('*');
    if (error) {
        console.error('Error fetching configs:', error);
        return;
    }

    console.log('--- BOT CONFIGS ---');
    data.forEach(c => {
        console.log(`Key: ${c.key}`);
        console.log(`Value: ${c.value}`);
        console.log('---');
    });
}

main();
