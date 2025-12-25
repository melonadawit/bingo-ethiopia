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
    envConfig.SUPABASE_SERVICE_KEY,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

async function main() {
    console.log("Resetting finance@bing.com...");

    // 1. Get User ID (we know it from previous query but let's fetch by email to be safe)
    // Note: getByEmail is not directly exposed on admin usually, assume we used the ID from before or just listUsers
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error("List Users Error:", error);
        return;
    }

    const financeUser = users.find(u => u.email === 'finance@bing.com');

    if (!financeUser) {
        console.error("User finance@bing.com not found in Auth system!");
        return;
    }

    console.log("Found User ID:", financeUser.id);

    // 2. Update Password & Confirm
    const { data, error: updateError } = await supabase.auth.admin.updateUserById(
        financeUser.id,
        {
            password: 'finance123',
            email_confirm: true,
            user_metadata: { role: 'finance' } // Ensure metadata is sync'd too
        }
    );

    if (updateError) {
        console.error("Update Error:", updateError);
    } else {
        console.log("✅ SUCCESS! Password set to: finance123");
    }
}

main();
