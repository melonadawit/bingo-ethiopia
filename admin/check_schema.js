
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://hthvotvtkqggbdpfrryb.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0aHZvdHZ0a3FnZ2JkcGZycnliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTgwMTY5OCwiZXhwIjoyMDgxMzc3Njk4fQ.xfwiBDtCiOyWyiAna9DgiM7mjrbQxcr0loDVwAnATAc";

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Checking Supabase Schema...");

    // 1. Check Users Table Columns
    const { data: user, error } = await supabase.from('users').select('*').limit(1).maybeSingle();

    if (error) {
        console.error("Error selecting from users:", error);
    } else if (user) {
        console.log("Existing columns in 'users' table:", Object.keys(user));
    } else {
        console.log("Users table is empty, cannot infer columns from row.");
    }

    // 2. Try to add column via RPC if needed
    if (!user || !user.hasOwnProperty('bot_state')) {
        console.log("Column 'bot_state' missing. Attempting to add...");

        const { error: rpcError } = await supabase.rpc('exec_sql', {
            sql_query: "ALTER TABLE users ADD COLUMN IF NOT EXISTS bot_state JSONB;"
        });

        if (rpcError) {
            console.error("RPC exec_sql failed:", rpcError.message);
            // Fallback: Create a dedicated table?
        } else {
            console.log("✅ Successfully added 'bot_state' column via RPC!");
        }
    } else {
        console.log("✅ 'bot_state' column already exists!");
    }
}

check();
