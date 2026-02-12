import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hthvotvtkqggbdpfrryb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0aHZvdHZ0a3FnZ2JkcGZycnliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTgwMTY5OCwiZXhwIjoyMDgxMzc3Njk4fQ.xfwiBDtCiOyWyiAna9DgiM7mjrbQxcr0loDVwAnATAc'
const supabase = createClient(supabaseUrl, supabaseKey)

async function fixConfig() {
    console.log('Fixing bot configuration...')

    // 1. Reset welcome_message
    const { error: welcomeError } = await supabase
        .from('bot_configs')
        .update({
            value: '👋 እንኳን ወደ ቢንጎ ኢትዮጵያ በደህና መጡ!\\n\\nእባክዎ መጀመሪያ ይመዝገቡ።',
            category: 'onboarding',
            description: 'Welcome message for the bot'
        })
        .eq('key', 'welcome_message')

    if (welcomeError) console.error('Error fixing welcome_message:', welcomeError)
    else console.log('✅ welcome_message restored')

    // 2. Clear any other debug keys if they exist
    const { error: deleteError } = await supabase
        .from('bot_configs')
        .delete()
        .eq('category', 'debug')

    if (deleteError) console.error('Error deleting debug keys:', deleteError)
    else console.log('✅ Debug keys removed')

    console.log('Done.')
}

fixConfig()
