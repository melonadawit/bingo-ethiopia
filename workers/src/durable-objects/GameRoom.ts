import type { Env } from '../types';
import { getSupabase } from '../utils';

interface Player {
    userId: string;
    username: string;
    selectedCards: number[];
    connection: WebSocket;
    joinedAt: number;
}

interface BingoCard {
    id: number;
    numbers: number[][];
}

type GameStatus = 'waiting' | 'selecting' | 'countdown' | 'playing' | 'ended';
type GameMode = 'ande-zig' | 'hulet-zig' | 'mulu-zig';

export class GameRoom {
    state: DurableObjectState;
    env: Env;
    sessions: Map<WebSocket, string>; // ws -> userId
    gameState: {
        gameId: string;
        mode: GameMode;
        status: GameStatus;
        players: Map<string, Player>;
        selectedCards: Map<number, string>; // cardId -> userId
        calledNumbers: number[];
        currentNumber: number | null;
        countdown: number;
        winners: any[];
        startTime: number | null;
        pendingClaims: Map<string, { cardId: number; card: BingoCard; claimTime: number }>; // Track simultaneous claims
    };
    countdownInterval: any;
    gameInterval: any;

    constructor(state: DurableObjectState, env: Env) {
        this.state = state;
        this.env = env;
        this.sessions = new Map();
        this.gameState = {
            gameId: '',
            mode: 'ande-zig',
            status: 'waiting',
            players: new Map(),
            selectedCards: new Map(),
            calledNumbers: [],
            currentNumber: null,
            countdown: 30,
            winners: [],
            startTime: null,
            pendingClaims: new Map(),
        };
    }

    async fetch(request: Request) {
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

        webSocket.addEventListener('message', (msg: MessageEvent) => {
            try {
                const data = JSON.parse(msg.data as string);
                this.handleMessage(data, webSocket);
            } catch (error) {
                console.error('Error handling message:', error);
            }
        });

        webSocket.addEventListener('close', () => {
            const userId = this.sessions.get(webSocket);
            if (userId) {
                this.handlePlayerLeave(userId);
                this.sessions.delete(webSocket);
            }
        });
    }

    handleMessage(data: any, ws: WebSocket) {
        switch (data.type) {
            case 'join_game':
                this.handlePlayerJoin(data.data, ws);
                break;

            case 'select_card':
                this.handleCardSelect(data.data, ws);
                break;

            case 'deselect_card':
                this.handleCardDeselect(data.data, ws);
                break;

            case 'start_countdown':
                this.handleStartCountdown();
                break;

            case 'claim_bingo':
                this.handleBingoClaim(data.data, ws);
                break;

            case 'request_selection_state':
                this.sendSelectionState(ws);
                break;
        }
    }

    handlePlayerJoin(data: { gameId: string; userId: string; username?: string }, ws: WebSocket) {
        const { gameId, userId, username } = data;

        this.gameState.gameId = gameId;
        this.sessions.set(ws, userId);

        const player: Player = {
            userId,
            username: username || `Player ${userId.slice(0, 6)}`,
            selectedCards: [],
            connection: ws,
            joinedAt: Date.now(),
        };

        this.gameState.players.set(userId, player);

        // Send current game state to new player
        ws.send(JSON.stringify({
            type: 'joined_successfully',
            data: { gameId },
        }));

        this.sendGameState(ws);

        // Broadcast player joined to others
        this.broadcast({
            type: 'player_joined',
            data: {
                userId,
                username: player.username,
                playerCount: this.gameState.players.size,
            },
        }, ws);
    }

    handlePlayerLeave(userId: string) {
        const player = this.gameState.players.get(userId);
        if (!player) return;

        // Remove player's card selections
        player.selectedCards.forEach(cardId => {
            this.gameState.selectedCards.delete(cardId);
        });

        this.gameState.players.delete(userId);

        this.broadcast({
            type: 'player_left',
            data: {
                userId,
                playerCount: this.gameState.players.size,
            },
        });
    }

