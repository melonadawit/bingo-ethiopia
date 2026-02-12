import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hthvotvtkqggbdpfrryb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0aHZvdHZ0a3FnZ2JkcGZycnliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTgwMTY5OCwiZXhwIjoyMDgxMzc3Njk4fQ.xfwiBDtCiOyWyiAna9DgiM7mjrbQxcr0loDVwAnATAc'
const supabase = createClient(supabaseUrl, supabaseKey)

async function testBotConfigUpdate() {
    console.log('=== TESTING BOT CONFIG UPDATE ===\n')

    // 1. Read current value
    console.log('1. Reading current msg_dep_start value...')
    const { data: before } = await supabase
        .from('bot_configs')
        .select('value')
        .eq('key', 'msg_dep_start')
        .single()

    console.log('   Current value:', before?.value)

    // 2. Update to a test value
    const testValue = '💰 TEST MESSAGE - ማስገባት የሚፈልጉትን መጠን ከ10 ብር ጀምሮ ያስገቡ። [UPDATED]'
    console.log('\n2. Updating to test value...')
    await supabase
        .from('bot_configs')
        .update({ value: testValue })
        .eq('key', 'msg_dep_start')

    console.log('   ✓ Updated to:', testValue)

    // 3. Verify update
    console.log('\n3. Verifying update in database...')
    const { data: after } = await supabase
        .from('bot_configs')
        .select('value')
        .eq('key', 'msg_dep_start')
        .single()

    console.log('   Database value:', after?.value)
    console.log('   Match:', after?.value === testValue ? '✓ YES' : '✗ NO')

    console.log('\n=== NEXT STEPS ===')
    console.log('1. Open your Telegram bot')
    console.log('2. Send /deposit command')
    console.log('3. Check if the message says "[UPDATED]" at the end')
    console.log('4. If it does NOT show [UPDATED], the bot worker needs to be redeployed')
    console.log('\nTo redeploy the bot worker:')
    console.log('  cd workers-bot')
    console.log('  npx wrangler deploy')
}

testBotConfigUpdate()
