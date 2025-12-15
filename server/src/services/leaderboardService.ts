import { db } from '../firebase';

type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'alltime';

interface PlayerStats {
    userId: string;
    username: string;
    avatar?: string;
    wins: number;
    earnings: number;
    gamesPlayed: number;
    winRate: number;
    rank: number;
    badge?: string;
    updatedAt: number;
}

interface LeaderboardResponse {
    period: LeaderboardPeriod;
    players: PlayerStats[];
    prizePool: number;
    resetsIn?: string;
    totalPlayers: number;
}

export class LeaderboardService {
    private prizePools = {
        daily: { 1: 100, 2: 50, 3: 25, '4-10': 10 },
        weekly: { 1: 1000, 2: 500, 3: 250, '4-10': 50 },
        monthly: { 1: 5000, 2: 2500, 3: 1000, '4-10': 200 }
    };

    /**
     * Get leaderboard for a specific period
     */
    async getLeaderboard(period: LeaderboardPeriod, limit: number = 10): Promise<LeaderboardResponse> {
        if (!db) {
            throw new Error('Database not available');
        }

        try {
            const leaderboardRef = db.collection('leaderboards').doc(period).collection('players');

            // Get top players sorted by earnings
            const snapshot = await leaderboardRef
                .orderBy('earnings', 'desc')
                .limit(limit)
                .get();

            const players: PlayerStats[] = [];
            let rank = 1;

            snapshot.forEach(doc => {
                const data = doc.data();
                players.push({
                    userId: doc.id,
                    username: data.username || 'Player',
                    avatar: data.avatar,
                    wins: data.wins || 0,
                    earnings: data.earnings || 0,
                    gamesPlayed: data.gamesPlayed || 0,
                    winRate: data.winRate || 0,
                    rank: rank++,
                    badge: this.getBadge(rank - 1),
                    updatedAt: data.updatedAt || Date.now()
                });
            });

            // Calculate total prize pool
            const prizePool = this.calculatePrizePool(period);

            // Calculate time until reset
            const resetsIn = period !== 'alltime' ? this.getTimeUntilReset(period) : undefined;

            // Get total player count
            const totalSnapshot = await leaderboardRef.get();
            const totalPlayers = totalSnapshot.size;

            return {
                period,
                players,
                prizePool,
                resetsIn,
                totalPlayers
            };
        } catch (error) {
            console.error('Error getting leaderboard:', error);
            throw error;
        }
    }

    /**
     * Update player stats after a game
     */
    async updatePlayerStats(userId: string, gameResult: {
        won: boolean;
        earnings: number;
        mode: string;
    }): Promise<void> {
        if (!db) {
            throw new Error('Database not available');
        }

        try {
            // Get user info
            const userDoc = await db.collection('users').doc(userId).get();
            const userData = userDoc.data();
            const username = userData?.username || userData?.firstName || 'Player';
            const avatar = userData?.avatar;

            // Update all leaderboard periods
            const periods: LeaderboardPeriod[] = ['daily', 'weekly', 'monthly', 'alltime'];

            for (const period of periods) {
                const playerRef = db.collection('leaderboards').doc(period).collection('players').doc(userId);
                const playerDoc = await playerRef.get();

                if (playerDoc.exists) {
                    // Update existing stats
                    const currentData = playerDoc.data()!;
                    const newWins = currentData.wins + (gameResult.won ? 1 : 0);
                    const newGamesPlayed = currentData.gamesPlayed + 1;
                    const newEarnings = currentData.earnings + gameResult.earnings;
                    const newWinRate = (newWins / newGamesPlayed) * 100;

                    await playerRef.update({
                        wins: newWins,
                        gamesPlayed: newGamesPlayed,
                        earnings: newEarnings,
                        winRate: parseFloat(newWinRate.toFixed(2)),
                        updatedAt: Date.now()
                    });
                } else {
                    // Create new entry
                    await playerRef.set({
                        username,
                        avatar,
                        wins: gameResult.won ? 1 : 0,
                        gamesPlayed: 1,
                        earnings: gameResult.earnings,
                        winRate: gameResult.won ? 100 : 0,
                        updatedAt: Date.now()
                    });
                }
            }

            // Update user's personal stats
            await this.updateUserStats(userId);
        } catch (error) {
            console.error('Error updating player stats:', error);
            throw error;
        }
    }

    /**
     * Get user's rank in a specific period
     */
    async getUserRank(userId: string, period: LeaderboardPeriod): Promise<number | null> {
        if (!db) {
            throw new Error('Database not available');
        }

        try {
            const playerRef = db.collection('leaderboards').doc(period).collection('players').doc(userId);
            const playerDoc = await playerRef.get();

            if (!playerDoc.exists) {
                return null;
            }

            const playerData = playerDoc.data()!;
            const playerEarnings = playerData.earnings || 0;

            // Count how many players have more earnings
            const higherEarningsSnapshot = await db.collection('leaderboards')
                .doc(period)
                .collection('players')
                .where('earnings', '>', playerEarnings)
                .get();

            return higherEarningsSnapshot.size + 1;
        } catch (error) {
            console.error('Error getting user rank:', error);
            return null;
        }
    }

    /**
     * Distribute prizes to top players
     */
    async distributeRewards(period: Exclude<LeaderboardPeriod, 'alltime'>): Promise<void> {
        if (!db) {
            throw new Error('Database not available');
        }

        try {
            const leaderboard = await this.getLeaderboard(period, 10);
            const prizes = this.prizePools[period];

            for (let i = 0; i < leaderboard.players.length; i++) {
                const player = leaderboard.players[i];
                const rank = i + 1;

                let prize = 0;
                if (rank === 1) prize = prizes[1];
                else if (rank === 2) prize = prizes[2];
                else if (rank === 3) prize = prizes[3];
                else if (rank <= 10) prize = prizes['4-10'];

                if (prize > 0) {
                    // Add prize to user's wallet
                    await this.addPrizeToWallet(player.userId, prize, period, rank);
                }
            }

            console.log(`✅ Distributed ${period} leaderboard prizes`);
        } catch (error) {
            console.error(`Error distributing ${period} rewards:`, error);
        }
    }

