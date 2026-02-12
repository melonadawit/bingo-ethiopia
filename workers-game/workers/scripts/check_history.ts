
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
const envPath = path.resolve(__dirname, '../.dev.vars');
dotenv.config({ path: envPath });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkHistory() {
    console.log('Checking game_players table...');
    const { data, error, count } = await supabase
        .from('game_players')
        .select('*', { count: 'exact' })
        .limit(5);

    if (error) {
        console.error('Error fetching game_players:', error);
        return;
    }

    console.log(`Total count in game_players: ${count}`);
    console.log('Sample rows:', data);

    console.log('Checking games table...');
    const { data: games, error: gError, count: gCount } = await supabase
        .from('games')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(5);

    console.log(`Total games: ${gCount}`);
    console.log('Recent games:', games);
}

checkHistory();
