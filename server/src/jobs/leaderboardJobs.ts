import cron from 'node-cron';
import { leaderboardService } from '../services/leaderboardService';

/**
 * Initialize all leaderboard cron jobs
 */
export function initializeLeaderboardJobs() {
    console.log('🕐 Initializing leaderboard cron jobs...');

    // Daily reset at midnight (00:00)
    cron.schedule('0 0 * * *', async () => {
        console.log('🏆 Running daily leaderboard reset...');
        try {
            await leaderboardService.distributeRewards('daily');
            await leaderboardService.resetLeaderboard('daily');
            console.log('✅ Daily leaderboard reset complete');
        } catch (error) {
            console.error('❌ Daily leaderboard reset failed:', error);
        }
    });

    // Weekly reset on Monday at midnight
    cron.schedule('0 0 * * 1', async () => {
        console.log('🏆 Running weekly leaderboard reset...');
        try {
            await leaderboardService.distributeRewards('weekly');
            await leaderboardService.resetLeaderboard('weekly');
            console.log('✅ Weekly leaderboard reset complete');
        } catch (error) {
            console.error('❌ Weekly leaderboard reset failed:', error);
        }
    });

    // Monthly reset on 1st of month at midnight
    cron.schedule('0 0 1 * *', async () => {
        console.log('🏆 Running monthly leaderboard reset...');
        try {
            await leaderboardService.distributeRewards('monthly');
            await leaderboardService.resetLeaderboard('monthly');
            console.log('✅ Monthly leaderboard reset complete');
        } catch (error) {
            console.error('❌ Monthly leaderboard reset failed:', error);
        }
    });

    console.log('✅ Leaderboard cron jobs initialized');
    console.log('   - Daily reset: Every day at 00:00');
    console.log('   - Weekly reset: Every Monday at 00:00');
    console.log('   - Monthly reset: 1st of month at 00:00');
}
