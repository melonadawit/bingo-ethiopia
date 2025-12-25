// Events routes for Cloudflare Workers
import type { Env } from '../types';
import { getSupabase } from '../utils';
import { jsonResponse } from '../utils';

export async function handleEventRoutes(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const supabase = getSupabase(env);

    // GET /events/active
    if (url.pathname === '/events/active' && request.method === 'GET') {
        const { data, error } = await supabase.rpc('get_active_events');

        if (error) {
            return jsonResponse({ error: error.message }, 500);
        }

        return jsonResponse({ events: data || [] });
    }

    // POST /events/join
    if (url.pathname === '/events/join' && request.method === 'POST') {
        const { eventId, userId } = await request.json();

        if (!eventId || !userId) {
            return jsonResponse({ error: 'Missing eventId or userId' }, 400);
        }

        // Check if already joined
        const { data: existing } = await supabase
            .from('event_participation')
            .select('*')
            .eq('event_id', eventId)
            .eq('user_id', userId)
            .single();

        if (existing) {
            return jsonResponse({ error: 'Already joined this event' }, 400);
        }

        // Join event
        const { data, error } = await supabase
            .from('event_participation')
            .insert({
                event_id: eventId,
                user_id: userId
            })
            .select()
            .single();

        if (error) {
            return jsonResponse({ error: error.message }, 500);
        }

        return jsonResponse({ success: true, participation: data });
    }

    // GET /events/check-multiplier
    if (url.pathname === '/events/check-multiplier' && request.method === 'GET') {
        const { data: events } = await supabase.rpc('get_active_events');

        let totalMultiplier = 1.0;
        if (events && events.length > 0) {
            // Multiply all active event multipliers
            totalMultiplier = events.reduce((acc: number, event: any) =>
                acc * parseFloat(event.multiplier), 1.0
            );
        }

        return jsonResponse({
            multiplier: totalMultiplier,
            events: events || [],
            hasActiveEvents: events && events.length > 0
        });
    }

    // GET /events/:id
    const eventMatch = url.pathname.match(/^\/events\/([^\/]+)$/);
    if (eventMatch && request.method === 'GET') {
        const eventId = eventMatch[1];

        const { data, error } = await supabase
            .from('special_events')
            .select('*')
            .eq('id', eventId)
            .single();

        if (error) {
            return jsonResponse({ error: error.message }, 404);
        }

        return jsonResponse({ event: data });
    }

    return jsonResponse({ error: 'Not found' }, 404);
}
