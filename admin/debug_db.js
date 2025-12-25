const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manual Env Parser
function parseEnv(filePath) {
    if (!fs.existsSync(filePath)) {
        console.error("File not found:", filePath);
        return {};
    }
    const content = fs.readFileSync(filePath, 'utf8');
    const env = {};
    content.split(/\r?\n/).forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            env[match[1].trim()] = match[2].trim().replace(/^"(.*)"$/, '$1');
        }
    });
    return env;
}

const envPath = path.resolve(__dirname, '.env.local');
console.log("Loading env from:", envPath);
const envConfig = parseEnv(envPath);

console.log("Keys found:", Object.keys(envConfig));

if (!envConfig.NEXT_PUBLIC_SUPABASE_URL || !envConfig.SUPABASE_SERVICE_KEY) {
    console.error("Missing keys! URL present?", !!envConfig.NEXT_PUBLIC_SUPABASE_URL, "Key present?", !!envConfig.SUPABASE_SERVICE_KEY);
    process.exit(1);
}

const supabase = createClient(
    envConfig.NEXT_PUBLIC_SUPABASE_URL,
    envConfig.SUPABASE_SERVICE_KEY
);

async function main() {
    console.log("Querying admin_users...");
    const { data, error } = await supabase.from('admin_users').select('*');
    if (error) console.error(error);
    else console.table(data);
}

main();
