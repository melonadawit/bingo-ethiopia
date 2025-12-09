import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

interface GameState {
    id: string;
    mode: string;
    players: string[]; // User IDs
    drawnNumbers: number[];
    status: 'waiting' | 'playing' | 'ended';
    intervalId?: NodeJS.Timeout;
    winner?: string;
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

    // Simplified validation: Trust client for now, robust check later
    validateWin(gameId: string, userId: string, board: number[][]): boolean {
        const game = games[gameId];
        if (!game) return false;

        // Verify if the board has a valid bingo pattern with currently drawn numbers
        // This is a placeholder. Full matrix check needed.
        return true;
    }
}
