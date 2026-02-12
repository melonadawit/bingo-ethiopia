import { useState } from 'react';
import { Medal, Crown, Flame } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';


type Period = 'daily' | 'weekly' | 'monthly' | 'yearly';


interface LeaderboardEntry {
    rank: number;
    total_winnings: number;
    total_spent: number;
    wins: number;
    games_played: number;
    user: {
        username: string;
        first_name: string;
        telegram_id: number;
    };
}

export default function Leaderboard() {
    const [period, setPeriod] = useState<Period>('weekly');


    const { data: leaderboardData, isLoading } = useQuery({
        queryKey: ['leaderboard', period],
        queryFn: async () => {
            const res = await api.get(`/api/stats/leaderboard?period=${period}&limit=50`);
            let data = res.data.leaderboard || [];
            data.sort((a: any, b: any) => b.games_played - a.games_played);
            return data.map((item: any, idx: number) => ({ ...item, rank: idx + 1 }));
        },
    });

    const periods: { label: string; value: Period }[] = [
        { label: 'Daily', value: 'daily' },
        { label: 'Weekly', value: 'weekly' },
        { label: 'Monthly', value: 'monthly' },
        { label: 'Yearly', value: 'yearly' },
    ];



    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-2 pb-24">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-black text-white italic mb-1 tracking-tighter shadow-sm flex items-center justify-center gap-3">
                        <Flame className="text-orange-500" size={32} />
                        {period.toUpperCase()} CHAMPIONS
                    </h1>
                    <p className="text-white/40 text-xs">Ranked by total games played</p>
                </div>

                {/* Filters */}
                <div className="flex flex-col gap-4 mb-8">
                    {/* Period Selector */}
                    <div className="flex p-1 bg-black/20 backdrop-blur-md rounded-full border border-white/10 self-center">
                        {periods.map((p) => (
                            <button
                                key={p.value}
                                onClick={() => setPeriod(p.value)}
                                className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${period === p.value
                                    ? 'bg-white text-purple-900 shadow-lg'
                                    : 'text-white/60 hover:text-white'
                                    }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>


                </div>

                {/* Top 3 Podiums */}
                {!isLoading && leaderboardData?.length >= 3 && (
                    <div className="grid grid-cols-3 gap-2 items-end mb-12 h-64 px-4">
                        <PodiumItem entry={leaderboardData[1]} rank={2} color="text-gray-300" />
                        <PodiumItem entry={leaderboardData[0]} rank={1} color="text-yellow-400" />
                        <PodiumItem entry={leaderboardData[2]} rank={3} color="text-orange-400" />
                    </div>
                )}

                {/* List View */}
                <div className="bg-black/20 backdrop-blur-xl rounded-3xl overflow-hidden border border-white/10">
                    {isLoading ? (
                        <div className="p-20 text-center">
                            <div className="animate-spin w-12 h-12 border-4 border-white/20 border-t-white rounded-full mx-auto" />
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {leaderboardData?.map((entry: LeaderboardEntry) => (
                                <div className="p-2.5 flex items-center justify-between hover:bg-white/5 transition-colors group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 text-center font-black text-white/40 group-hover:text-white/80">
                                            #{entry.rank}
                                        </div>
                                        <div>
                                            <div className="text-white font-bold text-base">
                                                {entry.user?.username ? `@${entry.user.username}` : entry.user?.first_name || 'Anonymous'}
                                            </div>
                                            <div className="text-white/40 text-[10px] flex items-center gap-2">
                                                <Flame size={12} className="text-orange-500" />
                                                {entry.wins} wins • {entry.games_played} games
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-black text-white tracking-tight">
                                            {entry.games_played} Games
                                        </div>
                                        <div className="text-[10px] text-white/40 uppercase tracking-widest">
                                            Played
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function PodiumItem({ entry, rank, color }: { entry: LeaderboardEntry; rank: number; color: string }) {
    const heights = { 1: 'h-32', 2: 'h-24', 3: 'h-20' };
    const icons = { 1: Crown, 2: Medal, 3: Medal };
    const Icon = icons[rank as keyof typeof icons];

    return (
        <div className="flex flex-col items-center">
            <div className={`relative mb-2 ${rank === 1 ? 'scale-110' : ''}`}>
                <div className={`p-0.5 rounded-full border-2 ${color} bg-black/40`}>
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center text-xl">
                        {entry?.user?.first_name?.[0] || '?'}
                    </div>
                </div>
                <div className={`absolute -top-6 left-1/2 -translate-x-1/2 ${color}`}>
                    <Icon size={24} />
                </div>
            </div>
            <div className="text-white font-bold text-xs truncate w-full text-center">
                {entry?.user?.username ? `@${entry.user.username}` : entry?.user?.first_name || 'Anonymous'}
            </div>
            <div className={`w-full ${heights[rank as keyof typeof heights]} mt-2 rounded-t-2xl bg-gradient-to-b from-white/20 to-transparent flex flex-col items-center pt-4 border-x border-t border-white/10`}>
                <div className="text-lg font-black text-white leading-none">
                    {entry?.games_played || 0}
                </div>
                <div className="text-[10px] text-white/60 font-bold uppercase tracking-tight mt-1">
                    Games
                </div>
                <div className={`mt-auto mb-1 text-xl font-black italic ${color}`}>#{rank}</div>
            </div>
        </div>
    );
}
