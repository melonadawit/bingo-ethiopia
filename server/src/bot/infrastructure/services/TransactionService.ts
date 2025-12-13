import { db } from '../../../firebase';

export interface Transaction {
    id: string;
    userId: number;
    type: 'deposit' | 'withdrawal' | 'game_win' | 'game_loss' | 'referral' | 'daily_reward';
    amount: number;
    status: 'pending' | 'completed' | 'failed';
    timestamp: Date;
    metadata?: {
        gameId?: string;
        referredUserId?: number;
        streakDay?: number;
        [key: string]: any;
    };
}

/**
 * Transaction Service
 * Handles transaction history tracking and retrieval
 */
export class TransactionService {
    private readonly COLLECTION = 'transactions';

    /**
     * Create a new transaction record
     */
    async createTransaction(data: Omit<Transaction, 'id'>): Promise<string> {
        if (!db) {
            console.warn('Firebase not available - transaction not saved');
            return 'mock-' + Date.now();
        }

        try {
            const docRef = await db.collection(this.COLLECTION).add({
                ...data,
                timestamp: new Date().toISOString()
            });

            console.log(`✅ Transaction created: ${docRef.id}`);
            return docRef.id;
        } catch (error) {
            console.error('Error creating transaction:', error);
            throw error;
        }
    }

    /**
     * Get user transactions (paginated)
     */
    async getUserTransactions(
        userId: number,
        limit: number = 10,
        offset: number = 0
    ): Promise<Transaction[]> {
        if (!db) {
            return this.getMockTransactions(userId, limit);
        }

        try {
            const snapshot = await db.collection(this.COLLECTION)
                .where('userId', '==', userId)
                .orderBy('timestamp', 'desc')
                .limit(limit)
                .offset(offset)
                .get();

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: new Date(doc.data().timestamp)
            })) as Transaction[];
        } catch (error) {
            console.error('Error fetching transactions:', error);
            return [];
        }
    }

    /**
     * Get filtered transactions by type
     */
    async getTransactionsByType(
        userId: number,
        type: Transaction['type'],
        limit: number = 10
    ): Promise<Transaction[]> {
        if (!db) {
            return this.getMockTransactions(userId, limit).filter(t => t.type === type);
        }

        try {
            const snapshot = await db.collection(this.COLLECTION)
                .where('userId', '==', userId)
                .where('type', '==', type)
                .orderBy('timestamp', 'desc')
                .limit(limit)
                .get();

            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                timestamp: new Date(doc.data().timestamp)
            })) as Transaction[];
        } catch (error) {
            console.error('Error fetching filtered transactions:', error);
            return [];
        }
    }

    /**
     * Get transaction summary stats
     */
    async getTransactionSummary(userId: number): Promise<{
        totalDeposits: number;
        totalWithdrawals: number;
        totalWinnings: number;
        totalSpent: number;
    }> {
        const transactions = await this.getUserTransactions(userId, 1000); // Get all recent

        return {
            totalDeposits: transactions
                .filter(t => t.type === 'deposit' && t.status === 'completed')
                .reduce((sum, t) => sum + t.amount, 0),
            totalWithdrawals: transactions
                .filter(t => t.type === 'withdrawal' && t.status === 'completed')
                .reduce((sum, t) => sum + t.amount, 0),
            totalWinnings: transactions
                .filter(t => t.type === 'game_win')
                .reduce((sum, t) => sum + t.amount, 0),
            totalSpent: transactions
                .filter(t => t.type === 'game_loss')
                .reduce((sum, t) => sum + t.amount, 0)
        };
    }

    /**
     * Format transaction for display
     */
    formatTransaction(transaction: Transaction): string {
        const icons = {
            deposit: '💳',
            withdrawal: '💸',
            game_win: '🎉',
            game_loss: '🎮',
            referral: '👥',
            daily_reward: '🎁'
        };

        const statusIcons = {
            pending: '⏳',
            completed: '✅',
            failed: '❌'
        };

        const date = transaction.timestamp.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });

        const sign = ['deposit', 'game_win', 'referral', 'daily_reward'].includes(transaction.type) ? '+' : '-';

        return `${icons[transaction.type]} ${date}\n` +
            `   ${sign}${transaction.amount} Birr ${statusIcons[transaction.status]}`;
    }

    // Helper for mock data
    private getMockTransactions(userId: number, limit: number): Transaction[] {
        const mocks: Transaction[] = [
            {
                id: '1',
                userId,
                type: 'deposit',
                amount: 100,
                status: 'completed',
                timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
            },
            {
                id: '2',
                userId,
                type: 'daily_reward',
                amount: 10,
                status: 'completed',
                timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
                metadata: { streakDay: 1 }
            }
        ];
        return mocks.slice(0, limit);
    }
}

// Export singleton instance
export const transactionService = new TransactionService();
