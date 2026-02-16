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
                const { userId, mode } = await request.json() as { userId: string, mode?: string };

                if (mode) {
                    // Check specific mode session
                    const session = await this.state.storage.get<ActivePlayer>(`session:${userId}:${mode}`);
                    if (session) {
                        return new Response(JSON.stringify({
                            isActive: true,
                            currentMode: session.mode,
                            currentGameId: session.gameId,
                        }), { headers: { 'Content-Type': 'application/json' } });
                    }
                } else {
                    // Return all active modes for this user
                    const prefix = `session:${userId}:`;
                    const sessionsMap = await this.state.storage.list<ActivePlayer>({ prefix });
                    const sessions = Array.from(sessionsMap.values());

                    if (sessions.length > 0) {
                        return new Response(JSON.stringify({
                            isActive: true,
                            sessions: sessions.map(s => ({ mode: s.mode, gameId: s.gameId }))
                        }), { headers: { 'Content-Type': 'application/json' } });
                    }
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

                await this.state.storage.put(`session:${userId}:${mode}`, session);

                return new Response(JSON.stringify({ success: true }), {
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            if (path === '/unregister-player') {
                const { userId, mode } = await request.json() as { userId: string, mode?: string };

                if (mode) {
                    await this.state.storage.delete(`session:${userId}:${mode}`);
                } else {
                    // Unregister all modes for this user
                    const prefix = `session:${userId}:`;
                    const keys = Array.from((await this.state.storage.list({ prefix, limit: 10 })).keys());
                    if (keys.length > 0) {
                        await this.state.storage.delete(keys);
                    }
                }

                return new Response(JSON.stringify({ success: true }), {
                    headers: { 'Content-Type': 'application/json' },
                });
            }

            if (path === '/cleanup') {
                const now = Date.now();
                const twoHours = 2 * 60 * 60 * 1000;
                let totalCleaned = 0;

                // Simple but potentially expensive scan for global cleanup
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
