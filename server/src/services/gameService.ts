import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

interface GameState {
    id: string;
    mode: string;
    players: string[];
    drawnNumbers: number[];
    status: 'waiting' | 'playing' | 'ended';
    intervalId?: NodeJS.Timeout;
    winner?: string;
}

interface WinPattern {
    type: 'row' | 'column' | 'diagonal' | 'fullhouse';
    indices: number[];
}

const games: Record<string, GameState> = {};
const MAX_NUMBER = 75;

export class GameManager {
    private io: Server;

    constructor(io: Server) {
        this.io = io;
    }

    createGame(mode: string): string {
        const gameId = uuidv4();
        games[gameId] = {
            id: gameId,
            mode,
            players: [],
            drawnNumbers: [],
            status: 'waiting'
        };
        return gameId;
    }

    joinGame(gameId: string, userId: string): boolean {
        const game = games[gameId];
        if (!game || game.status !== 'waiting') return false;

        if (!game.players.includes(userId)) {
            game.players.push(userId);
            this.io.to(gameId).emit('player_joined', { userId, count: game.players.length });
        }
        return true;
    }

    startGame(gameId: string) {
        const game = games[gameId];
        if (!game) return;

        game.status = 'playing';
        this.io.to(gameId).emit('game_started', { gameId });

        // Start drawing numbers every 3 seconds
        game.intervalId = setInterval(() => {
            if (game.drawnNumbers.length >= MAX_NUMBER) {
                this.endGame(gameId);
                return;
            }

            let num: number;
            do {
                num = Math.floor(Math.random() * MAX_NUMBER) + 1;
            } while (game.drawnNumbers.includes(num));

            game.drawnNumbers.push(num);
            this.io.to(gameId).emit('number_drawn', { number: num, history: game.drawnNumbers });
            console.log(`Game ${gameId}: Drawn ${num}`);

        }, 3000);
    }

    endGame(gameId: string, winner?: string) {
        const game = games[gameId];
        if (!game) return;

        if (game.intervalId) clearInterval(game.intervalId);
        game.status = 'ended';
        game.winner = winner;
        this.io.to(gameId).emit('game_ended', { winner });
    }

    getGame(gameId: string): GameState | undefined {
        return games[gameId];
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
