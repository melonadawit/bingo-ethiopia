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

        // ALWAYS CREATE A NEW GAME - Don't reuse ended games
        const gameId = uuidv4();
        console.log(`🎮 Creating NEW ${mode} game: ${gameId}`);

        try {
            const gameManager = getGameManager();
            gameManager.createGame(mode, entryFee, gameId);

            // Optionally store in Firebase (non-blocking)
            if (db) {
                db.collection('games').doc(gameId).set({
                    mode,
                    entryFee,
                    status: 'selecting',
                    createdAt: new Date().toISOString(),
                    players: []
                }).catch(err => console.error('Firebase store error:', err));
            }

            return res.status(200).json({
                gameId,
                mode,
                entryFee,
                canPlay: true
            });
        } catch (error) {
            console.error('Error creating game:', error);
            return res.status(500).json({ error: 'Failed to create game' });
        }
    } catch (error: any) {
        console.error('Create game error:', error);
        res.status(500).json({ error: error.message || 'Failed to create game' });
    }
};
