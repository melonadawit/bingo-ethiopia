import type { Env } from '../types';

interface ActivePlayer {
    userId: string;
    gameId: string;
    mode: string;
    joinedAt: number;
}

export class PlayerTracker {
    state: DurableObjectState;
    env: Env;
    activePlayers: Map<string, ActivePlayer>; // userId -> ActivePlayer

    constructor(state: DurableObjectState, env: Env) {
        this.state = state;
        this.env = env;
        this.activePlayers = new Map();
    }

    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);
        const path = url.pathname;

        try {
            if (path === '/check-player') {
                // Check if player is in another mode
                const { userId } = await request.json() as { userId: string };
                const activePlayer = this.activePlayers.get(userId);

                if (activePlayer) {
                    return new Response(JSON.stringify({
                        isActive: true,
                        currentMode: activePlayer.mode,
                        currentGameId: activePlayer.gameId,
                    }), {
                        headers: { 'Content-Type': 'application/json' },
                    });
                }

                return new Response(JSON.stringify({
                    isActive: false,
                }), {
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            if (path === '/register-player') {
                // Register player in a mode
                const { userId, gameId, mode } = await request.json() as {
                    userId: string;
                    gameId: string;
                    mode: string;
                };

                this.activePlayers.set(userId, {
                    userId,
                    gameId,
                    mode,
                    joinedAt: Date.now(),
                });

                return new Response(JSON.stringify({ success: true }), {
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            if (path === '/unregister-player') {
                // Remove player from tracking
                const { userId } = await request.json() as { userId: string };
                this.activePlayers.delete(userId);

                return new Response(JSON.stringify({ success: true }), {
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            if (path === '/cleanup') {
                // Clean up stale players (older than 2 hours)
                const now = Date.now();
                const twoHours = 2 * 60 * 60 * 1000;

                for (const [userId, player] of this.activePlayers.entries()) {
                    if (now - player.joinedAt > twoHours) {
                        this.activePlayers.delete(userId);
                    }
                }

                return new Response(JSON.stringify({
                    success: true,
                    cleaned: this.activePlayers.size,
                }), {
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            return new Response('Not Found', { status: 404 });
        } catch (error) {
            return new Response(JSON.stringify({ error: String(error) }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }
    }
}
