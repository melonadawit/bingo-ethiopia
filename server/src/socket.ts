import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { GameManager } from './services/gameService';

export const initSocket = (httpServer: HttpServer) => {
    const io = new Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    const gameManager = new GameManager(io);

    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        socket.on('create_game', ({ mode }) => {
            const gameId = gameManager.createGame(mode);
            socket.emit('game_created', { gameId });
        });

        socket.on('join_game', ({ gameId, userId }) => {
            const success = gameManager.joinGame(gameId, userId);
            if (success) {
                socket.join(gameId);
                socket.emit('joined_successfully', { gameId });
            } else {
                socket.emit('error', { message: 'Could not join game' });
            }
        });

        socket.on('start_test_game', ({ gameId }) => {
            gameManager.startGame(gameId);
        });

        // Handle win claim
        socket.on('claim_bingo', (data: { gameId: string; board: number[]; markedNumbers: number[] }) => {
            console.log('🎯 Bingo claim received from:', socket.id);

            const game = gameManager.getGame(data.gameId);
            if (!game) {
                socket.emit('error', { message: 'Game not found' });
                return;
            }

            if (game.status !== 'playing') {
                socket.emit('error', { message: 'Game is not active' });
                return;
            }

            // Validate win
            const winPattern = gameManager.validateWin(data.board, data.markedNumbers);

            if (winPattern) {
                // Valid win!
                gameManager.endGame(data.gameId, socket.id);

                // Calculate prize (mock for now)
                const prize = 500;

                io.to(data.gameId).emit('game_won', {
                    winner: {
                        id: socket.id,
                        socketId: socket.id
                    },
                    pattern: winPattern,
                    prize: prize,
                    winningBoard: data.board,
                    markedNumbers: data.markedNumbers
                });

                console.log(`✅ Valid win! Pattern: ${winPattern.type}, Prize: ${prize} Birr`);
            } else {
                // Invalid claim
                socket.emit('invalid_claim', {
                    message: 'No valid Bingo pattern found. Keep playing!'
                });
                console.log(`❌ Invalid claim from ${socket.id}`);
            }
        });

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
        });
    });

    return io;
};
