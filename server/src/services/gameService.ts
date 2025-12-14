import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

interface GameState {
    id: string;
    mode: string;
    players: string[];
    selectedCards: Map<number, string>; // cardId -> userId (who selected it)
    drawnNumbers: number[];
    status: 'waiting' | 'selecting' | 'countdown' | 'playing' | 'ended';
    intervalId?: NodeJS.Timeout;
    countdownInterval?: NodeJS.Timeout; // For countdown broadcasting
    countdown: number; // Current countdown value
    winners: Array<{ userId: string; cardId: number; card: number[][] }>; // Multiple winners with their cards
    entryFee?: number; // Track entry fee for disconnect penalties
}

// Game state includes 'ended' status for completed games
interface WinPattern {
    type: 'row' | 'column' | 'diagonal' | 'fullhouse';
    indices: number[];
}

const games: Record<string, GameState> = {};
const intervalMap: Map<string, NodeJS.Timeout> = new Map(); // Track intervals separately for immediate clearing
const MAX_NUMBER = 75;

export class GameManager {
    private io: Server;

    constructor(io: Server) {
        this.io = io;
    }

    createGame(mode: string, entryFee: number = 50, providedGameId?: string): string {
        const gameId = providedGameId || uuidv4();
        games[gameId] = {
            id: gameId,
            mode,
            players: [],
            selectedCards: new Map(),
            drawnNumbers: [],
            status: 'selecting', // Start in selecting phase
            countdown: 30, // 30 second countdown
            entryFee,
            winners: [] // Initialize empty winners array
        };
        console.log(`🎮 GameManager: Created game ${gameId} (mode: ${mode})`);
        return gameId;
    }

    joinGame(gameId: string, userId: string): { success: boolean; isSpectator: boolean; message?: string } {
        const game = games[gameId];
        if (!game) return { success: false, isSpectator: false, message: 'Game not found' };

        // If game is already playing, join as spectator
        if (game.status === 'playing') {
            console.log(`User ${userId} joining game ${gameId} as spectator (game already started)`);
            return { success: true, isSpectator: true, message: 'Joined as spectator - game already started' };
        }

        // Normal join during selecting phase
        if (!game.players.includes(userId)) {
            game.players.push(userId);
            this.io.to(gameId).emit('player_joined', { userId, count: game.players.length });
        }
        return { success: true, isSpectator: false };
    }

    /**
     * Select a card for a player (max 2 cards)
     */
    selectCard(gameId: string, cardId: number, userId: string): { success: boolean; message?: string; playerCount: number } {
        const game = games[gameId];
        if (!game) return { success: false, message: 'Game not found', playerCount: 0 };

        // Check if card is already selected
        if (game.selectedCards.has(cardId)) {
            return { success: false, message: 'Card already selected', playerCount: this.getPlayerCount(gameId) };
        }

        // Count how many cards this user already has
        const userCardCount = Array.from(game.selectedCards.values()).filter(uid => uid === userId).length;
        if (userCardCount >= 2) {
            return { success: false, message: 'Maximum 2 cards per player', playerCount: this.getPlayerCount(gameId) };
        }

        // Select the card
        game.selectedCards.set(cardId, userId);

        console.log(`📊 Card ${cardId} selected. Total cards: ${game.selectedCards.size}, Game status: ${game.status}`);

        // Broadcast to all players in the room
        this.io.to(gameId).emit('card_selected', { cardId, userId, playerCount: this.getPlayerCount(gameId) });

        // AUTO-TRIGGER: Start countdown when first card is selected
        if (game.selectedCards.size === 1 && game.status === 'selecting') {
            console.log(`🎯 First card selected - auto-starting countdown in 2 seconds`);
            setTimeout(() => this.startCountdown(gameId), 2000);
        } else {
            console.log(`⏭️ Not triggering countdown: size=${game.selectedCards.size}, status=${game.status}`);
        }

        return { success: true, playerCount: this.getPlayerCount(gameId) };
    }

