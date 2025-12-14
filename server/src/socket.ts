import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { GameManager } from './services/gameService';

let gameManagerInstance: GameManager;

export const initSocket = (httpServer: HttpServer) => {
    const io = new Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    gameManagerInstance = new GameManager(io);

    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        socket.on('create_game', ({ mode }) => {
            const gameId = gameManagerInstance.createGame(mode);
            socket.emit('game_created', { gameId });
        });

        socket.on('join_game', ({ gameId, userId }) => {
            console.log(`🎮 Socket ${socket.id} attempting to join game ${gameId}`);
            const result = gameManagerInstance.joinGame(gameId, userId);
            if (result.success) {
                socket.join(gameId);
                console.log(`✅ Socket ${socket.id} joined room ${gameId}`);
                socket.emit('joined_successfully', {
                    gameId,
                    isSpectator: result.isSpectator,
                    message: result.message
                });
            } else {
                console.log(`❌ Socket ${socket.id} failed to join: ${result.message}`);
                socket.emit('error', { message: result.message || 'Could not join game' });
            }
        });

        // Handle card selection
        socket.on('select_card', ({ gameId, cardId, userId }) => {
            const result = gameManagerInstance.selectCard(gameId, cardId, userId);
            if (result.success) {
                socket.emit('card_select_success', { cardId, playerCount: result.playerCount });
            } else {
                socket.emit('card_select_error', { message: result.message });
            }
        });

        // Handle card deselection
        socket.on('deselect_card', ({ gameId, cardId, userId }) => {
            const result = gameManagerInstance.deselectCard(gameId, cardId, userId);
            if (result.success) {
                socket.emit('card_deselect_success', { cardId, playerCount: result.playerCount });
            } else {
                socket.emit('card_deselect_error', { message: result.message });
            }
        });

        // Send current selection state to joining player
        socket.on('request_selection_state', ({ gameId }) => {
            const selectedCards = gameManagerInstance.getSelectedCards(gameId);
            const playerCount = gameManagerInstance.getPlayerCount(gameId);
            const statusData = gameManagerInstance.getGameStatusData(gameId);

            socket.emit('selection_state', {
                selectedCards,
                playerCount,
                status: statusData?.status || 'selecting',
                countdown: statusData?.countdown || 30,
                drawnNumbers: statusData?.drawnNumbers || []
            });
        });


        // Start countdown manually (or auto after card selection)
        socket.on('start_countdown', ({ gameId }) => {
            console.log(`Starting countdown for game ${gameId}`);
            gameManagerInstance.startCountdown(gameId);
        });

        socket.on('start_test_game', ({ gameId }) => {
            gameManagerInstance.startGame(gameId);
        });

        // Handle win claim
        socket.on('claim_bingo', (data: { gameId: string; board: number[]; markedNumbers: number[] }) => {
            console.log('🎯 Bingo claim received from:', socket.id);

            const game = gameManagerInstance.getGame(data.gameId);
            if (!game) {
                socket.emit('error', { message: 'Game not found' });
                return;
            }

            if (game.status !== 'playing') {
                socket.emit('error', { message: 'Game is not active' });
                return;
            }

            // Validate win
            const winPattern = gameManagerInstance.validateWin(data.board, data.markedNumbers);

            if (winPattern) {
                // Valid win!
                gameManagerInstance.endGame(data.gameId, socket.id);

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

        socket.on('disconnect', async () => {
            console.log('User disconnected:', socket.id);

            // TODO: Handle disconnect penalty
            // If user had selected cards, deduct balance
            // This would require tracking userId -> socketId mapping
            // For now, just log disconnect
        });

    });

    return io;
};

// Export gameManager for use in API controllers
export const getGameManager = () => {
    if (!gameManagerInstance) {
        throw new Error('GameManager not initialized. Call initSocket first.');
    }
    return gameManagerInstance;
};

