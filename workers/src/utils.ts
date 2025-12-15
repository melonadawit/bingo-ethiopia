import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '../types';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(env: Env): SupabaseClient {
    if (!supabaseInstance) {
        supabaseInstance = createClient(
            env.SUPABASE_URL,
            env.SUPABASE_SERVICE_KEY
        );
    }
    return supabaseInstance;
}

export function corsHeaders(origin: string = '*') {
    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, Bypass-Tunnel-Reminder',
        'Access-Control-Max-Age': '86400',
    };
}

export function jsonResponse(data: any, status: number = 200, headers: Record<string, string> = {}) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            ...corsHeaders(),
            ...headers,
        },
    });
}
