import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hthvotvtkqggbdpfrryb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0aHZvdHZ0a3FnZ2JkcGZycnliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTgwMTY5OCwiZXhwIjoyMDgxMzc3Njk4fQ.xfwiBDtCiOyWyiAna9DgiM7mjrbQxcr0loDVwAnATAc'
const supabase = createClient(supabaseUrl, supabaseKey)

async function finalAudit() {
    console.log('--- RECENT USERS ---')
    const { data: users } = await supabase.from('users').select('*').order('created_at', { ascending: false }).limit(3)
    console.table(users)

    console.log('--- ADMIN_IDS CONFIG ---')
    const { data: adminConfig } = await supabase.from('bot_configs').select('*').eq('key', 'admin_ids').maybeSingle()
    console.log('admin_ids value:', JSON.stringify(adminConfig?.value))

    const { data: welcome } = await supabase.from('bot_configs').select('*').eq('key', 'welcome_message').maybeSingle()
    console.log('welcome_message value:', JSON.stringify(welcome?.value))
}

finalAudit()
