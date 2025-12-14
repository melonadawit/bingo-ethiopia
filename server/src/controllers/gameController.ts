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
            console.log(`🎮 Matchmaking: Joining waiting ${mode} game ${gameId}`);

            // Ensure game exists in GameManager too
            try {
                const gameManager = getGameManager();
                const existingGame = gameManager.getGame(gameId);
                if (!existingGame) {
                    console.log(`⚠️ Game ${gameId} exists in Firebase but not GameManager - creating it`);
                    gameManager.createGame(mode, entryFee, gameId);
                }
            } catch (error) {
                console.error('Error ensuring game in GameManager:', error);
            }

            return res.status(200).json({
                gameId,
                mode,
                entryFee,
                canPlay: true
            });
        }

        // MATCHMAKING Step 2: No waiting game - check for ongoing games to spectate
        const ongoingGames = await db.collection('games')
            .where('mode', '==', mode)
            .where('status', 'in', ['countdown', 'playing'])
            .limit(1)
            .get();

        if (!ongoingGames.empty) {
            const gameDoc = ongoingGames.docs[0];
            console.log(`👁️ Spectator: Watching ongoing ${mode} game ${gameDoc.id}`);
            return res.status(200).json({
                gameId: gameDoc.id,
                mode,
                entryFee,
                canPlay: false,
                spectator: true,
                message: 'Game in progress - watching only'
            });
        }

        // MATCHMAKING Step 3: No games at all - create first game and wait
        const gameId = uuidv4();
        console.log(`🆕 Creating first ${mode} game ${gameId} - waiting for players`);

        // Create in Firebase
        await db.collection('games').doc(gameId).set({
            mode,
            entryFee,
            status: 'selecting',
            players: [],
            selectedCards: {},
            createdAt: new Date().toISOString(),
            maxPlayers: 20
        });

        // CRITICAL: Also create in GameManager for Socket.IO
        try {
            const gameManager = getGameManager();
            gameManager.createGame(mode, entryFee, gameId);
            console.log(`✅ Game ${gameId} created in both Firebase and GameManager`);
        } catch (error) {
            console.error('Failed to create game in GameManager:', error);
        }

        res.status(200).json({
            gameId,
            mode,
            entryFee,
            canPlay: true,
            firstPlayer: true,
            message: 'Waiting for other players to join...'
        });
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
                title: modeId === 'and-zig' ? 'And-zig (አንድ ዝግ)' : modeId === 'hulet-zig' ? 'Hulet-zig (ሁለት ዝግ)' : 'Mulu-zig (ሙሉ ዝግ)',
                description: modeId === 'and-zig' ? 'Complete 1 Line or 4 Corners' : modeId === 'hulet-zig' ? 'Complete 2 Lines' : 'Blackout: Mark All 25 Cells'
            });
        }

        res.status(200).json(gameModes);
    } catch (error) {
        console.error('Error fetching game modes:', error);
        // Return default modes if error
        res.status(200).json([
            { id: 'and-zig', minBet: 50, activePlayers: 0, icon: 'Zap', color: 'from-blue-500 to-cyan-500', title: 'And-zig (አንድ ዝግ)', description: 'Complete 1 Line or 4 Corners' },
            { id: 'hulet-zig', minBet: 100, activePlayers: 0, icon: 'PlayCircle', color: 'from-purple-500 to-pink-500', title: 'Hulet-zig (ሁለት ዝግ)', description: 'Complete 2 Lines' },
            { id: 'mulu-zig', minBet: 150, activePlayers: 0, icon: 'Trophy', color: 'from-amber-500 to-orange-500', title: 'Mulu-zig (ሙሉ ዝግ)', description: 'Blackout: Mark All 25 Cells' }
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

