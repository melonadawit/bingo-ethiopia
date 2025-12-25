// Game event processor for cron trigger
import { createRedisClient, getReadyEvents, removeEvent, cleanupOldEvents, scheduleEvent, GameEvent } from './utils/redis';
import type { Env } from './types';

export async function processGameEvents(env: Env): Promise<void> {
    try {
        console.log('[CRON] Starting event processing...');
        const redis = createRedisClient(env);

        // Get all ready events
        const events = await getReadyEvents(redis);

        if (events.length === 0) {
            console.log('[CRON] No events ready to process');
            return;
        }

        console.log(`[CRON] Processing ${events.length} events:`, events);

        // Process each event
        for (const event of events) {
            try {
                console.log(`[CRON] Processing event:`, event);
                await processEvent(event, env, redis);
                await removeEvent(redis, event);
                console.log(`[CRON] Successfully processed event:`, event.type);
            } catch (error) {
                console.error('[CRON] Error processing event:', event, error);
            }
        }

        // Cleanup old events
        await cleanupOldEvents(redis);
        console.log('[CRON] Event processing complete');
    } catch (error) {
        console.error('[CRON] Fatal error in processGameEvents:', error);
    }
}

async function processEvent(event: GameEvent, env: Env, redis: any): Promise<void> {
    const { type, gameId } = event;
    const stub = env.GAME_ROOM.get(env.GAME_ROOM.idFromName(gameId));

    switch (type) {
        case 'countdown_tick':
            const { countdown } = event;
            if (countdown === undefined) return;

            // Tell DO to broadcast countdown
            await stub.fetch('/internal/countdown-tick', {
                method: 'POST',
                body: JSON.stringify({ countdown }),
            });

            if (countdown > 1) {
                // Schedule next tick in 1 second
                await scheduleEvent(redis, {
                    type: 'countdown_tick',
                    gameId,
                    countdown: countdown - 1,
                }, 1000);
            } else {
                // Countdown done, start game
                await scheduleEvent(redis, {
                    type: 'start_game',
                    gameId,
                }, 0);
            }
            break;

        case 'start_game':
            await stub.fetch('/internal/start-game');

            // Schedule first number call in 4 seconds
            await scheduleEvent(redis, {
                type: 'call_number',
                gameId,
                numberIndex: 0,
            }, 4000);
            break;

        case 'call_number':
            const { numberIndex } = event;
            if (numberIndex === undefined) return;

            const response = await stub.fetch('/internal/call-number', {
                method: 'POST',
                body: JSON.stringify({ numberIndex }),
            });

            const result = await response.json() as { hasWinner: boolean; maxNumbers: number };

            if (!result.hasWinner && numberIndex < result.maxNumbers - 1) {
                // Schedule next number in 4 seconds
                await scheduleEvent(redis, {
                    type: 'call_number',
                    gameId,
                    numberIndex: numberIndex + 1,
                }, 4000);
            }
            break;

        case 'reset_game':
            await stub.fetch('/internal/reset-game');

            // Start new countdown
            await scheduleEvent(redis, {
                type: 'countdown_tick',
                gameId,
                countdown: 30,
            }, 0);
            break;
    }
}
