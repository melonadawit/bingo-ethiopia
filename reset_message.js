import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hthvotvtkqggbdpfrryb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0aHZvdHZ0a3FnZ2JkcGZycnliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTgwMTY5OCwiZXhwIjoyMDgxMzc3Njk4fQ.xfwiBDtCiOyWyiAna9DgiM7mjrbQxcr0loDVwAnATAc'
const supabase = createClient(supabaseUrl, supabaseKey)

async function resetToNormalMessage() {
    console.log('=== RESETTING TO NORMAL MESSAGE ===\n')

    const normalMessage = '💰 ማስገባት የሚፈልጉትን መጠን ከ10 ብር ጀምሮ ያስገቡ።'

    console.log('Resetting msg_dep_start to normal message...')
    await supabase
        .from('bot_configs')
        .update({ value: normalMessage })
        .eq('key', 'msg_dep_start')

    console.log('✓ Reset complete!')
    console.log('\nNow you can test the admin dashboard:')
    console.log('1. Go to your admin dashboard')
    console.log('2. Navigate to Bot Configuration page')
    console.log('3. Change the deposit start message')
    console.log('4. Click Save')
    console.log('5. Send /deposit to your bot')
    console.log('6. The bot should show your new message!')
}

resetToNormalMessage()
