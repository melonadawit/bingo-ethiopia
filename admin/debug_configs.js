const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function parseEnv(filePath) {
    if (!fs.existsSync(filePath)) return {};
    const content = fs.readFileSync(filePath, 'utf8');
    const env = {};
    content.split(/\r?\n/).forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) env[match[1].trim()] = match[2].trim().replace(/^"(.*)"$/, '$1');
    });
    return env;
}

const envPath = path.resolve(__dirname, '.env.local');
const envConfig = parseEnv(envPath);

// Hack: Use the values I know since .env.local might only have public keys
const SUPABASE_URL = envConfig.NEXT_PUBLIC_SUPABASE_URL || 'https://hthvotvtkqggbdpfrryb.supabase.co';
const SUPABASE_SERVICE_KEY = envConfig.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0aHZvdHZ0a3FnZ2JkcGZycnliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTgwMTY5OCwiZXhwIjoyMDgxMzc3Njk4fQ.xfwiBDtCiOyWyiAna9DgiM7mjrbQxcr0loDVwAnATAc';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
    console.log("Checking bot_configs...");
    const { data: botConfigs, error: botError } = await supabase.from('bot_configs').select('*');
    if (botError) console.error("bot_configs error:", botError);
    else console.log("bot_configs:", JSON.stringify(botConfigs, null, 2));

    console.log("\nChecking game_configs (active)...");
    const { data: gameConfigs, error: gameError } = await supabase.from('game_configs').select('*').eq('is_active', true);
    if (gameError) console.error("game_configs error:", gameError);
    else console.log("game_configs:", JSON.stringify(gameConfigs, null, 2));
}

main();
