import type { Env } from '../types';
import { getSupabase } from '../utils';
import { BotConfigService } from '../bot/configService';

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
        pendingClaims: Map<string, { cardId: number; card: BingoCard; claimTime: number }>;
    };
    countdownInterval: any;
    gameInterval: any;
    countdownStartTimeout: any;

    constructor(state: DurableObjectState, env: Env) {
        this.state = state;
        this.env = env;
        this.sessions = new Map();
        console.log("[VERSION] Workers-Game-DO v1.2 Active - Shared Logic");
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
        this.state.blockConcurrencyWhile(async () => {
            await this.initialize();
        });
    }

    private async initialize() {
        const storedState = await this.state.storage.get<{
            gameId: string;
            mode: GameMode;
            status: GameStatus;
            calledNumbers: number[];
            startTime: number | null;
        }>('room_state');

        if (storedState) {
            this.gameState.gameId = storedState.gameId;
            this.gameState.mode = storedState.mode;
            this.gameState.status = storedState.status;
            this.gameState.calledNumbers = storedState.calledNumbers;
            this.gameState.startTime = storedState.startTime;

            const playersMap = await this.state.storage.list<Omit<Player, 'connection'>>({ prefix: 'p:' });
            for (const [key, p] of playersMap) {
                const userId = key.split(':')[1];
                this.gameState.players.set(userId, {
                    ...p,
                    connection: null as any,
                });
                for (const cardId of p.selectedCards) {
                    this.gameState.selectedCards.set(cardId, p.userId);
                }
            }
            console.log(`[INIT] Restored room ${this.gameState.gameId} with ${this.gameState.players.size} players.`);
        }
    }

    private async saveState() {
        await this.state.storage.put('room_state', {
            gameId: this.gameState.gameId,
            mode: this.gameState.mode,
            status: this.gameState.status,
            calledNumbers: this.gameState.calledNumbers,
            startTime: this.gameState.startTime,
        });
    }

    private async savePlayer(userId: string) {
        const p = this.gameState.players.get(userId);
        if (p) {
            const { connection, ...persistable } = p;
            await this.state.storage.put(`p:${userId}`, persistable);
        }
    }

    async startPerpetualLoop() {
        if (this.gameInterval) clearInterval(this.gameInterval);
        if (this.countdownInterval) clearInterval(this.countdownInterval);
        if (this.countdownStartTimeout) clearTimeout(this.countdownStartTimeout);

        this.gameState.status = 'countdown';
        this.gameState.countdown = 30;
        await this.saveState();

        this.broadcast({ type: 'game_state_changed', data: { state: 'countdown' } });
        this.broadcast({ type: 'countdown_tick', data: { countdown: 30 } });

        this.countdownInterval = setInterval(async () => {
            if (this.gameState.countdown <= 0) {
                if (this.countdownInterval) {
                    clearInterval(this.countdownInterval);
                    this.countdownInterval = null;
                }
                await this.startGame();
            } else {
                this.gameState.countdown--;
                this.broadcast({ type: 'countdown_tick', data: { countdown: this.gameState.countdown } });
            }
        }, 1000);
    }

    async resetGame() {
        console.log('Resetting game for next round');

        // Reset only the game state for the new round, PRESERVE PLAYERS
        this.gameState.status = 'waiting';
        this.gameState.selectedCards = new Map();
        this.gameState.winners = [];
        this.gameState.calledNumbers = [];
        this.gameState.currentNumber = null;
        this.gameState.pendingClaims.clear();
        this.gameState.countdown = 30;

        // Clear only the selections for each player, but keep them in the room
        this.gameState.players.forEach(p => {
            p.selectedCards = [];
        });

        await this.saveState();

        // 🟢 CRITICAL: Unregister all players from the tracker for this mode 
        // since their selections are now cleared for the new round.
        try {
            const trackerStub = this.env.PLAYER_TRACKER.idFromName('global');
            const tracker = this.env.PLAYER_TRACKER.get(trackerStub);
            for (const [userId, _] of this.gameState.players) {
                // Non-blocking fire-and-forget
                tracker.fetch('https://dummy/unregister-player', {
                    method: 'POST',
                    body: JSON.stringify({ userId, mode: this.gameState.mode }),
                    headers: { 'Content-Type': 'application/json' }
                }).catch(e => console.error('Tracker unregister failed in resetGame:', e));
            }
        } catch (err) {
            console.error('Error during global tracker cleanup in resetGame:', err);
        }

        // Restart the countdown loop
        await this.startPerpetualLoop();

        this.broadcast({
            type: 'game_reset',
            data: {
                gameId: this.gameState.gameId,
                status: 'selecting',
                countdown: 30
            }
        });
    }

    async fetch(request: Request) {
        if (!this.gameState.gameId) {
            await this.state.blockConcurrencyWhile(() => this.initialize());
        }

        const url = new URL(request.url);
        if (url.pathname === '/internal/reset-game') {
            await this.resetGame();
            return new Response('OK');
        }

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

        webSocket.addEventListener('message', async (msg: MessageEvent) => {
            try {
                const data = JSON.parse(msg.data as string);
                await this.handleMessage(data, webSocket);
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
    async handleMessage(data: any, ws: WebSocket) {
        switch (data.type) {
            case 'join_game': await this.handlePlayerJoin(data.data, ws); break;
            case 'select_card': await this.handleCardSelect(data.data, ws); break;
            case 'deselect_card': await this.handleCardDeselect(data.data, ws); break;
            case 'claim_bingo': await this.handleBingoClaim(data.data, ws); break;
            case 'request_selection_state': this.sendSelectionState(ws); break;
            case 'start_countdown': await this.startPerpetualLoop(); break;
            case 'leave_game': {
                const userId = this.sessions.get(ws);
                if (userId) this.handlePlayerLeave(userId);
                break;
            }
        }
    }

    async handlePlayerJoin(data: { gameId: string; userId: string; username?: string }, ws: WebSocket) {
        const { gameId, userId, username } = data;
        let existingPlayer = this.gameState.players.get(userId);

        // 1. Basic Initialization
        if (!this.gameState.gameId) {
            this.gameState.gameId = gameId;
            const extractedMode = gameId.split('-global-')[0] as GameMode;
            this.gameState.mode = (['ande-zig', 'hulet-zig', 'mulu-zig'].includes(extractedMode)) ? extractedMode : 'ande-zig';
        }

        this.sessions.set(ws, userId);

        // 2. Rejoin Logic
        if (existingPlayer) {
            console.log(`[JOIN] Player ${userId} rejoining room ${gameId}`);
            existingPlayer.connection = ws;
            ws.send(JSON.stringify({
                type: 'rejoin_active',
                data: {
                    canPlay: true,
                    selectedCards: existingPlayer.selectedCards,
                    drawnNumbers: this.gameState.calledNumbers,
                    calledNumbers: this.gameState.calledNumbers,
                    history: this.gameState.calledNumbers,
                    message: 'Welcome back!'
                }
            }));

            if (this.gameState.status === 'waiting' && !this.countdownInterval) {
                console.log('🔄 Restarting countdown for rejoining player');
                await this.startPerpetualLoop();
            }

            this.sendGameState(ws);
            return;
        }

        // 3. New Join Logic
        if (this.gameState.status === 'playing' || this.gameState.status === 'ended') {
            ws.send(JSON.stringify({
                type: 'watch_only',
                data: { canPlay: false, message: 'Game in progress.' }
            }));
            return;
        }

        // 4. Pre-register player to avoid race conditions with selection calls
        const player: Player = {
            userId,
            username: username || `Player ${userId.slice(0, 6)}`,
            selectedCards: [],
            connection: ws,
            joinedAt: Date.now(),
        };
        this.gameState.players.set(userId, player);

        // 5. Mode-Lock Check (DISABLED per user request to restore flow)
        /*
        if (this.env.PLAYER_TRACKER) {
            try {
                const trackerStub = this.env.PLAYER_TRACKER.idFromName('global');
                const tracker = this.env.PLAYER_TRACKER.get(trackerStub);
                const resp = await tracker.fetch('https://dummy/check-player', {
                    method: 'POST',
                    body: JSON.stringify({ userId }),
                    headers: { 'Content-Type': 'application/json' }
                });

                if (resp.ok) {
                    const check = await resp.json() as any;
                    if (check.isActive && check.sessions) {
                        const otherModeSession = check.sessions.find((s: any) => s.mode !== this.gameState.mode && s.gameId !== gameId);
                        if (otherModeSession) {
                            console.log(`🚫 MODE CONFLICT: User ${userId} is in ${otherModeSession.mode}`);
                            this.gameState.players.delete(userId); // Evict if locked
                            ws.send(JSON.stringify({
                                type: 'mode_conflict',
                                data: {
                                    message: `You are currently in an active ${otherModeSession.mode} room. Please leave it to switch modes.`,
                                    activeMode: otherModeSession.mode,
                                    activeGameId: otherModeSession.gameId
                                }
                            }));
                            return;
                        }
                    }
                }
            } catch (err) {
                console.error('[JOIN] PlayerTracker check failed:', err);
            }
        }
        */

        await this.savePlayer(userId);
        await this.saveState();

        if (this.gameState.status === 'waiting' && !this.countdownInterval) {
            console.log('🏁 Starting countdown loop for new player');
            await this.startPerpetualLoop();
        }

        ws.send(JSON.stringify({ type: 'joined_successfully', data: { gameId } }));
        this.sendGameState(ws);
        this.broadcast({
            type: 'player_joined',
            data: { userId, username: player.username, playerCount: this.gameState.players.size }
        }, ws);
    }

    handlePlayerLeave(userId: string) {
        const player = this.gameState.players.get(userId);
        if (!player) return;

        // 🟢 FIX: If the player leaves during non-playing phases, clear their cards and tracker
        if (this.gameState.status === 'waiting' || this.gameState.status === 'selecting' || this.gameState.status === 'countdown') {
            console.log(`[LEAVE] Clearing selection for user ${userId} since game hasn't started`);

            // Release cards
            player.selectedCards.forEach(cardId => {
                this.gameState.selectedCards.delete(cardId);
            });

            // Unregister from global tracker
            if (this.env.PLAYER_TRACKER) {
                try {
                    const trackerStub = this.env.PLAYER_TRACKER.idFromName('global');
                    const tracker = this.env.PLAYER_TRACKER.get(trackerStub);
                    tracker.fetch('https://dummy/unregister-player', {
                        method: 'POST',
                        body: JSON.stringify({ userId, mode: this.gameState.mode }),
                        headers: { 'Content-Type': 'application/json' }
                    }).catch(e => console.error('Leave tracker cleanup failed:', e));
                } catch (err) { }
            }

            this.gameState.players.delete(userId);
            this.broadcast({ type: 'player_left', data: { userId, playerCount: this.gameState.players.size } });
            return;
        }

        // If game is in progress, keep the player record for rejoining
        console.log(`[LEAVE] Player ${userId} disconnected during ${this.gameState.status} - preserving state for rejoin.`);
    }

    async handleCardSelect(data: { cardId: number }, ws: WebSocket) {
        const userId = this.sessions.get(ws);
        console.log(`[SELECT] User ${userId} attempting to select card ${data?.cardId}`);
        if (!userId) return;
        const player = this.gameState.players.get(userId);
        if (!player) {
            console.warn(`[SELECT] Player ${userId} not found in gameState`);
            return;
        }

        const { cardId } = data;
        const alreadyTaken = this.gameState.selectedCards.get(cardId);
        if (alreadyTaken) {
            console.log(`[SELECT] Card ${cardId} already taken by ${alreadyTaken}`);
            ws.send(JSON.stringify({ type: 'error', data: { message: 'Card taken' } }));
            return;
        }

        if (player.selectedCards.length >= 2) {
            console.log(`[SELECT] User ${userId} reached card limit (${player.selectedCards.length})`);
            ws.send(JSON.stringify({ type: 'error', data: { message: 'Max 2 cards' } }));
            return;
        }

        if (player.selectedCards.length === 0) {
            const trackerStub = this.env.PLAYER_TRACKER.idFromName('global');
            const tracker = this.env.PLAYER_TRACKER.get(trackerStub);
            await tracker.fetch('https://dummy/register-player', {
                method: 'POST',
                body: JSON.stringify({ userId, gameId: this.gameState.gameId, mode: this.gameState.mode }),
                headers: { 'Content-Type': 'application/json' }
            });
        }

        player.selectedCards.push(cardId);
        this.gameState.selectedCards.set(cardId, userId);
        if (this.gameState.status === 'waiting') this.gameState.status = 'selecting';

        await this.savePlayer(userId);
        await this.saveState();

        this.broadcast({
            type: 'card_selected',
            data: { cardId, userId, playerCount: this.gameState.players.size }
        });
    }

    async handleCardDeselect(data: { cardId: number }, ws: WebSocket) {
        const userId = this.sessions.get(ws);
        if (!userId) return;
        const player = this.gameState.players.get(userId);
        if (!player) return;

        const { cardId } = data;
        const index = player.selectedCards.indexOf(cardId);
        if (index > -1) {
            player.selectedCards.splice(index, 1);
            this.gameState.selectedCards.delete(cardId);
            await this.savePlayer(userId);

            if (player.selectedCards.length === 0) {
                await this.state.storage.delete(`p:${userId}`);
                const trackerStub = this.env.PLAYER_TRACKER.idFromName('global');
                const tracker = this.env.PLAYER_TRACKER.get(trackerStub);
                tracker.fetch('https://dummy/unregister-player', {
                    method: 'POST',
                    body: JSON.stringify({ userId, mode: this.gameState.mode }),
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            this.broadcast({ type: 'card_deselected', data: { cardId, playerCount: this.gameState.players.size } });
        }
    }

    async startGame() {
        this.gameState.status = 'playing';
        this.gameState.startTime = Date.now();
        this.gameState.calledNumbers = [];
        await this.saveState();

        const betAmounts: Record<GameMode, number> = { 'ande-zig': 10, 'hulet-zig': 20, 'mulu-zig': 50 };
        const betAmount = betAmounts[this.gameState.mode] || 10;
        const supabase = getSupabase(this.env);
        if (!supabase) return;

        try {
            const { data: newGame } = await supabase.from('games').insert({
                mode: this.gameState.mode, status: 'active', entry_fee: betAmount, prize_pool: 0
            }).select('id').single();
            if (newGame) {
                this.gameState.gameId = newGame.id;
                await this.saveState();
            }
        } catch (err) { console.error('Error creating game record:', err); }

        for (const [userId, player] of this.gameState.players) {
            if (player.selectedCards.length === 0) continue;
            try {
                const isTelegramId = /^\d+$/.test(userId);
                let userData;
                if (isTelegramId) {
                    const { data } = await supabase.from('users').select('balance, total_games_played, id').eq('telegram_id', parseInt(userId)).single();
                    userData = data;
                } else {
                    const { data } = await supabase.from('users').select('balance, total_games_played, id').eq('id', userId).single();
                    userData = data;
                }

                if (userData) {
                    const totalBet = betAmount * player.selectedCards.length;
                    const balanceBefore = parseFloat(userData.balance || '0');
                    const balanceAfter = balanceBefore - totalBet;
                    await supabase.from('users').update({ balance: balanceAfter, total_games_played: (userData.total_games_played || 0) + 1 }).eq('id', userData.id);
                    await supabase.from('game_transactions').insert({ user_id: userData.id, game_id: this.gameState.gameId, type: 'bet', amount: totalBet, balance_before: balanceBefore, balance_after: balanceAfter });

                    const historyEntries = player.selectedCards.map(cardId => ({
                        game_id: this.gameState.gameId, user_id: userData.id, card_id: cardId, card_data: JSON.stringify({ numbers: [] }), is_winner: false, prize_amount: 0, joined_at: new Date().toISOString()
                    }));
                    await supabase.from('game_players').insert(historyEntries);

                    this.sendToPlayer(userId, { type: 'balance_update', data: { balance: balanceAfter, change: -totalBet, reason: 'Game Entry' } });
                }
            } catch (error) { console.error(`Error processing balance for user ${userId}:`, error); }
        }

        this.broadcast({ type: 'game_started', data: { history: this.gameState.calledNumbers } });

        const numbers = Array.from({ length: 75 }, (_, i) => i + 1);
        this.shuffleArray(numbers);
        let index = 0;
        this.gameInterval = setInterval(async () => {
            if (index >= numbers.length || this.gameState.status === 'ended') {
                clearInterval(this.gameInterval);
                if (index >= numbers.length && this.gameState.status !== 'ended') {
                    this.gameState.status = 'ended';
                    this.gameState.countdown = 10;
                    await this.saveState();
                    this.broadcast({ type: 'no_winner', data: { message: 'All 75 numbers called, no winner', countdown: 10 } });

                    const endTimer = setInterval(async () => {
                        this.gameState.countdown--;
                        if (this.gameState.countdown <= 0) {
                            clearInterval(endTimer);
                            await this.resetGame();
                        } else {
                            this.broadcast({ type: 'end_countdown_tick', data: { countdown: this.gameState.countdown } });
                        }
                    }, 1000);
                }
                return;
            }
            const number = numbers[index++];
            this.gameState.currentNumber = number;
            this.gameState.calledNumbers.push(number);
            await this.saveState();
            this.broadcast({ type: 'number_called', data: { number, history: this.gameState.calledNumbers } });
        }, 4000);
    }

    async handleBingoClaim(data: { cardId: number; card: BingoCard }, ws: WebSocket) {
        const userId = this.sessions.get(ws);
        if (!userId) return;

        if (this.gameState.status !== 'playing') {
            const msg = `Bingo is only available during active play (Current Status: ${this.gameState.status})`;
            console.log(`⚠️ Blocked Bingo claim from ${userId}: ${msg}`);
            ws.send(JSON.stringify({
                type: 'invalid_claim',
                data: { message: msg }
            }));
            return;
        }

        console.log(`🎯 Received Bingo claim from ${userId} for card ${data.cardId}`);
        const isValid = this.validateWin(data.card, this.gameState.mode);
        console.log(`Validation result: ${isValid ? '✅ VALID' : '❌ INVALID'} for mode ${this.gameState.mode}`);

        if (this.validateWin(data.card, this.gameState.mode)) {
            // IMMEDIATE STOP: Prevents further numbers from being called while we wait for other simultaneous claims
            if (this.gameInterval) {
                console.log('🛑 Win detected - Immediately stopping number calling interval');
                clearInterval(this.gameInterval);
                this.gameInterval = null;
            }

            this.gameState.pendingClaims.set(userId, { cardId: data.cardId, card: data.card, claimTime: Date.now() });

            setTimeout(async () => {
                if (!this.gameState.pendingClaims.has(userId)) return;

                const simultaneousClaims: any[] = [];
                this.gameState.pendingClaims.forEach((claim, claimUserId) => {
                    const cp = this.gameState.players.get(claimUserId);
                    if (cp) simultaneousClaims.push({
                        userId: claimUserId, username: cp.username, cardId: claim.cardId, card: claim.card,
                        winningPattern: this.getWinningPattern(claim.card, this.gameState.mode),
                        calledNumbers: this.gameState.calledNumbers.length, claimTime: claim.claimTime
                    });
                });

                console.log(`🏆 Processing ${simultaneousClaims.length} simultaneous winners...`);
                this.gameState.pendingClaims.clear();
                this.gameState.status = 'ended';
                if (this.gameInterval) {
                    console.log('🛑 Stopping number calling interval');
                    clearInterval(this.gameInterval);
                    this.gameInterval = null;
                }
                this.gameState.winners.push(...simultaneousClaims);
                await this.saveState();

                // 1. BROADCAST IMMEDIATELY - Don't wait for DB/notifications
                const betAmounts: Record<GameMode, number> = { 'ande-zig': 10, 'hulet-zig': 20, 'mulu-zig': 50 };
                const betAmount = betAmounts[this.gameState.mode] || 10;
                let totalCards = 0;
                this.gameState.players.forEach(p => totalCards += p.selectedCards.length);

                const configService = new BotConfigService(this.env);
                const config = await configService.getConfig();
                const commissionPct = config.gameRules?.commissionPct ?? 15;
                const totalPot = totalCards * betAmount * (1 - (commissionPct / 100));
                const prizePerWinner = totalPot / simultaneousClaims.length;

                this.gameState.countdown = 10;
                this.broadcast({
                    type: 'game_won',
                    data: {
                        winners: simultaneousClaims,
                        totalPot,
                        prizePerWinner,
                        countdown: 10
                    }
                });

                // 2. Schedule Reset Timer
                const endTimer = setInterval(async () => {
                    this.gameState.countdown--;
                    if (this.gameState.countdown <= 0) {
                        clearInterval(endTimer);
                        await this.resetGame();
                    } else {
                        this.broadcast({ type: 'end_countdown_tick', data: { countdown: this.gameState.countdown } });
                    }
                }, 1000);

                // 3. Background Prize Processing (Safe & Non-blocking)
                try {
                    const supabase = getSupabase(this.env);
                    if (supabase) {
                        const { notifyWinner } = await import('../bot/notifications');
                        for (const winner of simultaneousClaims) {
                            try {
                                let targetTelegramId: number | null = null;
                                const userIdAsInt = parseInt(winner.userId);
                                if (!isNaN(userIdAsInt) && userIdAsInt.toString() === winner.userId) {
                                    targetTelegramId = userIdAsInt;
                                } else {
                                    const { data: idLookup } = await supabase.from('users').select('telegram_id').eq('id', winner.userId).single();
                                    if (idLookup) targetTelegramId = idLookup.telegram_id;
                                }

                                if (targetTelegramId) {
                                    const { data: ud } = await supabase.from('users').select('balance, total_wins, total_winnings, id').eq('telegram_id', targetTelegramId).single();
                                    if (ud) {
                                        const balanceAfter = parseFloat(ud.balance || '0') + prizePerWinner;
                                        await supabase.from('users').update({ balance: balanceAfter, total_wins: (ud.total_wins || 0) + 1, total_winnings: (ud.total_winnings || 0) + prizePerWinner }).eq('telegram_id', targetTelegramId);
                                        await supabase.from('game_transactions').insert({ user_id: targetTelegramId, game_id: this.gameState.gameId, type: 'win', amount: prizePerWinner, balance_before: ud.balance, balance_after: balanceAfter });
                                        await supabase.from('game_players').update({ is_winner: true, prize_amount: prizePerWinner, card_data: JSON.stringify(winner.card) }).eq('game_id', this.gameState.gameId).eq('user_id', ud.id).eq('card_id', winner.cardId);

                                        this.sendToPlayer(winner.userId, { type: 'balance_update', data: { balance: balanceAfter, change: prizePerWinner, reason: 'Bingo Win' } });
                                    }
                                }
                            } catch (e) { console.error('Error processing winner DB:', e); }
                        }
                        await notifyWinner(simultaneousClaims, totalPot, this.env);
                    }
                } catch (err) {
                    console.error('Final Prize Processing Error:', err);
                }
            }, 500);
        } else {
            console.log(`❌ Invalid claim rejected for user ${userId} / card ${data.cardId}`);
            ws.send(JSON.stringify({
                type: 'invalid_claim',
                data: {
                    message: 'No valid Bingo pattern found. Please check your card again.',
                    mode: this.gameState.mode,
                    calledCount: this.gameState.calledNumbers.length
                }
            }));
        }
    }

    getWinningPattern(card: BingoCard, mode: GameMode): boolean[][] {
        const numbers = card.numbers;
        const called = new Set(this.gameState.calledNumbers);
        const pattern: boolean[][] = Array(5).fill(0).map(() => Array(5).fill(false));
        pattern[2][2] = true;

        const isMarked = (row: number, col: number) => (row === 2 && col === 2) || called.has(numbers[row][col]);

        for (let row = 0; row < 5; row++) {
            if ([0, 1, 2, 3, 4].every(col => isMarked(row, col))) [0, 1, 2, 3, 4].forEach(col => pattern[row][col] = true);
        }
        for (let col = 0; col < 5; col++) {
            if ([0, 1, 2, 3, 4].every(row => isMarked(row, col))) [0, 1, 2, 3, 4].forEach(row => pattern[row][col] = true);
        }
        if ([0, 1, 2, 3, 4].every(i => isMarked(i, i))) [0, 1, 2, 3, 4].forEach(i => pattern[i][i] = true);
        if ([0, 1, 2, 3, 4].every(i => isMarked(i, 4 - i))) [0, 1, 2, 3, 4].forEach(i => pattern[i][4 - i] = true);
        if (mode === 'ande-zig' && isMarked(0, 0) && isMarked(0, 4) && isMarked(4, 0) && isMarked(4, 4)) {
            pattern[0][0] = pattern[0][4] = pattern[4][0] = pattern[4][4] = true;
        }
        return pattern;
    }

    validateWin(card: BingoCard, mode: GameMode): boolean {
        const numbers = card.numbers;
        const called = new Set(this.gameState.calledNumbers);
        const isMarked = (r: number, c: number) => (r === 2 && c === 2) || called.has(numbers[r][c]);

        let patterns = 0;
        for (let i = 0; i < 5; i++) {
            if ([0, 1, 2, 3, 4].every(c => isMarked(i, c))) patterns++;
            if ([0, 1, 2, 3, 4].every(r => isMarked(r, i))) patterns++;
        }
        if ([0, 1, 2, 3, 4].every(i => isMarked(i, i))) patterns++;
        if ([0, 1, 2, 3, 4].every(i => isMarked(i, 4 - i))) patterns++;

        if (mode === 'ande-zig') return patterns >= 1 || (isMarked(0, 0) && isMarked(0, 4) && isMarked(4, 0) && isMarked(4, 4));
        if (mode === 'hulet-zig') return patterns >= 2;
        if (mode === 'mulu-zig') {
            let count = 0;
            for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) if (isMarked(r, c)) count++;
            return count === 25;
        }
        return false;
    }

    sendGameState(ws: WebSocket) {
        ws.send(JSON.stringify({
            type: 'game_state',
            data: {
                status: this.gameState.status,
                playerCount: this.gameState.players.size,
                calledNumbers: this.gameState.calledNumbers,
                history: this.gameState.calledNumbers,
                drawnNumbers: this.gameState.calledNumbers,
                countdown: this.gameState.countdown
            }
        }));
    }

    sendSelectionState(ws: WebSocket) {
        const selectedCardsObj: Record<number, string> = {};
        this.gameState.selectedCards.forEach((u, c) => selectedCardsObj[c] = u);
        ws.send(JSON.stringify({ type: 'selection_state', data: { selectedCards: selectedCardsObj, playerCount: this.gameState.players.size, status: this.gameState.status, countdown: this.gameState.countdown, drawnNumbers: this.gameState.calledNumbers } }));
    }

    sendToPlayer(userId: string, message: any) {
        const msg = JSON.stringify(message);
        for (const [ws, sessionUserId] of this.sessions.entries()) {
            if (sessionUserId === userId && ws.readyState === WebSocket.OPEN) ws.send(msg);
        }
    }

    broadcast(message: any, exclude?: WebSocket) {
        const msg = JSON.stringify(message);
        this.sessions.forEach((uid, ws) => { if (ws !== exclude && ws.readyState === WebSocket.OPEN) ws.send(msg); });
    }

    shuffleArray(array: number[]) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
}