    handleCardSelect(data: { cardId: number }, ws: WebSocket) {
        const userId = this.sessions.get(ws);
        if (!userId) return;

        const player = this.gameState.players.get(userId);
        if (!player) return;

        const { cardId } = data;

        // Check if card is already selected by someone
        if (this.gameState.selectedCards.has(cardId)) {
            ws.send(JSON.stringify({
                type: 'error',
                data: { message: 'Card already selected' },
            }));
            return;
        }

        // Check if player already has 2 cards (MAX 2 PER PLAYER)
        if (player.selectedCards.length >= 2) {
            ws.send(JSON.stringify({
                type: 'error',
                data: { message: 'Maximum 2 cards per player' },
            }));
            return;
        }

        // Add card selection
        player.selectedCards.push(cardId);
        this.gameState.selectedCards.set(cardId, userId);

        // Update status to selecting if still waiting
        if (this.gameState.status === 'waiting') {
            this.gameState.status = 'selecting';
        }

        this.broadcast({
            type: 'card_selected',
            data: {
                cardId,
                userId,
                playerCount: this.gameState.players.size,
            },
        });
    }

    handleCardDeselect(data: { cardId: number }, ws: WebSocket) {
        const userId = this.sessions.get(ws);
        if (!userId) return;

        const player = this.gameState.players.get(userId);
        if (!player) return;

        const { cardId } = data;

        // Remove card selection
        const index = player.selectedCards.indexOf(cardId);
        if (index > -1) {
            player.selectedCards.splice(index, 1);
            this.gameState.selectedCards.delete(cardId);

            this.broadcast({
                type: 'card_deselected',
                data: {
                    cardId,
                    playerCount: this.gameState.players.size,
                },
            });
        }
    }

    handleStartCountdown() {
        if (this.gameState.status !== 'selecting' && this.gameState.status !== 'waiting') {
            return;
        }

        this.gameState.status = 'countdown';
        this.gameState.countdown = 30;

        this.broadcast({
            type: 'game_state_changed',
            data: { state: 'countdown' },
        });

        this.countdownInterval = setInterval(() => {
            this.gameState.countdown--;

            this.broadcast({
                type: 'countdown_tick',
                data: { countdown: this.gameState.countdown },
            });

            if (this.gameState.countdown <= 0) {
                clearInterval(this.countdownInterval);
                this.startGame();
            }
        }, 1000);
    }

    startGame() {
        this.gameState.status = 'playing';
        this.gameState.startTime = Date.now();
        this.gameState.calledNumbers = [];

        this.broadcast({
            type: 'game_started',
            data: {},
        });

        // Generate shuffled numbers
        const numbers = Array.from({ length: 75 }, (_, i) => i + 1);
        this.shuffleArray(numbers);

        let index = 0;
        this.gameInterval = setInterval(() => {
            if (index >= numbers.length || this.gameState.status === 'ended') {
                clearInterval(this.gameInterval);
                return;
            }

            const number = numbers[index++];
            this.gameState.currentNumber = number;
            this.gameState.calledNumbers.push(number);

            this.broadcast({
                type: 'number_called',
                data: {
                    number,
                    history: this.gameState.calledNumbers,
                },
            });
        }, 4000); // Call number every 4 seconds
    }

    handleBingoClaim(data: { cardId: number; card: BingoCard }, ws: WebSocket) {
        const userId = this.sessions.get(ws);
        if (!userId) return;

        const player = this.gameState.players.get(userId);
        if (!player) return;

        // Validate the claim
        const isValid = this.validateWin(data.card, this.gameState.mode);

        if (isValid) {
            const claimTime = Date.now();
            const currentNumber = this.gameState.currentNumber;

            // Add to pending claims
            this.gameState.pendingClaims.set(userId, {
                cardId: data.cardId,
                card: data.card,
                claimTime,
            });

            // Wait 500ms to collect simultaneous claims on the same number
            setTimeout(() => {
                // Only process if this is the first claim being processed
                if (!this.gameState.pendingClaims.has(userId)) return;

                // Collect all claims for this number
                const simultaneousClaims: any[] = [];
                this.gameState.pendingClaims.forEach((claim, claimUserId) => {
                    const claimPlayer = this.gameState.players.get(claimUserId);
                    if (claimPlayer) {
                        simultaneousClaims.push({
                            userId: claimUserId,
                            username: claimPlayer.username,
                            cardId: claim.cardId,
                            calledNumbers: this.gameState.calledNumbers.length,
                            claimTime: claim.claimTime,
                        });
                    }
                });

                // Clear pending claims
                this.gameState.pendingClaims.clear();

                // End game
                this.gameState.status = 'ended';
                if (this.gameInterval) {
                    clearInterval(this.gameInterval);
                }

                // Add all winners (prize will be split equally)
                this.gameState.winners.push(...simultaneousClaims);

                this.broadcast({
                    type: 'game_won',
                    data: {
                        winners: simultaneousClaims,
                        prizeShare: simultaneousClaims.length > 1 ? 'split' : 'full',
                    },
                });
            }, 500); // 500ms window for simultaneous claims
        } else {
            ws.send(JSON.stringify({
                type: 'invalid_claim',
                data: { message: 'No valid Bingo pattern found' },
            }));
        }
    }

