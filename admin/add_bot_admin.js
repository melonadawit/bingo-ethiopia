const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manual Env Parser
function parseEnv(filePath) {
    if (!fs.existsSync(filePath)) return {};
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
const envConfig = parseEnv(envPath);

const supabase = createClient(
    envConfig.NEXT_PUBLIC_SUPABASE_URL,
    envConfig.SUPABASE_SERVICE_KEY
);

async function main() {
    const newAdminId = process.argv[2];
    if (!newAdminId) {
        console.error("Usage: node add_bot_admin.js <TELEGRAM_ID>");
        process.exit(1);
    }

    console.log(`Adding Telegram ID ${newAdminId} to bot admins...`);

    // 1. Fetch current config
    const { data: rows, error: fetchError } = await supabase
        .from('bot_configs')
        .select('*')
        .eq('key', 'admin_ids')
        .single();

    let currentIds = [336997351]; // Default
    if (rows && rows.value) {
        try {
            currentIds = JSON.parse(rows.value);
        } catch (e) {
            console.warn("Could not parse existing admin_ids, resetting to default + new.");
        }
    }

    // 2. Add new ID if unique
    const numericId = parseInt(newAdminId);
    if (!currentIds.includes(numericId)) {
        currentIds.push(numericId);

        // 3. Update DB
        const { error: updateError } = await supabase
            .from('bot_configs')
            .upsert({ key: 'admin_ids', value: JSON.stringify(currentIds) }, { onConflict: 'key' });

        if (updateError) {
            console.error("Error updating DB:", updateError);
        } else {
            console.log(`✅ Success! Updated Admin IDs: ${JSON.stringify(currentIds)}`);
        }
    } else {
        console.log("⚠️ ID already exists in admin list.");
    }
}

main();
