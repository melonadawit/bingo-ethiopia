import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hthvotvtkqggbdpfrryb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0aHZvdHZ0a3FnZ2JkcGZycnliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTgwMTY5OCwiZXhwIjoyMDgxMzc3Njk4fQ.xfwiBDtCiOyWyiAna9DgiM7mjrbQxcr0loDVwAnATAc'
const supabase = createClient(supabaseUrl, supabaseKey)

async function monitorBotConfig() {
    console.log('=== MONITORING BOT CONFIG ===\n')

    console.log('Current msg_dep_start value in database:')
    const { data } = await supabase
        .from('bot_configs')
        .select('key, value, updated_at')
        .eq('key', 'msg_dep_start')
        .single()

    console.log('Key:', data?.key)
    console.log('Value:', data?.value)
    console.log('Last Updated:', data?.updated_at)

    console.log('\n=== INSTRUCTIONS ===')
    console.log('1. Go to your admin dashboard')
    console.log('2. Change the deposit start message to something like:')
    console.log('   "💰 NEW MESSAGE - Please enter amount"')
    console.log('3. Click Save')
    console.log('4. Come back here and run this script again to see if it changed')
    console.log('\nRun: node monitor_bot_config.js')
}

monitorBotConfig()
