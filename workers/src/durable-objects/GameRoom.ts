export class GameRoom {
    state: DurableObjectState;
    sessions: Set<WebSocket>;
    gameState: {
        gameId: string;
        status: 'waiting' | 'active' | 'ended';
        players: Map<string, any>;
        drawnNumbers: number[];
        countdown: number;
    };

    constructor(state: DurableObjectState, env: any) {
        this.state = state;
        this.sessions = new Set();
        this.gameState = {
            gameId: '',
            status: 'waiting',
            players: new Map(),
            drawnNumbers: [],
            countdown: 30,
        };
    }

    async fetch(request: Request) {
        // Handle WebSocket upgrade
        const upgradeHeader = request.headers.get('Upgrade');
        if (upgradeHeader !== 'websocket') {
            return new Response('Expected WebSocket', { status: 400 });
        }

        const webSocketPair = new WebSocketPair();
        const [client, server] = Object.values(webSocketPair);

        this.handleSession(server as WebSocket);

        return new Response(null, {
            status: 101,
            webSocket: client,
        });
    }

    handleSession(webSocket: WebSocket) {
        webSocket.accept();
        this.sessions.add(webSocket);

        // Send current game state
        webSocket.send(JSON.stringify({
            type: 'game_state',
            data: {
                status: this.gameState.status,
                playerCount: this.sessions.size,
                drawnNumbers: this.gameState.drawnNumbers,
                countdown: this.gameState.countdown,
            },
        }));

        // Broadcast player joined
        this.broadcast({
            type: 'player_joined',
            data: {
                playerCount: this.sessions.size,
            },
        });

        webSocket.addEventListener('message', (msg: MessageEvent) => {
            try {
                const data = JSON.parse(msg.data as string);
                this.handleMessage(data, webSocket);
            } catch (error) {
                console.error('Error handling message:', error);
            }
        });

        webSocket.addEventListener('close', () => {
            this.sessions.delete(webSocket);
            this.broadcast({
                type: 'player_left',
                data: {
                    playerCount: this.sessions.size,
                },
            });
        });
    }

    handleMessage(data: any, ws: WebSocket) {
        switch (data.type) {
            case 'select_card':
                this.broadcast({
                    type: 'card_selected',
                    data: {
                        cardId: data.cardId,
                        playerCount: this.sessions.size,
                    },
                });
                break;

            case 'start_countdown':
                if (this.gameState.status === 'waiting') {
                    this.startCountdown();
                }
                break;

            case 'claim_bingo':
                this.validateWin(data.board, ws);
                break;
        }
    }

    startCountdown() {
        this.gameState.status = 'active';
        this.gameState.countdown = 30;

        const interval = setInterval(() => {
            this.gameState.countdown--;

            this.broadcast({
                type: 'countdown_tick',
                data: {
                    countdown: this.gameState.countdown,
                },
            });

            if (this.gameState.countdown <= 0) {
                clearInterval(interval);
                this.startGame();
            }
        }, 1000);
    }

    startGame() {
        this.gameState.drawnNumbers = [];

        this.broadcast({
            type: 'game_started',
            data: {
                message: 'Game starting!',
            },
        });

        // Call numbers every 3 seconds
        const numbers = Array.from({ length: 75 }, (_, i) => i + 1);
        this.shuffleArray(numbers);

        let index = 0;
        const callInterval = setInterval(() => {
            if (index >= numbers.length || this.gameState.status === 'ended') {
                clearInterval(callInterval);
                return;
            }

            const number = numbers[index++];
            this.gameState.drawnNumbers.push(number);

            this.broadcast({
                type: 'number_called',
                data: {
                    number,
                    drawnNumbers: this.gameState.drawnNumbers,
                },
            });
        }, 3000);
    }

    validateWin(board: number[][], ws: WebSocket) {
        // Simplified win validation
        const flat = board.flat();
        const marked = flat.filter(num => this.gameState.drawnNumbers.includes(num));

        if (marked.length >= 5) {
            this.gameState.status = 'ended';

            this.broadcast({
                type: 'game_won',
                data: {
                    winner: {
                        message: 'Someone won!',
                    },
                },
            });
        } else {
            ws.send(JSON.stringify({
                type: 'invalid_claim',
                data: {
                    message: 'No valid Bingo pattern found',
                },
            }));
        }
    }

    broadcast(message: any) {
        const msg = JSON.stringify(message);
        this.sessions.forEach((ws) => {
            try {
                ws.send(msg);
            } catch (error) {
                console.error('Error broadcasting:', error);
            }
        });
    }

    shuffleArray(array: number[]) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
}
