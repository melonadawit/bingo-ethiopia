import { Request, Response } from 'express';
import { db } from '../firebase';
import { v4 as uuidv4 } from 'uuid';
import { getGameManager } from '../socket';

export const createGame = async (req: Request, res: Response) => {
    try {
        const { mode } = req.body;

        if (!mode || !['and-zig', 'hulet-zig', 'mulu-zig'].includes(mode)) {
            return res.status(400).json({ error: 'Invalid game mode' });
        }

        const entryFee = mode === 'and-zig' ? 50 : mode === 'hulet-zig' ? 100 : 150;

        if (!db) {
            return res.status(500).json({ error: 'Database not available' });
        }

        // MATCHMAKING Step 1: Check for games in selection phase (can join and play)
        const waitingGames = await db.collection('games')
            .where('mode', '==', mode)
            .where('status', '==', 'selecting')
            .limit(1)
            .get();

        if (!waitingGames.empty) {
            const gameDoc = waitingGames.docs[0];
            const gameId = gameDoc.id;
            console.log(`≡ƒÄ« Matchmaking: Joining waiting ${mode} game ${gameId}`);

            // Ensure game exists in GameManager too
            try {
                const gameManager = getGameManager();
                const existingGame = gameManager.getGame(gameId);
                if (!existingGame) {
                    console.log(`ΓÜá∩╕Å Game ${gameId} exists in Firebase but not GameManager - creating it`);
                    gameManager.createGame(mode, entryFee, gameId);
                    return res.status(200).json({
                        gameId,
                        mode,
                        entryFee,
                        canPlay: true
                    });
                } else if (existingGame.status === 'ended') {
                    // Game ended in GameManager but not updated in Firebase - skip it
                    console.log(`ΓÜá∩╕Å Game ${gameId} is ended in GameManager - creating new game instead`);
                    // Fall through to create new game
                } else {
                    return res.status(200).json({
                        gameId,
                        mode,
                        entryFee,
                        canPlay: true
                    });
                }
            } catch (error) {
                console.error('Error ensuring game in GameManager:', error);
            }

            // If we didn't return above, create a new game
            if (!res.headersSent) {
                // Continue to create new game below
            } else {
                return;
            }
        }

        // MATCHMAKING Step 2: No waiting game - check for ongoing games to spectate
        const ongoingGames = await db.collection('games')
            .where('mode', '==', mode)
            .where('status', 'in', ['countdown', 'playing'])
            .limit(1)
            .get();

        if (!ongoingGames.empty) {
            const gameDoc = ongoingGames.docs[0];
            console.log(`≡ƒæü∩╕Å Spectator: Watching ongoing ${mode} game ${gameDoc.id}`);
            return res.status(200).json({
                gameId: gameDoc.id,
                mode,
                entryFee,
                canPlay: false,
                spectator: true,
                message: 'Game in progress - watching only'
            });
        }

        // MATCHMAKING Step 3: No games at all - create new game atomically
        // Use a well-known document ID based on mode to prevent race conditions
        const lockDocId = `${mode}-current`;
        const lockRef = db.collection('game-locks').doc(lockDocId);

        try {
            // Try to get or create the current game for this mode atomically
            const result = await db.runTransaction(async (transaction) => {
                const lockDoc = await transaction.get(lockRef);

                if (lockDoc.exists) {
                    const lockData = lockDoc.data();
                    const existingGameId = lockData?.gameId;

                    // Check if this game still exists and is joinable (ONLY in selecting status)
                    if (existingGameId) {
                        const gameDoc = await transaction.get(db!.collection('games').doc(existingGameId));
                        const gameData = gameDoc.data();

                        // Only join if game exists AND is in selecting status (not playing or ended)
                        if (gameDoc.exists && gameData?.status === 'selecting') {
                            console.log(`≡ƒöÆ Transaction: Found existing game ${existingGameId} via lock`);
                            return { gameId: existingGameId, created: false };
                        } else {
                            console.log(`≡ƒÜ½ Transaction: Game ${existingGameId} is ${gameData?.status}, creating new game`);
                        }
                    }
                }

                // No valid game exists - create new one
                const gameId = uuidv4();
                console.log(`≡ƒåò Transaction: Creating new ${mode} game ${gameId}`);

                // Create game in Firebase
                transaction.set(db!.collection('games').doc(gameId), {
                    mode,
                    entryFee,
                    status: 'selecting',
                    players: [],
                    selectedCards: {},
                    createdAt: new Date().toISOString(),
                    maxPlayers: 20
                });

                // Update lock to point to this game
                transaction.set(lockRef, {
                    gameId,
                    mode,
                    createdAt: new Date().toISOString()
                });

                return { gameId, created: true };
            });

            const { gameId, created } = result;

            // Create in GameManager if new
            if (created) {
                try {
                    const gameManager = getGameManager();
                    gameManager.createGame(mode, entryFee, gameId);
                    console.log(`Γ£à Game ${gameId} created in both Firebase and GameManager`);
                } catch (error) {
                    console.error('Failed to create game in GameManager:', error);
                }
            } else {
                // Ensure existing game is in GameManager
                const gameManager = getGameManager();
                const existingGame = gameManager.getGame(gameId);
                if (!existingGame) {
                    gameManager.createGame(mode, entryFee, gameId);
                    console.log(`Γ£à Added existing game ${gameId} to GameManager`);
                }
            }

            res.status(200).json({
                gameId,
                mode,
                entryFee,
                canPlay: true,
                firstPlayer: created,
                message: created ? 'Waiting for other players to join...' : 'Joining existing game...'
            });

        } catch (error) {
            console.error('Transaction failed:', error);
            return res.status(500).json({ error: 'Failed to create/join game' });
        }
    } catch (error) {
        console.error('Error in matchmaking:', error);
        res.status(500).json({ error: 'Failed to find/create game' });
    }
};

