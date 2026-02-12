import { supabase } from './supabase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://bingo-api-worker.melonadawit71.workers.dev';

export async function fetchAdmin(path: string, options: RequestInit = {}) {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
        throw new Error('Unauthorized');
    }

    const token = session.access_token;

    const headers = {
        'Content-Type': 'application/json',
        'x-admin-token': token,
        ...options.headers,
    };

    const response = await fetch(`${API_URL}/admin${path}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `Request failed with status ${response.status}`);
    }

    return response.json();
}

export interface OverviewStats {
    totalUsers: number;
    totalGames: number;
    totalRevenue?: number; // Optional until implemented
}

export interface LiveGame {
    id: string; // UUID from DB
    game_id: string; // The confusing "room name" if different, or same as ID
    mode: string;
    status: 'waiting' | 'active' | 'ended';
    player_count: number;
    started_at?: string;
}
