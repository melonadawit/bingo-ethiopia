import { FastifyPluginAsync } from 'fastify';
import { SocketStream } from '@fastify/websocket';

interface GameRoom {
    gameId: string;
    players: Set<SocketStream>;
    status: 'waiting' | 'active' | 'ended';
    drawnNumbers: number[];
    countdown: number;
}

const gameRooms = new Map<string, GameRoom>();

const websocketRoutes: FastifyPluginAsync = async (fastify) => {
    // WebSocket endpoint for game rooms
    fastify.get('/game/:gameId', { websocket: true }, (connection, req) => {
        const { gameId } = req.params as { gameId: string };

        fastify.log.info(`Player connected to game ${gameId}`);

        // Create or join room
        if (!gameRooms.has(gameId)) {
            gameRooms.set(gameId, {
                gameId,
                players: new Set(),
                status: 'waiting',
                drawnNumbers: [],
                countdown: 30,
            });
        }

        const room = gameRooms.get(gameId)!;
        room.players.add(connection);

        // Send current game state to new player
        connection.socket.send(JSON.stringify({
            type: 'game_state',
            data: {
                status: room.status,
                playerCount: room.players.size,
                drawnNumbers: room.drawnNumbers,
                countdown: room.countdown,
            },
        }));

        // Broadcast player count update
        broadcast(room, {
            type: 'player_joined',
            data: {
                playerCount: room.players.size,
            },
        });

        // Handle incoming messages
        connection.socket.on('message', (message: Buffer) => {
            try {
                const data = JSON.parse(message.toString());

                switch (data.type) {
                    case 'select_card':
                        handleCardSelect(room, connection, data);
                        break;

                    case 'deselect_card':
                        handleCardDeselect(room, connection, data);
                        break;

                    case 'start_countdown':
                        handleStartCountdown(room);
                        break;

                    case 'claim_bingo':
                        handleBingoClaim(room, connection, data, fastify);
                        break;

                    default:
                        fastify.log.warn(`Unknown message type: ${data.type}`);
                }
            } catch (error) {
                fastify.log.error('Error handling message:', error);
            }
        });

        // Handle disconnect
        connection.socket.on('close', () => {
            room.players.delete(connection);
            fastify.log.info(`Player disconnected from game ${gameId}`);

            // Broadcast updated player count
            broadcast(room, {
                type: 'player_left',
                data: {
                    playerCount: room.players.size,
                },
            });

            // Clean up empty rooms
            if (room.players.size === 0) {
                gameRooms.delete(gameId);
                fastify.log.info(`Room ${gameId} deleted (empty)`);
            }
        });
    });
};

// Helper functions
function broadcast(room: GameRoom, message: any) {
    const data = JSON.stringify(message);
    room.players.forEach((player) => {
        try {
            player.socket.send(data);
        } catch (error) {
            console.error('Error broadcasting to player:', error);
        }
    });
}

function handleCardSelect(room: GameRoom, connection: SocketStream, data: any) {
    broadcast(room, {
        type: 'card_selected',
        data: {
            cardId: data.cardId,
            playerCount: room.players.size,
        },
    });
}

function handleCardDeselect(room: GameRoom, connection: SocketStream, data: any) {
    broadcast(room, {
        type: 'card_deselected',
        data: {
            cardId: data.cardId,
            playerCount: room.players.size,
        },
    });
}

function handleStartCountdown(room: GameRoom) {
    if (room.status !== 'waiting') return;

    room.status = 'active';
    room.countdown = 30;

    // Countdown interval
    const interval = setInterval(() => {
        room.countdown--;

        broadcast(room, {
            type: 'countdown_tick',
            data: {
                countdown: room.countdown,
            },
        });

        if (room.countdown <= 0) {
            clearInterval(interval);
            startGame(room);
        }
    }, 1000);
}

function startGame(room: GameRoom) {
    room.drawnNumbers = [];

    broadcast(room, {
        type: 'game_started',
        data: {
            message: 'Game starting!',
        },
    });

    // Call numbers every 3 seconds
    const numbers = Array.from({ length: 75 }, (_, i) => i + 1);
    shuffleArray(numbers);

    let index = 0;
    const callInterval = setInterval(() => {
        if (index >= numbers.length || room.status === 'ended') {
            clearInterval(callInterval);
            return;
        }

        const number = numbers[index++];
        room.drawnNumbers.push(number);

        broadcast(room, {
            type: 'number_called',
            data: {
                number,
                drawnNumbers: room.drawnNumbers,
            },
        });
    }, 3000);
}

async function handleBingoClaim(
    room: GameRoom,
    connection: SocketStream,
    data: any,
    fastify: any
) {
    if (room.status !== 'active') return;

    // Validate win (you'll implement this based on your game logic)
    const isValid = validateWin(data.board, room.drawnNumbers, data.mode);

    if (isValid) {
        room.status = 'ended';

        broadcast(room, {
            type: 'game_won',
            data: {
                winner: {
                    userId: data.userId,
                    cardId: data.cardId,
                },
                pattern: data.pattern,
            },
        });

        fastify.log.info(`Game ${room.gameId} won by ${data.userId}`);
    } else {
        connection.socket.send(JSON.stringify({
            type: 'invalid_claim',
            data: {
                message: 'No valid Bingo pattern found',
            },
        }));
    }
}

function validateWin(board: number[][], drawnNumbers: number[], mode: string): boolean {
    // Implement your win validation logic here
    // This is a simplified version
    const flat = board.flat();
    const marked = flat.filter(num => drawnNumbers.includes(num));

    // For now, just check if enough numbers are marked
    return marked.length >= 5;
}

function shuffleArray(array: number[]) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

export default websocketRoutes;
