import { Request, Response } from 'express';
import { db } from '../firebase';

export const createGame = async (req: Request, res: Response) => {
    res.status(200).json({ message: 'Create game endpoint' });
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

            // Try to get real count from Firebase
            if (db) {
                try {
                    const gamesSnapshot = await db.collection('games')
                        .where('mode', '==', modeId)
                        .where('status', '==', 'waiting')
                        .get();

                    // Count all players in waiting games
                    gamesSnapshot.docs.forEach(doc => {
                        const data = doc.data();
                        activePlayers += (data.players || []).length;
                    });
                } catch (error) {
                    console.error(`Error fetching ${modeId} player count:`, error);
                }
            }

            // Create mode object
            const modeData: any = {
                id: modeId,
                minBet: modeId === 'and-zig' ? 50 : modeId === 'hulet-zig' ? 100 : 150,
                activePlayers: activePlayers || (modeId === 'and-zig' ? 142 : modeId === 'hulet-zig' ? 89 : 215), // Fallback to mock
                icon: modeId === 'and-zig' ? 'Zap' : modeId === 'hulet-zig' ? 'PlayCircle' : 'Trophy',
                color: modeId === 'and-zig' ? 'from-blue-500 to-cyan-500' : modeId === 'hulet-zig' ? 'from-purple-500 to-pink-500' : 'from-amber-500 to-orange-500'
            };

            if (modeId === 'and-zig') {
                modeData.title = 'And-zig (አንድ ዝግ)';
                modeData.description = 'Complete 1 Line or 4 Corners';
            } else if (modeId === 'hulet-zig') {
                modeData.title = 'Hulet-zig (ሁለት ዝግ)';
                modeData.description = 'Complete 2 Lines';
            } else {
                modeData.title = 'Mulu-zig (ሙሉ ዝግ)';
                modeData.description = 'Blackout: Mark All 25 Cells';
            }

            gameModes.push(modeData);
        }

        res.status(200).json(gameModes);
    } catch (error) {
        console.error('Error in getGameModes:', error);
        res.status(500).json({ error: 'Failed to fetch game modes' });
    }
};

export const getGlobalStats = async (req: Request, res: Response) => {
    try {
        let totalPlayers = 0;
        let jackpotPool = 0;

        // Try to get real stats from Firebase
        if (db) {
            try {
                const gamesSnapshot = await db.collection('games')
                    .where('status', '==', 'waiting')
                    .get();

                gamesSnapshot.docs.forEach(doc => {
                    const data = doc.data();
                    totalPlayers += (data.players || []).length;
                    jackpotPool += data.entryFee || 0;
                });
            } catch (error) {
                console.error('Error fetching global stats:', error);
            }
        }

        const stats = {
            activePlayers: totalPlayers || 446, // Fallback to mock
            totalPrizePool: jackpotPool || 45200, // Fallback to mock
            isSystemLive: true
        };

        res.status(200).json(stats);
    } catch (error) {
        console.error('Error in getGlobalStats:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
};