    /**
     * Deselect a card
     */
    deselectCard(gameId: string, cardId: number, userId: string): { success: boolean; message?: string; playerCount: number } {
        const game = games[gameId];
        if (!game) return { success: false, message: 'Game not found', playerCount: 0 };

        // Check if card is selected by this user
        if (game.selectedCards.get(cardId) !== userId) {
            return { success: false, message: 'Not your card', playerCount: this.getPlayerCount(gameId) };
        }

        // Deselect the card
        game.selectedCards.delete(cardId);

        // Broadcast to all players
        this.io.to(gameId).emit('card_deselected', { cardId, playerCount: this.getPlayerCount(gameId) });

        return { success: true, playerCount: this.getPlayerCount(gameId) };
    }

    /**
     * Get number of players who have selected at least one card
     */
    getPlayerCount(gameId: string): number {
        const game = games[gameId];
        if (!game) return 0;

        // Count unique users who have selected cards
        const uniquePlayers = new Set(Array.from(game.selectedCards.values()));
        return uniquePlayers.size;
    }

    /**
     * Get valid game status and countdown
     */
    getGameStatusData(gameId: string) {
        const game = games[gameId];
        if (!game) return null;
        return {
            status: game.status,
            countdown: game.countdown,
            drawnNumbers: game.drawnNumbers
        };
    }

    /**
     * Get all selected cards for a game
     */
    getSelectedCards(gameId: string): Record<number, string> {
        const game = games[gameId];
        if (!game) return {};

        return Object.fromEntries(game.selectedCards);
    }

    /**
     * Start countdown and broadcast to all players
     */
    startCountdown(gameId: string) {
        console.log(`🕒 startCountdown invoked for game ${gameId}`);
        const game = games[gameId];
        if (!game) return;

        // Clear any existing countdown
        if (game.countdownInterval) {
            clearInterval(game.countdownInterval);
        }

        game.status = 'countdown';
        game.countdown = 30;

        // Broadcast initial countdown
        this.io.to(gameId).emit('countdown_tick', { countdown: game.countdown });

        // Countdown every second
        game.countdownInterval = setInterval(() => {
            game.countdown--;

            console.log(`Game ${gameId}: Countdown ${game.countdown}`);

            // Broadcast to all players
            this.io.to(gameId).emit('countdown_tick', { countdown: game.countdown });

            // Start game when countdown reaches 0
            if (game.countdown <= 0) {
                if (game.countdownInterval) {
                    clearInterval(game.countdownInterval);
                }
                this.startGame(gameId);
            }
        }, 1000);
    }


    startGame(gameId: string) {
        const game = games[gameId];
        if (!game) return;

        // CRITICAL: Stop any existing intervals to prevent duplicates (double speed bug)
        this.stopInterval(gameId);

        game.status = 'playing';
        console.log(`🎮 Starting game ${gameId}`);

        // Broadcast game started to all players
        this.io.to(gameId).emit('game_started', { gameId });
        this.io.to(gameId).emit('game_state_changed', { state: 'playing' });

        // Start drawing numbers every 4 seconds (SERVER-CONTROLLED)
        const intervalId = setInterval(() => {
            try {
                // Check if game has ended (important for stopping immediately)
                if (game.status === 'ended' || !intervalMap.has(gameId)) {
                    console.log(`⏹️ Game ${gameId} has ended, stopping number calls`);
                    clearInterval(intervalId);
                    intervalMap.delete(gameId);
                    return;
                }

                if (game.drawnNumbers.length >= MAX_NUMBER) {
                    this.endGame(gameId);
                    return;
                }

                // Generate unique number
                let num: number;
                do {
                    num = Math.floor(Math.random() * MAX_NUMBER) + 1;
                } while (game.drawnNumbers.includes(num));

                game.drawnNumbers.push(num);

                console.log(`Game ${gameId}: Called number ${num} (${game.drawnNumbers.length}/${MAX_NUMBER})`);

                // DON'T broadcast if game has ended or has winners
                const gameIsActive = ['waiting', 'selecting', 'countdown', 'playing'].includes(game.status);
                if (!gameIsActive || game.winners.length > 0) {
                    console.log(`⏹️ Game ${gameId} has winners or ended (status: ${game.status}), NOT broadcasting number ${num}`);
                    this.stopInterval(gameId); // Use helper to clean up
                    return;
                }

                // BROADCAST TO ALL PLAYERS (synchronized!)
                this.io.to(gameId).emit('number_called', {
                    number: num,
                    history: game.drawnNumbers
                });
            } catch (error) {
                console.error(`🚨 Critical error in game loop for ${gameId}:`, error);
                this.stopInterval(gameId);
            }
        }, 4000); // 4 seconds per number

        game.intervalId = intervalId;
        intervalMap.set(gameId, intervalId); // Store in map for immediate access
    }

