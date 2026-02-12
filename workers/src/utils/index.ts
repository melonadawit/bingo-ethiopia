import { createClient } from '@supabase/supabase-js';
import { Env } from '../types';

export const corsHeaders = () => ({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-admin-token, x-telegram-init-data, Bypass-Tunnel-Reminder',
});

export const jsonResponse = (data: any, status = 200) => {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            ...corsHeaders(),
            'Content-Type': 'application/json',
        },
    });
};

export const getSupabase = (env: Env) => {
    if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_KEY) {
        throw new Error("Supabase credentials missing in worker environment");
    }
    return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY);
};
