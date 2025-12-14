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
        const gameId = uuidv4();
        console.log(🎮 Creating NEW  game: );
        const gameManager = getGameManager();
        gameManager.createGame(mode, entryFee, gameId);
        if (db) {
            db.collection('games').doc(gameId).set({
                mode, entryFee, status: 'selecting',
                createdAt: new Date().toISOString(),
                players: [], selectedCards: {}, maxPlayers: 20
            }).catch(err => console.error('Firebase store error:', err));
        }
        return res.status(200).json({ gameId, mode, entryFee, canPlay: true });
    } catch (error: any) {
        console.error('Create game error:', error);
        res.status(500).json({ error: error.message || 'Failed to create game' });
    }
};
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