    endGame(gameId: string) {
        const game = games[gameId];
        if (!game) return;

        console.log(`🛑 Ending game ${gameId}, clearing interval`);

        // Clear from intervalMap FIRST
        const intervalId = intervalMap.get(gameId);
        if (intervalId) {
            clearInterval(intervalId);
            intervalMap.delete(gameId);
            console.log(`✅ Cleared interval from Map for game ${gameId}`);
        }

        // Also clear from game object
        if (game.intervalId) {
            clearInterval(game.intervalId);
            game.intervalId = undefined;
        }

        game.status = 'ended';

        this.io.to(gameId).emit('game_ended', { winners: game.winners });
        console.log(`✅ Game ${gameId} ended, status: ${game.status}`);

        // Cleanup memory after 5 minutes (optimized from 2min)
        setTimeout(() => {
            if (games[gameId]) {
                delete games[gameId];
                console.log(`🧹 Cleaned up game ${gameId}`);
            }
        }, 5 * 60 * 1000);
    }


    getGame(gameId: string): GameState | undefined {
        return games[gameId];
    }

    stopInterval(gameId: string) {
        const intervalId = intervalMap.get(gameId);
        if (intervalId) {
            clearInterval(intervalId);
            intervalMap.delete(gameId);
            console.log(`⏹️ Stopped interval for game ${gameId}`);
        }
        const game = games[gameId];
        if (game?.intervalId) {
            clearInterval(game.intervalId);
            game.intervalId = undefined;
        }
    }

    // Win validation methods
    validateWin(board: number[], markedNumbers: number[]): WinPattern | null {
        // Check rows
        for (let row = 0; row < 5; row++) {
            if (this.checkRow(board, markedNumbers, row)) {
                return {
                    type: 'row',
                    indices: [row * 5, row * 5 + 1, row * 5 + 2, row * 5 + 3, row * 5 + 4]
                };
            }
        }

        // Check columns
        for (let col = 0; col < 5; col++) {
            if (this.checkColumn(board, markedNumbers, col)) {
                return {
                    type: 'column',
                    indices: [col, col + 5, col + 10, col + 15, col + 20]
                };
            }
        }

        // Check diagonals
        if (this.checkDiagonal(board, markedNumbers, 'main')) {
            return {
                type: 'diagonal',
                indices: [0, 6, 12, 18, 24]
            };
        }

        if (this.checkDiagonal(board, markedNumbers, 'anti')) {
            return {
                type: 'diagonal',
                indices: [4, 8, 12, 16, 20]
            };
        }

        // Check full house
        if (markedNumbers.length === 25) {
            return {
                type: 'fullhouse',
                indices: Array.from({ length: 25 }, (_, i) => i)
            };
        }

        return null;
    }

    private checkRow(board: number[], marked: number[], row: number): boolean {
        for (let col = 0; col < 5; col++) {
            const index = row * 5 + col;
            // Skip center free space
            if (index === 12) continue;
            if (!marked.includes(board[index])) {
                return false;
            }
        }
        return true;
    }

    private checkColumn(board: number[], marked: number[], col: number): boolean {
        for (let row = 0; row < 5; row++) {
            const index = row * 5 + col;
            // Skip center free space
            if (index === 12) continue;
            if (!marked.includes(board[index])) {
                return false;
            }
        }
        return true;
    }

    private checkDiagonal(board: number[], marked: number[], type: 'main' | 'anti'): boolean {
        const indices = type === 'main'
            ? [0, 6, 12, 18, 24]  // Top-left to bottom-right
            : [4, 8, 12, 16, 20]; // Top-right to bottom-left

        return indices.every(i => i === 12 || marked.includes(board[i]));
    }
}

export type { WinPattern };
