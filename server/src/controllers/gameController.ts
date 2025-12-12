import { Request, Response } from 'express';

export const createGame = async (req: Request, res: Response) => {
    res.status(200).json({ message: 'Create game endpoint' });
};

export const joinGame = async (req: Request, res: Response) => {
    res.status(200).json({ message: 'Join game endpoint' });
};

export const getGameModes = async (req: Request, res: Response) => {
    // In a real app, this might come from a DB or config file
    const gameModes = [
        {
            id: 'and-zig',
            title: 'And-zig (አንድ ዝግ)',
            description: 'Complete 1 Line or 4 Corners',
            minBet: 10,
            activePlayers: 142, // Mocked live data
            color: 'from-blue-500 to-cyan-400',
            icon: 'Zap'
        },
        {
            id: 'hulet-zig',
            title: 'Hulet-zig (ሁለት ዝግ)',
            description: 'Complete 2 Lines',
            minBet: 20,
            activePlayers: 89,
            color: 'from-purple-500 to-pink-500',
            icon: 'PlayCircle'
        },
        {
            id: 'mulu-zig',
            title: 'Mulu-zig (ሙሉ ዝግ)',
            description: 'Blackout: Mark All 25 Cells',
            minBet: 50,
            activePlayers: 215,
            color: 'from-amber-500 to-orange-500',
            icon: 'Trophy'
        }
    ];

    res.status(200).json(gameModes);
};

export const getGlobalStats = async (req: Request, res: Response) => {
    // Mocked global stats
    const stats = {
        totalPlayers: 1245,
        onlinePlayers: 450,
        jackpotPool: 45200,
        isSystemLive: true
    };
    res.status(200).json(stats);
};
