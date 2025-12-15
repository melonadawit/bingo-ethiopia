import api from './api';

export interface GameMode {
    id: string;
    title: string;
    description: string;
    minBet: number;
    activePlayers: number;
    color: string;
    icon?: string; // We might handle icons differently on frontend, e.g. mapping string IDs to Lucide icons
}

export interface GlobalStats {
    totalPlayers: number;
    onlinePlayers: number;
    jackpotPool: number;
    isSystemLive: boolean; // For system status check
}

export const gameService = {
    getGameModes: async (): Promise<GameMode[]> => {
        const response = await api.get('/api/game/modes');
        return response.data;
    },

    getGlobalStats: async (): Promise<GlobalStats> => {
        const response = await api.get('/api/game/stats');
        return response.data;
    }
};
