import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const supabaseUrl = 'https://hthvotvtkqggbdpfrryb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0aHZvdHZ0a3FnZ2JkcGZycnliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTgwMTY5OCwiZXhwIjoyMDgxMzc3Njk4fQ.xfwiBDtCiOyWyiAna9DgiM7mjrbQxcr0loDVwAnATAc'
const supabase = createClient(supabaseUrl, supabaseKey)

async function populateBotConfigs() {
    console.log('Populating bot_configs table...')

    const configs = [
        // Onboarding
        { key: 'welcome_message', value: '👋 እንኳን ወደ ቢንጎ ኢትዮጵያ በደህና መጡ!\\n\\nእባክዎ መጀመሪያ ይመዝገቡ።', category: 'onboarding', description: 'Welcome message sent to new users' },
        { key: 'referral_message', value: '🎁 ጓደኛዎን ይጋብዙ እና ቦነስ ያግኙ!', category: 'onboarding', description: 'Referral invite message' },

        // Deposit Flow
        { key: 'msg_dep_start', value: '💰 ማስገባት የሚፈልጉትን መጠን ከ10 ብር ጀምሮ ያስገቡ።', category: 'deposit', description: 'Step 1: Ask deposit amount' },
        { key: 'msg_dep_method', value: 'እባክዎት ማስገባት የሚፈልጉበትን ባንክ ይምረጡ።', category: 'deposit', description: 'Step 2: Choose payment method' },
        { key: 'msg_dep_instructions', value: 'የሚያጋጥማቹ የክፍያ ችግር:\\n@onlineetbingosupport\\n@onlineetbingosupport1 ላይ ፃፉልን።\\n\\n1. ከታች ባለው የቴሌብር አካውንት {amount} ብር ያስገቡ\\n     Phone: 0931503559\\n     Name: Tadese\\n\\n2. የከፈሉበትን አጭር የጹሁፍ መልዕክት(message) copy በማድረግ እዚ ላይ Past አድረገው ያስገቡና ይላኩት👇👇👇', category: 'deposit', description: 'Step 3: Payment instructions' },
        { key: 'msg_dep_confirm', value: '✅ Your deposit Request have been sent to admins please wait 1 min.', category: 'deposit', description: 'Step 4: Deposit request confirmation' },
        { key: 'msg_dep_success', value: '✅ Your deposit of {amount} ETB is confirmed.\\n🧾 Ref: {ref_code}', category: 'deposit', description: 'Step 5: Deposit approved' },
        { key: 'msg_dep_declined', value: '❌ Your deposit of {amount} ETB is Declined.', category: 'deposit', description: 'Step 6: Deposit declined' },

        // Withdrawal Flow
        { key: 'msg_wd_start', value: '💰 ማውጣት የሚፈልጉትን የገንዘብ መጠን ያስገቡ ?', category: 'withdrawal', description: 'Step 1: Ask withdrawal amount' },
        { key: 'msg_wd_min_err', value: 'ዝቅተኛው ማውጣት የምትችሉት መጠን {min} ብር ነው።', category: 'withdrawal', description: 'Error: Amount below minimum' },
        { key: 'msg_wd_max_err', value: 'ከፍተኛው ማውጣት የምትችሉት መጠን {max} ብር ነው።', category: 'withdrawal', description: 'Error: Amount above maximum' },
        { key: 'msg_wd_bal_err', value: '❌ በቂ ባላንስ የለዎትም!\\n\\n💳 የእርስዎ ባላንስ: {balance} ብር\\n💰 የጠየቁት መጠን: {amount} ብር', category: 'withdrawal', description: 'Error: Insufficient balance' },
        { key: 'msg_wd_bank', value: 'እባክዎን የሚያወጡበትን ባንክ ይምረጡ', category: 'withdrawal', description: 'Step 2: Choose bank for withdrawal' },
        { key: 'msg_wd_confirm', value: '✅ Your withdrawal Request have been sent to admins please wait 1 min.', category: 'withdrawal', description: 'Step 3: Withdrawal request confirmation' },
        { key: 'msg_wd_success', value: '✅ Your withdrawal of {amount} ETB is confirmed.\\n🧾 Ref: {ref_code}', category: 'withdrawal', description: 'Step 4: Withdrawal approved' },
        { key: 'msg_wd_declined', value: '❌ Withdrawal Declined\\n\\nYour withdrawal of {amount} Birr was declined and refunded.\\n\\n💳 Current Balance: {balance} Birr\\n\\nPlease contact support if you believe this was an error.', category: 'withdrawal', description: 'Step 5: Withdrawal declined' },

        // Game Messages
        { key: 'msg_game_waiting', value: '⏳ Waiting for players to join...', category: 'game', description: 'Lobby waiting message' },
        { key: 'msg_game_start', value: '🎮 Game Started! Good luck!', category: 'game', description: 'Game start announcement' },
        { key: 'msg_game_win', value: '🏆 BINGO! {winner} won the game!', category: 'game', description: 'Winner announcement' },
    ]

    for (const config of configs) {
        const { error } = await supabase
            .from('bot_configs')
            .upsert(config, { onConflict: 'key' })

        if (error) {
            console.error(`Error inserting ${config.key}:`, error)
        } else {
            console.log(`✓ ${config.key}`)
        }
    }

    console.log('\\nDone! Verifying...')
    const { data, count } = await supabase
        .from('bot_configs')
        .select('*', { count: 'exact' })

    console.log(`Total configs in database: ${count}`)
}

populateBotConfigs()
