import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hthvotvtkqggbdpfrryb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0aHZvdHZ0a3FnZ2JkcGZycnliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTgwMTY5OCwiZXhwIjoyMDgxMzc3Njk4fQ.xfwiBDtCiOyWyiAna9DgiM7mjrbQxcr0loDVwAnATAc'
const supabase = createClient(supabaseUrl, supabaseKey)

async function testDirectUpdate() {
    console.log('=== TESTING DIRECT DATABASE UPDATE ===\n')

    // Simulate what the dashboard should do
    const testUpdate = {
        key: 'msg_dep_start',
        value: '💰 DIRECT UPDATE TEST - Enter deposit amount from 10 ETB'
    }

    console.log('1. Updating via direct database call (simulating API worker)...')
    const { data, error } = await supabase
        .from('bot_configs')
        .upsert(testUpdate, { onConflict: 'key' })
        .select()

    if (error) {
        console.error('   ✗ Error:', error)
    } else {
        console.log('   ✓ Success!')
        console.log('   Updated:', data)
    }

    // Verify
    console.log('\n2. Reading back from database...')
    const { data: verify } = await supabase
        .from('bot_configs')
        .select('value')
        .eq('key', 'msg_dep_start')
        .single()

    console.log('   Current value:', verify?.value)

    console.log('\n3. Now test your bot:')
    console.log('   - Send /deposit to your Telegram bot')
    console.log('   - It should say "DIRECT UPDATE TEST"')
    console.log('   - If it does, the bot is working correctly')
    console.log('   - If it doesn\'t, there may be a caching issue')
}

testDirectUpdate()
