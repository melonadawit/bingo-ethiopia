
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

const envConfig = parseEnv(path.resolve(__dirname, '.env.local'));
const supabase = createClient(envConfig.NEXT_PUBLIC_SUPABASE_URL, envConfig.SUPABASE_SERVICE_KEY);

async function check() {
    const { data, error } = await supabase.from('users').select('*').limit(1);
    if (error) {
        console.error("Error fetching users:", error);
    } else if (data && data.length > 0) {
        console.log("Columns in 'users' table:", Object.keys(data[0]));
        if (Object.keys(data[0]).includes('bot_state')) {
            console.log("SUCCESS: bot_state column exists.");
        } else {
            console.log("FAILURE: bot_state column MISSING.");
        }
    } else {
        console.log("No users found to check columns.");
    }
}

check();