    /**
     * Reset leaderboard for a period
     */
    async resetLeaderboard(period: Exclude<LeaderboardPeriod, 'alltime'>): Promise<void> {
        if (!db) {
            throw new Error('Database not available');
        }

        try {
            const leaderboardRef = db.collection('leaderboards').doc(period).collection('players');
            const snapshot = await leaderboardRef.get();

            // Delete all documents in batches
            const batch = db.batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();
            console.log(`✅ Reset ${period} leaderboard`);
        } catch (error) {
            console.error(`Error resetting ${period} leaderboard:`, error);
        }
    }

    /**
     * Get user's stats across all periods
     */
    async getUserStats(userId: string) {
        if (!db) {
            throw new Error('Database not available');
        }

        try {
            const userDoc = await db.collection('users').doc(userId).get();
            const userData = userDoc.data();

            const ranks = {
                daily: await this.getUserRank(userId, 'daily'),
                weekly: await this.getUserRank(userId, 'weekly'),
                monthly: await this.getUserRank(userId, 'monthly'),
                alltime: await this.getUserRank(userId, 'alltime')
            };

            // Get all-time stats
            const alltimeRef = db.collection('leaderboards').doc('alltime').collection('players').doc(userId);
            const alltimeDoc = await alltimeRef.get();
            const alltimeData = alltimeDoc.data();

            return {
                userId,
                username: userData?.username || userData?.firstName || 'Player',
                ranks,
                stats: {
                    totalWins: alltimeData?.wins || 0,
                    totalEarnings: alltimeData?.earnings || 0,
                    totalGamesPlayed: alltimeData?.gamesPlayed || 0,
                    winRate: alltimeData?.winRate || 0
                },
                badges: this.getUserBadges(ranks)
            };
        } catch (error) {
            console.error('Error getting user stats:', error);
            throw error;
        }
    }

    // Helper methods

    private getBadge(rank: number): string | undefined {
        if (rank === 1) return 'gold';
        if (rank === 2) return 'silver';
        if (rank === 3) return 'bronze';
        return undefined;
    }

    private calculatePrizePool(period: LeaderboardPeriod): number {
        if (period === 'alltime') return 0;

        const prizes = this.prizePools[period];
        return prizes[1] + prizes[2] + prizes[3] + (prizes['4-10'] * 7);
    }

    private getTimeUntilReset(period: Exclude<LeaderboardPeriod, 'alltime'>): string {
        const now = new Date();
        let resetTime: Date;

        if (period === 'daily') {
            resetTime = new Date(now);
            resetTime.setHours(24, 0, 0, 0);
        } else if (period === 'weekly') {
            resetTime = new Date(now);
            const daysUntilMonday = (8 - now.getDay()) % 7;
            resetTime.setDate(now.getDate() + daysUntilMonday);
            resetTime.setHours(0, 0, 0, 0);
        } else { // monthly
            resetTime = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        }

        const diff = resetTime.getTime() - now.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        return `${hours}h ${minutes}m`;
    }

    private async addPrizeToWallet(userId: string, amount: number, period: string, rank: number): Promise<void> {
        if (!db) return;

        try {
            const userRef = db.collection('users').doc(userId);
            const userDoc = await userRef.get();

            if (!userDoc.exists) return;

            const currentBalance = userDoc.data()?.balance || 0;
            const newBalance = currentBalance + amount;

            await userRef.update({
                balance: newBalance,
                updatedAt: new Date().toISOString()
            });

            // Log transaction
            await db.collection('transactions').add({
                userId,
                type: 'leaderboard_prize',
                amount,
                balanceBefore: currentBalance,
                balanceAfter: newBalance,
                timestamp: new Date().toISOString(),
                description: `${period} leaderboard prize - Rank #${rank}`
            });

            console.log(`💰 Awarded ${amount} Birr to user ${userId} (Rank #${rank} ${period})`);
        } catch (error) {
            console.error('Error adding prize to wallet:', error);
        }
    }

    private async updateUserStats(userId: string): Promise<void> {
        // Update user's personal stats document
        const ranks = {
            daily: await this.getUserRank(userId, 'daily'),
            weekly: await this.getUserRank(userId, 'weekly'),
            monthly: await this.getUserRank(userId, 'monthly'),
            alltime: await this.getUserRank(userId, 'alltime')
        };

        await db?.collection('users').doc(userId).collection('stats').doc('leaderboard').set({
            ranks,
            lastUpdated: Date.now()
        }, { merge: true });
    }

    private getUserBadges(ranks: any): string[] {
        const badges: string[] = [];

        if (ranks.daily === 1) badges.push('gold_daily');
        else if (ranks.daily === 2) badges.push('silver_daily');
        else if (ranks.daily === 3) badges.push('bronze_daily');

        if (ranks.weekly === 1) badges.push('gold_weekly');
        else if (ranks.weekly === 2) badges.push('silver_weekly');
        else if (ranks.weekly === 3) badges.push('bronze_weekly');

        if (ranks.monthly === 1) badges.push('gold_monthly');
        else if (ranks.monthly === 2) badges.push('silver_monthly');
        else if (ranks.monthly === 3) badges.push('bronze_monthly');

        return badges;
    }
}

export const leaderboardService = new LeaderboardService();
