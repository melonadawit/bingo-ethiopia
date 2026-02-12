// Redis utilities for game event scheduling
import { Redis } from '@upstash/redis/cloudflare';
import type { Env } from '../types';

export interface GameEvent {
    type: 'countdown_tick' | 'start_game' | 'call_number' | 'reset_game';
    gameId: string;
    countdown?: number;
    numberIndex?: number;
}

export function createRedisClient(env: Env): Redis {
    return new Redis({
        url: env.UPSTASH_REDIS_REST_URL,
        token: env.UPSTASH_REDIS_REST_TOKEN,
    });
}

export async function scheduleEvent(
    redis: Redis,
    event: GameEvent,
    delayMs: number
): Promise<void> {
    const executeAt = Date.now() + delayMs;
    await redis.zadd('game-events', {
        score: executeAt,
        member: JSON.stringify(event),
    });
}

export async function getReadyEvents(redis: Redis): Promise<GameEvent[]> {
    const now = Date.now();

    // Get events ready to execute
    const ready = await redis.zrange('game-events', 0, now, {
        byScore: true,
        count: 100,
    });

    if (!ready || ready.length === 0) return [];

    // Parse events
    const events: GameEvent[] = [];
    for (const eventStr of ready) {
        try {
            events.push(JSON.parse(eventStr as string));
        } catch (error) {
            console.error('Failed to parse event:', eventStr, error);
        }
    }

    return events;
}

export async function removeEvent(redis: Redis, event: GameEvent): Promise<void> {
    await redis.zrem('game-events', JSON.stringify(event));
}

export async function cleanupOldEvents(redis: Redis): Promise<void> {
    // Remove events older than 1 hour
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    await redis.zremrangebyscore('game-events', 0, oneHourAgo);
}
