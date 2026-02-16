import type { Env } from '../types';
import { getSupabase } from '../utils';
import { createRedisClient, scheduleEvent, GameEvent } from '../utils/redis';
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

type GameStatus = 'waiting' | 'selecting' | 'countdown' | 'playing' | 'ending' | 'ended';
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
    countdownStartTimeout: any; // Track the fast-start timeout

    constructor(state: DurableObjectState, env: Env) {
        this.state = state;
        this.env = env;
        this.sessions = new Map();
        console.log("[VERSION] Workers-Primary-DO v1.2 Active");
        this.gameState = {
            gameId: '',
            mode: 'ande-zig',
            status: 'waiting',
            players: new Map(),
            selectedCards: new Map(), // Changed from new Set() to Map per earlier observation
            calledNumbers: [],
            currentNumber: null,
            countdown: 30,
            winners: [],
            startTime: null,
            pendingClaims: new Map(),
        };

        // Clear any persisted state from previous alarm-based implementation
        // Use blockConcurrencyWhile to ensure this completes before any requests
        this.state.blockConcurrencyWhile(async () => {
            await this.state.storage.deleteAll();
            await this.state.storage.deleteAlarm();
            console.log('🧹 Cleared all persisted DO storage');
        });
    }

    // ... (rest of methods)

    startPerpetualLoop() {
        // CLEAR EVERYTHING FIRST
        if (this.gameInterval) {
            clearInterval(this.gameInterval);
            this.gameInterval = null;
        }
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
        if (this.countdownStartTimeout) {
            clearTimeout(this.countdownStartTimeout);
            this.countdownStartTimeout = null;
        }

        // Set status and countdown directly
        this.gameState.status = 'countdown';
        this.gameState.countdown = 30;

        // Broadcast initial countdown state
        this.broadcast({
            type: 'game_state_changed',
            data: { state: 'countdown' }
        });

        this.broadcast({
            type: 'countdown_tick',
            data: { countdown: 30 }
        });

        // Start countdown immediately - no delay!
        this.countdownInterval = setInterval(() => {
            try {
                if (this.gameState.countdown <= 0) {
                    if (this.countdownInterval) {
                        clearInterval(this.countdownInterval);
                        this.countdownInterval = null;
                    }
                    // Fire and forget, don't await to avoid stalling the interval
                    this.startGame().catch(err => console.error('Error starting game after countdown:', err));
                } else {
                    this.gameState.countdown--;
                    this.broadcast({
                        type: 'countdown_tick',
                        data: { countdown: this.gameState.countdown }
                    });
                }
            } catch (err) {
                console.error('🔥 [CRITICAL] Error in countdown interval:', err);
            }
        }, 1000);
    }

    async resetGame() {
        console.log('Resetting game for next round');

        // Reset game state for the new round, but PRESERVE the players
        this.gameState.status = 'waiting';
        this.gameState.selectedCards = new Map();
        this.gameState.winners = [];
        this.gameState.calledNumbers = [];
        this.gameState.currentNumber = null;
        this.gameState.pendingClaims.clear();

        // Clear only the selections for each player
        this.gameState.players.forEach(p => {
            p.selectedCards = [];
        });

        await this.saveState();

        // Restart the game loop
        this.startPerpetualLoop();

        // Broadcast reset to all players
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
        const url = new URL(request.url);

        // Internal endpoints for Redis event processing
        if (url.pathname === '/internal/countdown-tick') {
            const body = await request.json() as { countdown: number };
            this.gameState.countdown = body.countdown;
            this.broadcast({ type: 'countdown_tick', data: { countdown: body.countdown } });
            return new Response('OK');
        }

        if (url.pathname === '/internal/start-game') {
            this.startGame();
            return new Response('OK');
        }

        if (url.pathname === '/internal/call-number') {
            const body = await request.json() as { numberIndex: number };
            // For now, return mock data - we'll implement full number calling logic later
            return Response.json({ hasWinner: false, maxNumbers: 75 });
        }

        if (url.pathname === '/internal/reset-game') {
            this.resetGame();
            return new Response('OK');
        }

        // WebSocket upgrade
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


            case 'claim_bingo':
                this.handleBingoClaim(data.data, ws);
                break;

            case 'request_selection_state':
                this.sendSelectionState(ws);
                break;
        }
    }

    async handlePlayerJoin(data: { gameId: string; userId: string; username?: string }, ws: WebSocket) {
        // [DEBUG] Log incoming join request
        console.log(`[DEBUG] handlePlayerJoin: userId=${data.userId}, username=${data.username}, gameId=${data.gameId}`);
        const { gameId, userId, username } = data;

        // Check if player already exists (rejoining)
        const existingPlayer = this.gameState.players.get(userId);

        // MODE LOCK CHECK (New Player Only)
        // If player is NOT in memory, check if they are locked to another room via PlayerTracker
        if (!existingPlayer) {
            try {
                // We use a 'global' singleton for the tracker to store valid active sessions
                const trackerStub = this.env.PLAYER_TRACKER.idFromName('global');
                const tracker = this.env.PLAYER_TRACKER.get(trackerStub);

                const checkRes = await tracker.fetch('https://dummy/check-player', {
                    method: 'POST',
                    body: JSON.stringify({ userId }),
                    headers: { 'Content-Type': 'application/json' }
                });

                if (checkRes.ok) {
                    const checkData = await checkRes.json() as { isActive: boolean; currentGameId?: string; currentMode?: string };

                    // If active in ANOTHER game, block them
                    if (checkData.isActive && checkData.currentGameId !== this.gameState.gameId) {
                        console.log(`🚫 Rejecting: Player ${userId} is locked to game ${checkData.currentGameId}`);
                        ws.send(JSON.stringify({
                            type: 'mode_conflict',
                            data: {
                                message: `You are currently active in a ${checkData.currentMode} room. Please leave it to switch.`,
                                activeMode: checkData.currentMode,
                                activeGameId: checkData.currentGameId
                            }
                        }));
                        return;
                    }

                    // NO CONFLICT? Register proactively for THIS mode/game immediately
                    await tracker.fetch('https://dummy/register-player', {
                        method: 'POST',
                        body: JSON.stringify({ userId, gameId: this.gameState.gameId || gameId, mode: this.gameState.mode || (gameId.split('-global-')[0]) }),
                        headers: { 'Content-Type': 'application/json' }
                    });
                }
            } catch (err) {
                console.error("PlayerTracker check error:", err);
                // Fail open? or Fail closed? Let's fail open to not block legit users if tracker is down
            }

            // CRITICAL: Only set gameId if not already set (preserve rotating DB IDs)
            if (!this.gameState.gameId) {
                this.gameState.gameId = gameId;
            }

            // Extract and set mode from gameId for NEW players only
            const extractedMode = gameId.split('-global-')[0] as GameMode;
            if (['ande-zig', 'hulet-zig', 'mulu-zig'].includes(extractedMode)) {
                this.gameState.mode = extractedMode;
            } else {
                this.gameState.mode = 'ande-zig';
            }
        }

        this.sessions.set(ws, userId);

        // Check if player already exists
        const isRejoining = !!existingPlayer;

        if (isRejoining) {
            console.log(`Player ${userId} is rejoining. Current status: ${this.gameState.status}`);
            console.log(`Player's selected cards:`, existingPlayer.selectedCards);

            // Update connection
            existingPlayer.connection = ws;

            // Check game status for rejoin handling
            if (this.gameState.status === 'playing') {
                // Player rejoining active game - let them continue
                console.log('Player rejoining active game - restoring state');
                ws.send(JSON.stringify({
                    type: 'rejoin_active',
                    data: {
                        canPlay: true,
                        selectedCards: existingPlayer.selectedCards,
                        message: 'Welcome back! Resuming your game.'
                    }
                }));
            } else if (['ended', 'ending'].includes(this.gameState.status)) {
                // Game ended - watch only mode
                console.log('Player rejoining ended game - watch only');
                ws.send(JSON.stringify({
                    type: 'watch_only',
                    data: {
                        canPlay: false,
                        message: 'Game ended. Watching next round.'
                    }
                }));
            } else {
                // Game in countdown/selecting - restore cards
                console.log(`Player rejoining during ${this.gameState.status} - restoring cards`);
                ws.send(JSON.stringify({
                    type: 'rejoin_active',
                    data: {
                        canPlay: true,
                        selectedCards: existingPlayer.selectedCards,
                        message: 'Welcome back! Your cards have been restored.'
                    }
                }));
            }

            // Send current game state
            this.sendGameState(ws);
            return;
        }

        // NEW PLAYER - Check game status first
        if (this.gameState.status === 'playing' || this.gameState.status === 'ending') {
            // Game already started - redirect to watch-only mode
            console.log(`❌ New player ${userId} trying to join active game - redirecting to watch-only`);
            ws.send(JSON.stringify({
                type: 'watch_only',
                data: {
                    canPlay: false,
                    message: 'Game already in progress. You can watch this round.'
                }
            }));

            // Still add them as a spectator so they can see the game
            const spectator: Player = {
                userId,
                username: username || `Player${userId.slice(0, 6)}`,
                selectedCards: [],
                connection: ws,
                joinedAt: Date.now(),
            };
            this.gameState.players.set(userId, spectator);
            this.sendGameState(ws);
            return;
        }

        // New player joining
        const player: Player = {
            userId,
            username: username || `Player ${userId.slice(0, 6)}`,
            selectedCards: [],
            connection: ws,
            joinedAt: Date.now(),
        };

        const isFirstPlayer = this.gameState.players.size === 0;
        this.gameState.players.set(userId, player);

        // Start the game loop when the first player joins - DO NOT MODIFY THIS TIMING
        if (isFirstPlayer && this.gameState.status === 'waiting') {
            console.log('First player joined, starting countdown');
            this.startPerpetualLoop();
        }

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

        // PERSISTENCE FIX: 
        // If player has selected cards (committed to game), DO NOT REMOVE THEM.
        // Just mark as disconnected (implicitly by WS close)
        // This allows them to rejoin later.
        if (player.selectedCards.length > 0) {
            console.log(`⚠️ Player ${userId} left but has cards! Keeping in game state for rejoin.`);
            // Only remove from sessions map (already done in handleSession)
            return;
        }

        // If no cards, fully remove them
        this.gameState.players.delete(userId);

        this.broadcast({
            type: 'player_left',
            data: {
                userId,
                playerCount: this.gameState.players.size,
            },
        });
    }

    async handleCardSelect(data: { cardId: number }, ws: WebSocket) {
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

        // LOCK PLAYER TO THIS MODE (If first card)
        if (player.selectedCards.length === 0) {
            try {
                const trackerStub = this.env.PLAYER_TRACKER.idFromName('global');
                const tracker = this.env.PLAYER_TRACKER.get(trackerStub);
                await tracker.fetch('https://dummy/register-player', {
                    method: 'POST',
                    body: JSON.stringify({
                        userId,
                        gameId: this.gameState.gameId,
                        mode: this.gameState.mode,
                    }),
                    headers: { 'Content-Type': 'application/json' }
                });
                console.log(`🔐 Player ${userId} LOCKED to game ${this.gameState.gameId}`);
            } catch (e) {
                console.error("Failed to register player lock:", e);
            }
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

            // UNLOCK PLAYER IF NO CARDS LEFT
            if (player.selectedCards.length === 0) {
                try {
                    const trackerStub = this.env.PLAYER_TRACKER.idFromName('global');
                    const tracker = this.env.PLAYER_TRACKER.get(trackerStub);
                    tracker.fetch('https://dummy/unregister-player', {
                        method: 'POST',
                        body: JSON.stringify({ userId }),
                        headers: { 'Content-Type': 'application/json' }
                    });
                    console.log(`🔓 Player ${userId} UNLOCKED (no cards)`);
                } catch (e) {
                    console.error("Failed to unregister player lock:", e);
                }
            }

            this.broadcast({
                type: 'card_deselected',
                data: {
                    cardId,
                    playerCount: this.gameState.players.size,
                },
            });
        }
    }

    async startGame() {
        this.gameState.status = 'playing';
        this.gameState.startTime = Date.now();
        this.gameState.calledNumbers = [];

        // Deduct balance from all players
        const betAmounts: Record<GameMode, number> = {
            'ande-zig': 10,
            'hulet-zig': 20,
            'mulu-zig': 50
        };
        const betAmount = betAmounts[this.gameState.mode] || 10;
        const supabase = getSupabase(this.env);

        // CREATE NEW DB GAME RECORD (Essential for history tracking per round)
        // CRITICAL CHECK: Ensure supabase client is valid
        if (!supabase) {
            console.error("CRITICAL: Supabase client not initialized!");
            return;
        }

        try {
            console.log(`[DB] Creating new game record for mode ${this.gameState.mode}...`);
            const { data: newGame, error: gameError } = await supabase
                .from('games')
                .insert({
                    mode: this.gameState.mode,
                    status: 'active',
                    entry_fee: betAmount,
                    prize_pool: 0
                })
                .select('id')
                .single();

            if (newGame) {
                console.log(`🆕 Created new DB Game ID: ${newGame.id} (replacing room ID ${this.gameState.gameId})`);
                this.gameState.gameId = newGame.id;
            } else if (gameError) {
                console.error('[DB ERROR] Failed to create new game db record:', gameError);
            }
        } catch (err) {
            console.error('Error creating game record:', err);
        }

        // Deduct balance for each player
        // CRITICAL: Ensure we only charge players WITH CARDS
        for (const [userId, player] of this.gameState.players) {
            // Skip spectators
            if (player.selectedCards.length === 0) continue;

            try {
                // Get current balance and stats
                // ROBUST ID HANDLING: Check if userId is a valid Telegram ID (numeric) or needs UUID lookup
                const isTelegramId = /^\d+$/.test(userId);
                let userData;
                let userError;

                if (isTelegramId) {
                    const { data, error } = await supabase
                        .from('users')
                        .select('balance, total_games_played, id, telegram_id')
                        .eq('telegram_id', parseInt(userId))
                        .single();
                    userData = data;
                    userError = error;
                } else {
                    // Assume UUID
                    const { data, error } = await supabase
                        .from('users')
                        .select('balance, total_games_played, id, telegram_id')
                        .eq('id', userId)
                        .single();
                    userData = data;
                    userError = error;
                }

                if (userError || !userData) {
                    console.error(`Failed to get balance for user ${userId} (isTelegramId=${isTelegramId}):`, userError);
                    continue;
                }

                const cardCount = player.selectedCards.length;
                const totalBet = betAmount * cardCount;
                const balanceBefore = parseFloat(userData.balance || '0');
                const balanceAfter = balanceBefore - totalBet;
                const gamesPlayed = (userData.total_games_played || 0) + 1;

                // Deduct balance and update stats
                const { error: updateError } = await supabase
                    .from('users')
                    .update({ balance: balanceAfter, total_games_played: gamesPlayed })
                    .eq('id', userData.id); // ALWAYS use the resolved UUID for updates to avoid ambiguity

                if (updateError) {
                    console.error(`Failed to deduct balance for user ${userId}:`, updateError);
                    continue;
                }

                // Record transaction
                const { error: txError } = await supabase
                    .from('game_transactions')
                    .insert({
                        user_id: userData.id, // Use resolved UUID
                        game_id: this.gameState.gameId, // Use the NEW gameId
                        type: 'bet',
                        amount: totalBet,
                        balance_before: balanceBefore,
                        balance_after: balanceAfter
                    });

                if (txError) console.error(`Failed to record bet transaction:`, txError);
                console.log(`💰 Deducted ${totalBet} from ${userId} (UUID: ${userData.id}). Bal: ${balanceBefore}->${balanceAfter}`);

                // Record player in game_players table (ISOLATED)
                // This is what History.tsx reads via the 'recent_games' view/logic
                const historyEntries = player.selectedCards.map(cardId => ({
                    game_id: this.gameState.gameId,
                    user_id: userData.id, // UUID
                    card_id: cardId,
                    card_data: JSON.stringify({ numbers: [] }), // Minimal placeholder
                    is_winner: false,
                    prize_amount: 0,
                    joined_at: new Date().toISOString()
                }));

                const { error: gpError } = await supabase.from('game_players').insert(historyEntries);
                if (gpError) console.error(`[HISTORY] Error inserting game_players:`, gpError);

                // SYNC 1: Notify App via WebSocket (Instant Update)
                this.sendToPlayer(userId, {
                    type: 'balance_update',
                    data: {
                        balance: balanceAfter,
                        change: -totalBet,
                        reason: 'Game Entry'
                    }
                });

            } catch (error) {
                console.error(`Error processing balance for user ${userId}:`, error);
            }
        }

        this.broadcast({
            type: 'game_started',
            data: {},
        });

        // Generate shuffled numbers
        const numbers = Array.from({ length: 75 }, (_, i) => i + 1);
        this.shuffleArray(numbers);

        console.log(`🚀 [GAME START] Interval starting for GameId: ${this.gameState.gameId}. Total players: ${this.gameState.players.size}`);

        let index = 0;
        this.gameInterval = setInterval(() => {
            try {
                if (index >= numbers.length || this.gameState.status === 'ended') {
                    console.log(`⏹️ [GAME LOOP END] Reason: ${index >= numbers.length ? 'All numbers called' : 'Status set to ended'}`);
                    clearInterval(this.gameInterval);

                    // Check for no-winner scenario (all 75 numbers called, no winner)
                    if (index >= numbers.length && this.gameState.status !== 'ended' && this.gameState.winners.length === 0) {
                        console.log('[NO WINNER] All 75 numbers called without a BINGO claim');
                        this.gameState.status = 'ended';

                        // Broadcast no-winner event
                        this.broadcast({
                            type: 'no_winner',
                            data: { message: 'All 75 numbers called, no winner this round' },
                        });

                        // Auto-restart after 10 seconds (same as winner announcement)
                        setTimeout(() => {
                            console.log('Auto-restarting after no-winner scenario');
                            this.resetGame();
                            if (['waiting', 'selecting'].includes(this.gameState.status)) {
                                this.startPerpetualLoop();
                            }
                        }, 10000); // 10 seconds
                    }

                    return;
                }

                const number = numbers[index++];
                this.gameState.currentNumber = number;
                this.gameState.calledNumbers.push(number);

                console.log(`📢 [NUMBER CALLED] GameId: ${this.gameState.gameId} | Mode: ${this.gameState.mode} | Number: ${number} | Seq: ${index}/75`);

                this.broadcast({
                    type: 'number_called',
                    data: {
                        number,
                        history: this.gameState.calledNumbers,
                    },
                });
            } catch (err) {
                console.error('💥 [CRITICAL] Error in game interval loop:', err);
                // Try to keep going unless it's a fatal state error
            }
        }, 4000);
    }



    handleBingoClaim(data: { cardId: number; card: BingoCard }, ws: WebSocket) {
        const userId = this.sessions.get(ws);
        if (!userId) return;

        const player = this.gameState.players.get(userId);
        if (!player) return;

        // CRITICAL: Check if game already ended (another player won)
        // This prevents sending invalid_claim for other cards when one card already won
        if (this.gameState.status === 'ended') {
            console.log(`⏹️ Game already ended, ignoring BINGO claim from ${userId}`);
            return; // Don't send invalid_claim, game is over
        }

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
            setTimeout(async () => {
                // Only process if this is the first claim being processed
                if (!this.gameState.pendingClaims.has(userId)) return;

                // Collect all claims for this number
                const simultaneousClaims: any[] = [];
                this.gameState.pendingClaims.forEach((claim, claimUserId) => {
                    const claimPlayer = this.gameState.players.get(claimUserId);
                    if (claimPlayer) {
                        // Get winning pattern
                        const winningPattern = this.getWinningPattern(claim.card, this.gameState.mode);

                        simultaneousClaims.push({
                            userId: claimUserId,
                            username: claimPlayer.username,
                            cardId: claim.cardId,
                            card: claim.card, // Include full card array for display
                            winningPattern: winningPattern, // Add winning pattern
                            calledNumbers: this.gameState.calledNumbers.length,
                            claimTime: claim.claimTime,
                        });
                    }
                });

                // Clear pending claims
                this.gameState.pendingClaims.clear();

                // End game IMMEDIATELY
                this.gameState.status = 'ended';
                if (this.gameInterval) {
                    clearInterval(this.gameInterval);
                }

                // Add all winners (prize will be split equally)
                this.gameState.winners.push(...simultaneousClaims);

                // Calculate and distribute prizes
                const betAmounts: Record<GameMode, number> = {
                    'ande-zig': 10,
                    'hulet-zig': 20,
                    'mulu-zig': 50
                };
                const betAmount = betAmounts[this.gameState.mode] || 10;

                // Calculate Total Pot based on Total Cards (not just players)
                let totalCards = 0;
                this.gameState.players.forEach(p => {
                    totalCards += p.selectedCards.length;
                });

                // Fetch dynamic commission rate
                const configService = new BotConfigService(this.env);
                const config = await configService.getConfig();
                const commissionPct = config.gameRules?.commissionPct ?? 15; // Default 15%
                const returnRate = 1 - (commissionPct / 100);

                // Check for active events (Multipliers)
                let eventMultiplier = 1.0;
                const supabase = getSupabase(this.env);
                try {
                    const { data: events } = await supabase.rpc('get_active_events');
                    if (events && events.length > 0) {
                        events.forEach((e: any) => {
                            const m = parseFloat(e.multiplier);
                            if (!isNaN(m) && m > 0) eventMultiplier *= m;
                        });
                        if (eventMultiplier > 1) {
                            console.log(`[EVENT] Applying active event multiplier: ${eventMultiplier}x`);
                        }
                    }
                } catch (err) {
                    console.error('Failed to fetch active events for multiplier:', err);
                }

                // Apply dynamic fee & Multiplier
                const grossPot = totalCards * betAmount;
                const basePot = grossPot * returnRate;
                const totalPot = basePot * eventMultiplier; // Apply multiplier to final pot
                const prizePerWinner = totalPot / simultaneousClaims.length;

                // Import notification service dynamically to avoid top-level issues
                const { notifyWinner, notifyBalanceUpdate } = await import('../bot/notifications');

                // Distribute prizes to winners
                for (const winner of simultaneousClaims) {
                    try {

                        // CRITICAL FIX: Handle both Integer (Telegram ID) and String (UUID) match
                        // The user might have joined with a UUID (frontend glitch), but we need to find their DB record
                        let targetTelegramId: number | null = null;
                        const userIdAsInt = parseInt(winner.userId);

                        if (!isNaN(userIdAsInt) && userIdAsInt.toString() === winner.userId) {
                            // It is a valid integer Telegram ID
                            targetTelegramId = userIdAsInt;
                        } else {
                            // It is a UUID string. We must look up the Telegram ID from the 'users' table using the UUID 'id' column
                            console.log(`[DEBUG] Handling UUID userId ${winner.userId}, looking up Telegram ID...`);
                            const { data: idLookup, error: idError } = await supabase
                                .from('users')
                                .select('telegram_id')
                                .eq('id', winner.userId)
                                .single();

                            if (!idError && idLookup) {
                                targetTelegramId = idLookup.telegram_id;
                                console.log(`[DEBUG] Resolved UUID ${winner.userId} to Telegram ID ${targetTelegramId}`);
                            } else {
                                console.error(`[DEBUG] Failed to resolve UUID ${winner.userId} to Telegram ID`);
                            }
                        }

                        if (!targetTelegramId) {
                            console.error(`[CRITICAL] Could not determine Telegram ID for user ${winner.userId}. Skipping balance update.`);
                            continue;
                        }

                        // Get current balance and stats
                        const { data: userData, error: userError } = await supabase
                            .from('users')
                            .select('balance, total_wins, total_winnings')
                            .eq('telegram_id', targetTelegramId)
                            .single();

                        if (userError || !userData) {
                            console.error(`Failed to get balance for winner ${winner.userId}:`, userError);
                            continue;
                        }

                        const balanceBefore = parseFloat(userData.balance || '0');
                        const balanceAfter = balanceBefore + prizePerWinner;
                        const wins = (userData.total_wins || 0) + 1;
                        const winnings = parseFloat(userData.total_winnings || '0') + prizePerWinner;

                        // Add prize and update stats
                        const { error: updateError } = await supabase
                            .from('users')
                            .update({
                                balance: balanceAfter,
                                total_wins: wins,
                                total_winnings: winnings
                            })
                            .eq('telegram_id', targetTelegramId);

                        if (updateError) {
                            console.error(`Failed to add prize for winner ${winner.userId}:`, updateError);
                            continue;
                        }

                        // Record win transaction
                        const { error: txError } = await supabase
                            .from('game_transactions')
                            .insert({
                                user_id: targetTelegramId,
                                game_id: this.gameState.gameId,
                                type: 'win',
                                amount: prizePerWinner,
                                balance_before: balanceBefore,
                                balance_after: balanceAfter
                            });

                        if (txError) {
                            console.error(`Failed to record win transaction for ${winner.userId}:`, txError);
                        }

                        // Update game_players record with result (ISOLATED)
                        try {
                            const { data: idData } = await supabase
                                .from('users')
                                .select('id')
                                .eq('telegram_id', targetTelegramId)
                                .single();

                            if (idData) {
                                const { error: gpUpdateError } = await supabase
                                    .from('game_players')
                                    .update({
                                        is_winner: true,
                                        prize_amount: prizePerWinner,
                                        card_id: winner.cardId,
                                        card_data: JSON.stringify(winner.card)
                                    })
                                    .eq('game_id', this.gameState.gameId)
                                    .eq('user_id', idData.id)
                                    .eq('card_id', winner.cardId); // CRITICAL: Only mark the winning card!

                                if (gpUpdateError) console.error('GP update error:', gpUpdateError);
                            }
                        } catch (hError) {
                            console.error('History update error:', hError);
                        }

                        // SYNC 2: Notify App via WebSocket (Instant Update)
                        this.sendToPlayer(winner.userId, {
                            type: 'balance_update',
                            data: {
                                userId: winner.userId,
                                balance: balanceAfter,
                                change: prizePerWinner,
                                reason: 'Bingo Win'
                            }
                        });

                        // SYNC 3: Notify User via Telegram Bot
                        await notifyWinner([winner], totalPot, this.env);

                        console.log(`🎉 Added ${prizePerWinner} Birr prize to winner ${winner.userId}. Balance: ${balanceBefore} → ${balanceAfter}`);
                    } catch (error) {
                        console.error(`Error processing prize for winner ${winner.userId}:`, error);
                    }
                }

                this.broadcast({
                    type: 'game_won',
                    data: {
                        winners: simultaneousClaims,
                        prizeShare: simultaneousClaims.length > 1 ? 'split' : 'full',
                        totalPot,
                        prizePerWinner,
                    },
                });

                // Auto-restart game after 10 seconds (winner announcement duration)
                setTimeout(() => {
                    console.log('Auto-restarting game after winner announcement');
                    this.resetGame();
                    // Start new countdown immediately
                    if (this.gameState.status === 'waiting' || this.gameState.status === 'selecting') {
                        this.startPerpetualLoop();
                    }
                }, 10000); // 10 seconds for winner announcement
            }, 500); // 500ms window for simultaneous claims
        } else {
            // Only send invalid_claim if game is still active
            // Double-check status in case it changed during validation
            if (this.gameState.status === 'playing') {
                ws.send(JSON.stringify({
                    type: 'invalid_claim',
                    data: { message: 'No valid Bingo pattern found' },
                }));
            }
        }
    }

    getWinningPattern(card: BingoCard, mode: GameMode): boolean[][] {
        const numbers = card.numbers;
        const called = new Set(this.gameState.calledNumbers);
        const pattern: boolean[][] = Array(5).fill(0).map(() => Array(5).fill(false));

        // Mark free space
        pattern[2][2] = true;

        // Check if number is marked
        const isMarked = (row: number, col: number): boolean => {
            if (row === 2 && col === 2) return true;
            return called.has(numbers[row][col]);
        };

        // Check and mark rows
        for (let row = 0; row < 5; row++) {
            let rowComplete = true;
            for (let col = 0; col < 5; col++) {
                if (!isMarked(row, col)) {
                    rowComplete = false;
                    break;
                }
            }
            if (rowComplete) {
                for (let col = 0; col < 5; col++) {
                    pattern[row][col] = true;
                }
            }
        }

        // Check and mark columns
        for (let col = 0; col < 5; col++) {
            let colComplete = true;
            for (let row = 0; row < 5; row++) {
                if (!isMarked(row, col)) {
                    colComplete = false;
                    break;
                }
            }
            if (colComplete) {
                for (let row = 0; row < 5; row++) {
                    pattern[row][col] = true;
                }
            }
        }

        // Check and mark diagonal 1 (top-left to bottom-right)
        let diag1Complete = true;
        for (let i = 0; i < 5; i++) {
            if (!isMarked(i, i)) {
                diag1Complete = false;
                break;
            }
        }
        if (diag1Complete) {
            for (let i = 0; i < 5; i++) {
                pattern[i][i] = true;
            }
        }

        // Check and mark diagonal 2 (top-right to bottom-left)
        let diag2Complete = true;
        for (let i = 0; i < 5; i++) {
            if (!isMarked(i, 4 - i)) {
                diag2Complete = false;
                break;
            }
        }
        if (diag2Complete) {
            for (let i = 0; i < 5; i++) {
                pattern[i][4 - i] = true;
            }
        }

        // Check and mark 4 corners (for Ande Zig)
        if (mode === 'ande-zig') {
            const corners4Complete = isMarked(0, 0) && isMarked(0, 4) && isMarked(4, 0) && isMarked(4, 4);
            if (corners4Complete) {
                pattern[0][0] = true;
                pattern[0][4] = true;
                pattern[4][0] = true;
                pattern[4][4] = true;
            }
        }

        return pattern;
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

        // Check 4 corners
        const check4Corners = (): boolean => {
            return isMarked(0, 0) && isMarked(0, 4) && isMarked(4, 0) && isMarked(4, 4);
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
            case 'ande-zig': // One pattern OR 4 corners
                return patterns >= 1 || check4Corners();
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

    // Helper to send message to specific player
    sendToPlayer(userId: string, message: any) {
        console.log(`[DEBUG] sendToPlayer called for userId=${userId}. Total sessions: ${this.sessions.size}`);
        let found = false;
        for (const [ws, sessionUserId] of this.sessions.entries()) {
            if (sessionUserId === userId) {
                console.log(`[DEBUG] Found session for userId=${userId}, sending message type=${message.type}`);
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify(message));
                    found = true;
                } else {
                    console.log(`[DEBUG] Session found but socket not OPEN. State: ${ws.readyState}`);
                }
            }
        }
        if (!found) {
            console.log(`[DEBUG] No active session found for userId=${userId} in sessions map.`);
            // Debug: Print all session keys
            console.log(`[DEBUG] Available sessions: ${Array.from(this.sessions.values()).join(', ')}`);
        }
    }

    broadcast(message: any, exclude?: WebSocket) {
        const msg = JSON.stringify(message);
        let count = 0;
        let closedCount = 0;
        let blockedCount = 0;

        // Reverting to manual session map iteration
        // state.getWebSockets() seems to cause issues with non-hibernatable DOs in some contexts
        this.sessions.forEach((userId, ws) => {
            if (ws !== exclude) {
                if (ws.readyState === 1) { // WebSocket.OPEN
                    try {
                        ws.send(msg);
                        count++;
                    } catch (error) {
                        console.error(`[BROADCAST ERROR] Failed to send to ${userId}:`, error);
                    }
                } else {
                    closedCount++;
                }
            } else {
                blockedCount++;
            }
        });

        // Log broadcast status for debugging live update issues
        console.log(`📡 [BROADCAST] ${message.type} sent to ${count} clients. (Skipped: ${closedCount} closed/connecting, ${blockedCount} excluded). Total sessions: ${this.sessions.size}`);
    }

    shuffleArray(array: number[]) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // Persistence helpers
    async saveState() {
        // No-op for now as this version clears storage in constructor, 
        // but defined to satisfy calls and linting.
        return Promise.resolve();
    }

    async savePlayer(userId: string) {
        // No-op for now to match saveState.
        return Promise.resolve();
    }
}
