import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hthvotvtkqggbdpfrryb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0aHZvdHZ0a3FnZ2JkcGZycnliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTgwMTY5OCwiZXhwIjoyMDgxMzc3Njk4fQ.xfwiBDtCiOyWyiAna9DgiM7mjrbQxcr0loDVwAnATAc'
const supabase = createClient(supabaseUrl, supabaseKey)

async function audit() {
    console.log('--- RECENT USERS ---')
    const { data: users, error: userError } = await supabase
        .from('users')
        .select('telegram_id, username, is_registered, created_at')
        .order('created_at', { ascending: false })
        .limit(5)

    if (userError) console.error('Error fetching users:', userError)
    else console.table(users)

    console.log('\n--- BOT CONFIGS ---')
    const { data: configs, error: configError } = await supabase
        .from('bot_configs')
        .select('key, value')

    if (configError) console.error('Error fetching configs:', configError)
    else {
        const welcome = configs.find(c => c.key === 'welcome_message')
        console.log('welcome_message:', JSON.stringify(welcome?.value))

        // Check for any other potentially offensive or debug keys
        const debugKeys = configs.filter(c => c.key.toLowerCase().includes('debug') || c.value?.includes('DEBUG'))
        console.log('Debug keys found:', debugKeys.length)
        if (debugKeys.length > 0) console.table(debugKeys)
    }
}

audit()
