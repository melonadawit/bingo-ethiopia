
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://hthvotvtkqggbdpfrryb.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0aHZvdHZ0a3FnZ2JkcGZycnliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTgwMTY5OCwiZXhwIjoyMDgxMzc3Njk4fQ.xfwiBDtCiOyWyiAna9DgiM7mjrbQxcr0loDVwAnATAc";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPersistence() {
    console.log("--- Testing Persistence (last_name hack) ---");
    const testId = 336997351; // Use Admin ID or a test ID
    const sampleState = { flow: 'deposit', step: 'amount', data: { foo: 'bar' }, timestamp: Date.now() };

    console.log(`1. Writing state to last_name for user ${testId}...`);
    const { error: writeError } = await supabase
        .from('users')
        .update({ last_name: JSON.stringify(sampleState) })
        .eq('telegram_id', testId);

    if (writeError) {
        console.error("❌ Write Failed:", writeError);
    } else {
        console.log("✅ Write Successful");
    }

    console.log(`2. Reading state back...`);
    const { data: user, error: readError } = await supabase
        .from('users')
        .select('last_name')
        .eq('telegram_id', testId)
        .single();

    if (readError) {
        console.error("❌ Read Failed:", readError);
    } else {
        console.log("✅ Read Result:", user.last_name);
        try {
            const parsed = JSON.parse(user.last_name);
            if (parsed.timestamp === sampleState.timestamp) {
                console.log("✅ State MATCHES! Persistence is working.");
            } else {
                console.log("❌ State MISMATCH.");
            }
        } catch (e) {
            console.error("❌ JSON Parse Error:", e);
        }
    }
}

async function testConfig() {
    console.log("\n--- Testing Config (bot_configs) ---");
    const { data: configs, error } = await supabase.from('bot_configs').select('*');
    if (error) {
        console.error("❌ Config Fetch Failed:", error);
        return;
    }

    console.log(`Fetched ${configs.length} configs.`);
    const paymentMethods = configs.find(c => c.key === 'bot_payment_methods' || c.key === 'botPaymentMethods');
    if (paymentMethods) {
        console.log("✅ Found Payment Methods Config:", paymentMethods.key);
        console.log("Value:", paymentMethods.value);
    } else {
        console.log("❌ Payment Methods Config NOT FOUND (checked 'bot_payment_methods' and 'botPaymentMethods')");
    }
}

async function main() {
    await testPersistence();
    await testConfig();
}

main();