export const joinGame = async (req: Request, res: Response) => {
    res.status(200).json({ message: 'Join game endpoint' });
};

export const getGameModes = async (req: Request, res: Response) => {
    try {
        // Fetch real active player counts from Firebase
        const modes = ['and-zig', 'hulet-zig', 'mulu-zig'];
        const gameModes = [];

        for (const modeId of modes) {
            let activePlayers = 0;

            // Count active players in this mode
            if (db) {
                const activeGames = await db.collection('games')
                    .where('mode', '==', modeId)
                    .where('status', 'in', ['selecting', 'countdown', 'playing'])
                    .get();

                activePlayers = activeGames.docs.reduce((total, doc) => {
                    const data = doc.data();
                    return total + (data.players?.length || 0);
                }, 0);
            }

            gameModes.push({
                id: modeId,
                minBet: modeId === 'and-zig' ? 50 : modeId === 'hulet-zig' ? 100 : 150,
                activePlayers,
                icon: modeId === 'and-zig' ? 'Zap' : modeId === 'hulet-zig' ? 'PlayCircle' : 'Trophy',
                color: modeId === 'and-zig' ? 'from-blue-500 to-cyan-500' : modeId === 'hulet-zig' ? 'from-purple-500 to-pink-500' : 'from-amber-500 to-orange-500',
                title: modeId === 'and-zig' ? 'And-zig (ßèáßèòßï╡ ßï¥ßîì)' : modeId === 'hulet-zig' ? 'Hulet-zig (ßêüßêêßë╡ ßï¥ßîì)' : 'Mulu-zig (ßêÖßêë ßï¥ßîì)',
                description: modeId === 'and-zig' ? 'Complete 1 Line or 4 Corners' : modeId === 'hulet-zig' ? 'Complete 2 Lines' : 'Blackout: Mark All 25 Cells'
            });
        }

        res.status(200).json(gameModes);
    } catch (error) {
        console.error('Error fetching game modes:', error);
        // Return default modes if error
        res.status(200).json([
            { id: 'and-zig', minBet: 50, activePlayers: 0, icon: 'Zap', color: 'from-blue-500 to-cyan-500', title: 'And-zig (ßèáßèòßï╡ ßï¥ßîì)', description: 'Complete 1 Line or 4 Corners' },
            { id: 'hulet-zig', minBet: 100, activePlayers: 0, icon: 'PlayCircle', color: 'from-purple-500 to-pink-500', title: 'Hulet-zig (ßêüßêêßë╡ ßï¥ßîì)', description: 'Complete 2 Lines' },
            { id: 'mulu-zig', minBet: 150, activePlayers: 0, icon: 'Trophy', color: 'from-amber-500 to-orange-500', title: 'Mulu-zig (ßêÖßêë ßï¥ßîì)', description: 'Blackout: Mark All 25 Cells' }
        ]);
    }
};

export const getGlobalStats = async (req: Request, res: Response) => {
    try {
        let totalPlayers = 0;
        let totalGames = 0;

        if (db) {
            const activeGames = await db.collection('games')
                .where('status', 'in', ['selecting', 'countdown', 'playing'])
                .get();

            totalGames = activeGames.size;
            totalPlayers = activeGames.docs.reduce((total, doc) => {
                const data = doc.data();
                return total + (data.players?.length || 0);
            }, 0);
        }

        res.status(200).json({
            totalPlayers,
            activeGames: totalGames,
            isSystemLive: totalGames > 0
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(200).json({
            totalPlayers: 0,
            activeGames: 0,
            isSystemLive: false
        });
    }
};

