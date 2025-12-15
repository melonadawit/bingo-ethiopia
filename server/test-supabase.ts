import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

async function testSupabase() {
    console.log('🧪 Testing Supabase Connection...\n');

    try {
        // Test 1: Read game modes
        console.log('Test 1: Reading game modes...');
        const { data: modes, error: modesError } = await supabase
            .from('game_modes')
            .select('*');

        if (modesError) throw modesError;
        console.log('✅ Game Modes:', modes);
        console.log(`   Found ${modes?.length} game modes\n`);

        // Test 2: Create test user
        console.log('Test 2: Creating test user...');
        const testTelegramId = Math.floor(Math.random() * 1000000000);
        const { data: user, error: userError } = await supabase
            .from('users')
            .insert({
                telegram_id: testTelegramId,
                username: 'testuser_' + testTelegramId,
                first_name: 'Test',
                last_name: 'User'
            })
            .select()
            .single();

        if (userError) throw userError;
        console.log('✅ Test User Created:', {
            id: user.id,
            telegram_id: user.telegram_id,
            username: user.username,
            balance: user.balance
        });
        console.log('');

        // Test 3: Read user back
        console.log('Test 3: Reading user back...');
        const { data: users, error: readError } = await supabase
            .from('users')
            .select('*')
            .eq('telegram_id', testTelegramId);

        if (readError) throw readError;
        console.log('✅ User Retrieved:', users?.[0]?.username);
        console.log('');

        // Test 4: Create test game
        console.log('Test 4: Creating test game...');
        const { data: game, error: gameError } = await supabase
            .from('games')
            .insert({
                mode: 'ande-zig',
                entry_fee: 10.00,
                prize_pool: 0,
                status: 'waiting'
            })
            .select()
            .single();

        if (gameError) throw gameError;
        console.log('✅ Test Game Created:', {
            id: game.id,
            mode: game.mode,
            status: game.status
        });
        console.log('');

        // Test 5: Test realtime subscription
        console.log('Test 5: Testing Realtime...');
        const channel = supabase
            .channel('test-channel')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'games'
            }, (payload) => {
                console.log('📡 Realtime event received:', payload.eventType);
            })
            .subscribe((status) => {
                console.log('✅ Realtime Status:', status);
            });

        // Wait a bit then unsubscribe
        await new Promise(resolve => setTimeout(resolve, 2000));
        await supabase.removeChannel(channel);
        console.log('');

        // Test 6: Clean up
        console.log('Test 6: Cleaning up...');
        await supabase.from('users').delete().eq('telegram_id', testTelegramId);
        await supabase.from('games').delete().eq('id', game.id);
        console.log('✅ Cleanup complete\n');

        console.log('🎉 All tests passed! Supabase is ready!\n');
        console.log('Next steps:');
        console.log('1. Update server/.env with Supabase credentials');
        console.log('2. Run: npm install (in server directory)');
        console.log('3. Run: npm run dev');

    } catch (error: any) {
        console.error('❌ Test failed:', error.message);
        console.error('\nTroubleshooting:');
        console.error('1. Check SUPABASE_URL in .env');
        console.error('2. Check SUPABASE_SERVICE_KEY in .env');
        console.error('3. Make sure migration was applied in Supabase dashboard');
        process.exit(1);
    }
}

testSupabase();
