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

    constructor(state: DurableObjectState, env: Env) {
        this.state = state;
        this.env = env;
    }

    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);
        const path = url.pathname;

        try {
            if (path === '/check-player') {
                const { userId } = await request.json() as { userId: string };
                // Fetch from storage with the unique key
                const prefix = `session:${userId}:`;
                const sessionsMap = await this.state.storage.list<ActivePlayer>({ prefix, limit: 1 });
                const sessions = Array.from(sessionsMap.values());

                if (sessions.length > 0) {
                    const activePlayer = sessions[0];
                    return new Response(JSON.stringify({
                        isActive: true,
                        currentMode: activePlayer.mode,
                        currentGameId: activePlayer.gameId,
                    }), {
                        headers: { 'Content-Type': 'application/json' },
                    });
                }

                return new Response(JSON.stringify({ isActive: false }), {
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            if (path === '/register-player') {
                const { userId, gameId, mode } = await request.json() as {
                    userId: string;
                    gameId: string;
                    mode: string;
                };

                const session: ActivePlayer = {
                    userId,
                    gameId,
                    mode,
                    joinedAt: Date.now(),
                };

                // Clear any old sessions for this user first to ensure only one active
                const prefix = `session:${userId}:`;
                const oldKeys = Array.from((await this.state.storage.list({ prefix })).keys());
                if (oldKeys.length > 0) await this.state.storage.delete(oldKeys);

                // Register new session
                await this.state.storage.put(`session:${userId}:${mode}`, session);

                return new Response(JSON.stringify({ success: true }), {
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            if (path === '/unregister-player') {
                const { userId } = await request.json() as { userId: string };
                const prefix = `session:${userId}:`;
                const keys = Array.from((await this.state.storage.list({ prefix })).keys());
                if (keys.length > 0) {
                    await this.state.storage.delete(keys);
                }

                return new Response(JSON.stringify({ success: true }), {
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            if (path === '/cleanup') {
                const now = Date.now();
                const twoHours = 2 * 60 * 60 * 1000;
                let totalCleaned = 0;

                const sessions = await this.state.storage.list<ActivePlayer>({ prefix: 'session:' });
                const keysToDelete: string[] = [];

                for (const [key, session] of sessions) {
                    if (now - session.joinedAt > twoHours) {
                        keysToDelete.push(key);
                        totalCleaned++;
                    }
                }

                if (keysToDelete.length > 0) {
                    await this.state.storage.delete(keysToDelete);
                }

                return new Response(JSON.stringify({
                    success: true,
                    cleaned: totalCleaned,
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
