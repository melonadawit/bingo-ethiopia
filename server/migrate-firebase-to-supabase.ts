import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Firebase Admin
const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as any),
});

const firestore = admin.firestore();

// Initialize Supabase
const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

async function migrateUsers() {
    console.log('🔄 Migrating users...');

    const usersSnapshot = await firestore.collection('users').get();
    let count = 0;

    for (const doc of usersSnapshot.docs) {
        const data = doc.data();

        try {
            const { error } = await supabase
                .from('users')
                .upsert({
                    id: doc.id,
                    telegram_id: data.telegramId || data.telegram_id,
                    username: data.username,
                    first_name: data.firstName || data.first_name,
                    last_name: data.lastName || data.last_name,
                    balance: data.balance || 1000,
                    total_games_played: data.totalGamesPlayed || 0,
                    total_wins: data.totalWins || 0,
                    total_winnings: data.totalWinnings || 0,
                });

            if (error) {
                console.error(`Error migrating user ${doc.id}:`, error.message);
            } else {
                count++;
            }
        } catch (error: any) {
            console.error(`Failed to migrate user ${doc.id}:`, error.message);
        }
    }

    console.log(`✅ Migrated ${count} users`);
}

async function migrateDailyRewards() {
    console.log('🔄 Migrating daily rewards...');

    const rewardsSnapshot = await firestore.collection('dailyRewards').get();
    let count = 0;

    for (const doc of rewardsSnapshot.docs) {
        const data = doc.data();

        try {
            const { error } = await supabase
                .from('daily_rewards')
                .upsert({
                    user_id: doc.id,
                    last_claim_date: data.lastClaimDate,
                    current_streak: data.currentStreak || 0,
                    longest_streak: data.longestStreak || 0,
                    total_claimed: data.totalClaimed || 0,
                    total_rewards: data.totalRewards || 0,
                });

            if (error) {
                console.error(`Error migrating reward ${doc.id}:`, error.message);
            } else {
                count++;
            }
        } catch (error: any) {
            console.error(`Failed to migrate reward ${doc.id}:`, error.message);
        }
    }

    console.log(`✅ Migrated ${count} daily rewards`);
}

async function migrateGames() {
    console.log('🔄 Migrating games...');

    const gamesSnapshot = await firestore.collection('games').get();
    let count = 0;

    for (const doc of gamesSnapshot.docs) {
        const data = doc.data();

        try {
            const { error } = await supabase
                .from('games')
                .upsert({
                    id: doc.id,
                    mode: data.mode || 'ande-zig',
                    status: data.status || 'ended',
                    entry_fee: data.entryFee || 10,
                    prize_pool: data.prizePool || 0,
                    created_at: data.createdAt?.toDate?.() || new Date(),
                    started_at: data.startedAt?.toDate?.(),
                    ended_at: data.endedAt?.toDate?.(),
                });

            if (error) {
                console.error(`Error migrating game ${doc.id}:`, error.message);
            } else {
                count++;
            }
        } catch (error: any) {
            console.error(`Failed to migrate game ${doc.id}:`, error.message);
        }
    }

    console.log(`✅ Migrated ${count} games`);
}

async function migrateAll() {
    console.log('🚀 Starting Firebase → Supabase migration...\n');

    try {
        await migrateUsers();
        await migrateDailyRewards();
        await migrateGames();

        console.log('\n🎉 Migration complete!');
        console.log('\nNext steps:');
        console.log('1. Verify data in Supabase dashboard');
        console.log('2. Test V2 server with migrated data');
        console.log('3. Deploy to Railway');
    } catch (error) {
        console.error('❌ Migration failed:', error);
    }

    process.exit(0);
}

migrateAll();