    validateWin(card: BingoCard, mode: GameMode): boolean {
        const numbers = card.numbers;
        const called = new Set(this.gameState.calledNumbers);

        // Check if number is marked (called)
        const isMarked = (row: number, col: number): boolean => {
            if (row === 2 && col === 2) return true; // Free space
            return called.has(numbers[row][col]);
        };

        // Check row
        const checkRow = (row: number): boolean => {
            for (let col = 0; col < 5; col++) {
                if (!isMarked(row, col)) return false;
            }
            return true;
        };

        // Check column
        const checkCol = (col: number): boolean => {
            for (let row = 0; row < 5; row++) {
                if (!isMarked(row, col)) return false;
            }
            return true;
        };

        // Check diagonal
        const checkDiagonal1 = (): boolean => {
            for (let i = 0; i < 5; i++) {
                if (!isMarked(i, i)) return false;
            }
            return true;
        };

        const checkDiagonal2 = (): boolean => {
            for (let i = 0; i < 5; i++) {
                if (!isMarked(i, 4 - i)) return false;
            }
            return true;
        };

        // Count patterns
        let patterns = 0;

        for (let i = 0; i < 5; i++) {
            if (checkRow(i)) patterns++;
            if (checkCol(i)) patterns++;
        }
        if (checkDiagonal1()) patterns++;
        if (checkDiagonal2()) patterns++;

        // Validate based on mode
        switch (mode) {
            case 'ande-zig': // One pattern
                return patterns >= 1;
            case 'hulet-zig': // Two patterns
                return patterns >= 2;
            case 'mulu-zig': // Full card (24 numbers + free space)
                let markedCount = 1; // Free space
                for (let row = 0; row < 5; row++) {
                    for (let col = 0; col < 5; col++) {
                        if (row === 2 && col === 2) continue;
                        if (called.has(numbers[row][col])) markedCount++;
                    }
                }
                return markedCount === 25;
            default:
                return false;
        }
    }

    sendGameState(ws: WebSocket) {
        ws.send(JSON.stringify({
            type: 'game_state',
            data: {
                status: this.gameState.status,
                playerCount: this.gameState.players.size,
                calledNumbers: this.gameState.calledNumbers,
                countdown: this.gameState.countdown,
            },
        }));
    }

    sendSelectionState(ws: WebSocket) {
        const selectedCardsObj: Record<number, string> = {};
        this.gameState.selectedCards.forEach((userId, cardId) => {
            selectedCardsObj[cardId] = userId;
        });

        ws.send(JSON.stringify({
            type: 'selection_state',
            data: {
                selectedCards: selectedCardsObj,
                playerCount: this.gameState.players.size,
                status: this.gameState.status,
                countdown: this.gameState.countdown,
                drawnNumbers: this.gameState.calledNumbers,
            },
        }));
    }

    broadcast(message: any, exclude?: WebSocket) {
        const msg = JSON.stringify(message);
        this.sessions.forEach((userId, ws) => {
            if (ws !== exclude) {
                try {
                    ws.send(msg);
                } catch (error) {
                    console.error('Error broadcasting:', error);
                }
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
