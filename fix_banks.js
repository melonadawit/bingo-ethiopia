
const { createClient } = require('@supabase/supabase-js');

async function main() {
    const supabaseUrl = 'https://hthvotvtkqggbdpfrryb.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || '';

    if (!supabaseKey) {
        console.error('SUPABASE_SERVICE_KEY is missing');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Fetching current configs...');
    const { data: configs } = await supabase.from('bot_configs').select('*');

    const configMap = new Map(configs.map(c => [c.key, c.value]));

    // 1. Clean up botPaymentMethods (Remove BOA, ensure enabled status)
    const rawBotMethods = configMap.get('botPaymentMethods') || '[]';
    let botMethods = [];
    try {
        botMethods = typeof rawBotMethods === 'string' ? JSON.parse(rawBotMethods) : rawBotMethods;
    } catch (e) { botMethods = []; }

    // Filter out 'boa' and ensure others have enabled field
    const cleanedBotMethods = botMethods
        .filter(m => m.key !== 'boa')
        .map(m => ({
            ...m,
            enabled: m.enabled !== undefined ? m.enabled : true
        }));

    console.log('Updating botPaymentMethods...');
    await supabase.from('bot_configs').upsert({ key: 'botPaymentMethods', value: JSON.stringify(cleanedBotMethods) });

    // 2. Clean up payment_methods object
    const rawPaymentMethods = configMap.get('payment_methods') || '{}';
    let paymentMethods = {};
    try {
        paymentMethods = typeof rawPaymentMethods === 'string' ? JSON.parse(rawPaymentMethods) : rawPaymentMethods;
    } catch (e) { paymentMethods = {}; }

    delete paymentMethods['boa'];
    // Ensure all have enabled: true/false
    Object.keys(paymentMethods).forEach(k => {
        if (paymentMethods[k].enabled === undefined) paymentMethods[k].enabled = true;
    });

    console.log('Updating payment_methods...');
    await supabase.from('bot_configs').upsert({ key: 'payment_methods', value: JSON.stringify(paymentMethods) });

    console.log('Done cleaning up bank methods!');
}

main();
