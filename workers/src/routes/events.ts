// Events routes for Cloudflare Workers
import type { Env } from '../types';
import { getSupabase } from '../utils';
import { jsonResponse } from '../utils';

export async function handleEventRoutes(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const supabase = getSupabase(env);

    // GET /events/active
    if (url.pathname === '/events/active' && request.method === 'GET') {
        const { data, error } = await supabase.rpc('get_public_events');

        if (error) {
            return jsonResponse({ error: error.message }, 500);
        }

        const events = (data || []).map((e: any) => ({
            ...e,
            name: e.title, // Standardized mapping for client
            is_active: e.is_strictly_active
        }));

        return jsonResponse({ events });
    }

    // POST /events/join
    if (url.pathname === '/events/join' && request.method === 'POST') {
        const { eventId, userId } = await request.json() as { eventId: string, userId: string };

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

        // Check event exists and is strictly active
        const { data: event } = await supabase.rpc('get_public_events');
        const targetEvent = (event || []).find((e: any) => e.id === eventId);

        if (!targetEvent) {
            return jsonResponse({ error: 'Event not found or not joinable' }, 404);
        }

        // STRICT TIME CHECK using server flag
        if (targetEvent.is_strictly_active === false) {
            return jsonResponse({ error: 'Event is not joinable at this time' }, 403);
        }

        // BACKUP: Manual time check if flag is missing or null
        if (targetEvent.is_strictly_active === undefined || targetEvent.is_strictly_active === null) {
            const now = new Date();
            const startsAt = new Date(targetEvent.start_time);
            const endsAt = new Date(targetEvent.end_time);
            if (targetEvent.status !== 'active' || now < startsAt || now > endsAt) {
                return jsonResponse({ error: 'Event is not joinable (manual check)' }, 403);
            }
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
        const { data: events } = await supabase.rpc('get_public_events');
        let totalMultiplier = 1.0;
        const activeEvents = (events || []).filter((e: any) => e.is_strictly_active);

        if (activeEvents.length > 0) {
            // Multiply all active event multipliers
            totalMultiplier = activeEvents.reduce((acc: number, event: any) =>
                acc * parseFloat(event.multiplier), 1.0
            );
        }

        return jsonResponse({
            multiplier: totalMultiplier,
            events: activeEvents,
            hasActiveEvents: activeEvents.length > 0
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

    // PATCH /events/:id
    if (eventMatch && request.method === 'PATCH') {
        const eventId = eventMatch[1];
        const body = await request.json() as any;

        const { data, error } = await supabase
            .from('special_events')
            .update({
                status: body.status,
                end_time: body.end_time,
                updated_at: new Date().toISOString()
            })
            .eq('id', eventId)
            .select()
            .single();

        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ success: true, event: data });
    }

    // DELETE /events/:id
    if (eventMatch && request.method === 'DELETE') {
        const eventId = eventMatch[1];
        const { error } = await supabase
            .from('special_events')
            .delete()
            .eq('id', eventId);

        if (error) return jsonResponse({ error: error.message }, 500);
        return jsonResponse({ success: true });
    }

    return jsonResponse({ error: 'Not found' }, 404);
}
