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

        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);
        });
    });

    return io;
};

