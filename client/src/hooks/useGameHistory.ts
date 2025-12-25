import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export interface GameHistoryItem {
    id: string;
    game_id: string;
    user_id: string;
    card_id: number;
    joined_at: string;
    cards_count: number;
    total_spent: number;
    winnings: number;
    status: 'active' | 'completed';
    rank: number | null;
    game: {
        id: string;
        mode: string;
        status: string;
        start_time: string;
        end_time: string;
        prize_pool: number;
        winner_ids: string[] | null;
        created_at: string;
    };
}

export interface UserStatsResponse {
    id: string;
    telegram_id: number;
    username: string;
    first_name: string;
    games_played: number;
    games_won: number;
    total_winnings: number;
    win_rate: number;
    tournaments: {
        participated: number;
        total_prizes: number;
        best_rank: number | null;
    };
    notifications: {
        total_notifications: number;
        unread_count: number;
        last_notification_at: string | null;
    };
    recent_games: GameHistoryItem[];
}

export const useGameHistory = () => {
    const { user } = useAuth();

    return useQuery({
        queryKey: ['gameHistory', user?.telegram_id],
        queryFn: async () => {
            if (!user?.telegram_id) return null;

            const response = await api.get<UserStatsResponse>(`/api/stats/me`, {
                params: { userId: user.telegram_id }
            });
            return response.data;
        },
        enabled: !!user?.telegram_id,
        staleTime: 30000, // Cache for 30 seconds
    });
};
