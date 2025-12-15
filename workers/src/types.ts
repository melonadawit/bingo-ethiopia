// Types for Cloudflare Workers environment
export interface Env {
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
    SUPABASE_SERVICE_KEY: string;
    BOT_TOKEN: string;
    GAME_ROOM: DurableObjectNamespace;
}

export interface GameMode {
    id: string;
    title: string;
    description: string;
    min_bet: number;
    max_players: number;
    pattern_type: string;
    color: string;
    is_active: boolean;
}

export interface User {
    id: string;
    telegram_id: number;
    username: string;
    balance: number;
    total_games_played: number;
    total_wins: number;
}

export interface Game {
    id: string;
    mode: string;
    status: 'waiting' | 'active' | 'ended';
    entry_fee: number;
    prize_pool: number;
    max_players: number;
    created_at: string;
}
