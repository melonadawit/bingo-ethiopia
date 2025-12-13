import { db } from '../../../firebase';
import { GameManager } from '../../../services/gameService';

export interface BotGame {
    id: string;
    mode: 'and-zig' | 'hulet-zig' | 'mulu-zig';
    entryFee: number;
    currentPlayers: number;
    maxPlayers: number;
    status: 'waiting' | 'playing' | 'ended';
}

/**
 * Bot Game Service
 * Connects bot to real game system
 */
export class BotGameService {
    constructor(private gameManager?: GameManager) { }

    /**
     * Get available games by mode from Firebase
     */
    async getGamesByMode(mode: 'and-zig' | 'hulet-zig' | 'mulu-zig'): Promise<BotGame[]> {
        // Try Firebase first
        if (db) {
            try {
                const gamesSnapshot = await db.collection('games')
                    .where('mode', '==', mode)
                    .where('status', '==', 'waiting')
                    .limit(10)
                    .get();

                if (!gamesSnapshot.empty) {
                    const games: BotGame[] = gamesSnapshot.docs.map(doc => {
                        const data = doc.data();
                        return {
                            id: doc.id,
                            mode: data.mode || mode,
                            entryFee: data.entryFee || this.getEntryFee(mode),
                            currentPlayers: (data.players || []).length,
                            maxPlayers: data.maxPlayers || 20,
                            status: data.status || 'waiting'
                        };
                    });

                    console.log(`✅ Found ${games.length} real ${mode} games from Firebase`);
                    return games;
                }

                console.log(`ℹ️ No real ${mode} games in Firebase, using mock data`);
            } catch (error) {
                console.error('Error fetching games from Firebase:', error);
            }
        }

        // Fallback to mock data if Firebase unavailable or no games found
        return this.getMockGames(mode);
    }

    /**
     * Create a new game
     */
    async createGame(mode: string, entryFee: number): Promise<string> {
        if (this.gameManager) {
            return this.gameManager.createGame(mode);
        }

        // Fallback: create in Firebase
        if (db) {
            const gameRef = await db.collection('games').add({
                mode,
                entryFee,
                players: [],
                status: 'waiting',
                createdAt: new Date().toISOString()
            });
            return gameRef.id;
        }

        return 'mock-game-' + Date.now();
    }

    /**
     * Join a game
     */
    async joinGame(gameId: string, userId: number, userBalance: number, entryFee: number): Promise<{
        success: boolean;
        message: string;
        gameId?: string;
    }> {
        // Check balance
        if (userBalance < entryFee) {
            return {
                success: false,
                message: `Insufficient balance. You need ${entryFee} Birr but have ${userBalance} Birr.`
            };
        }

        // Use GameManager if available
        if (this.gameManager) {
            const joined = this.gameManager.joinGame(gameId, userId.toString());
            if (joined) {
                return {
                    success: true,
                    message: 'Successfully joined game!',
                    gameId
                };
            } else {
                return {
                    success: false,
                    message: 'Game is full or already started.'
                };
            }
        }

        // Fallback: update Firebase
        if (db) {
            try {
                const gameRef = db.collection('games').doc(gameId);
                const gameDoc = await gameRef.get();

                if (!gameDoc.exists) {
                    return {
                        success: false,
                        message: 'Game not found.'
                    };
                }

                const gameData = gameDoc.data();
                if (gameData?.status !== 'waiting') {
                    return {
                        success: false,
                        message: 'Game already started.'
                    };
                }

                // Add player
                await gameRef.update({
                    players: [...(gameData.players || []), userId]
                });

                return {
                    success: true,
                    message: 'Successfully joined game!',
                    gameId
                };
            } catch (error) {
                console.error('Error joining game:', error);
                return {
                    success: false,
                    message: 'Failed to join game.'
                };
            }
        }

        return {
            success: false,
            message: 'Game system not available.'
        };
    }

    /**
     * Get game entry fees by mode
     */
    getEntryFee(mode: 'and-zig' | 'hulet-zig' | 'mulu-zig'): number {
        const fees = {
            'and-zig': 50,
            'hulet-zig': 100,
            'mulu-zig': 150
        };
        return fees[mode];
    }

    /**
     * Mock games for testing
     */
    private getMockGames(mode: string): BotGame[] {
        return [
            {
                id: 'game-1',
                mode: mode as any,
                entryFee: this.getEntryFee(mode as any),
                currentPlayers: 12,
                maxPlayers: 20,
                status: 'waiting'
            },
            {
                id: 'game-2',
                mode: mode as any,
                entryFee: this.getEntryFee(mode as any),
                currentPlayers: 18,
                maxPlayers: 20,
                status: 'waiting'
            }
        ];
    }
}

// Export singleton instance
export const botGameService = new BotGameService();
