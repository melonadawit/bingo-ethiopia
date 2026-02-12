
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manual env parsing
const envPath = path.resolve(__dirname, '../.dev.vars');
const envContent = fs.readFileSync(envPath, 'utf8');
const envConfig = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^"(.*)"$/, '$1');
        envConfig[key] = value;
    }
});

const SUPABASE_URL = envConfig.SUPABASE_URL;
const SUPABASE_KEY = envConfig.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function updateBets() {
    console.log('Updating game mode bets...');

    const updates = [
        { id: 'ande-zig', min_bet: 10 },
        { id: 'hulet-zig', min_bet: 20 },
        { id: 'mulu-zig', min_bet: 50 },
    ];

    for (const update of updates) {
        const { error } = await supabase
            .from('game_modes')
            .update({ min_bet: update.min_bet })
            .eq('id', update.id);

        if (error) {
            console.error(`Failed to update ${update.id}:`, error);
        } else {
            console.log(`Updated ${update.id} to ${update.min_bet} Br`);
        }
    }
}

updateBets();
