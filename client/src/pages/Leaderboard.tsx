import { useState, useEffect } from 'react';
import { Trophy, Medal, TrendingUp, Clock, Gift } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';

type Period = 'daily' | 'weekly' | 'monthly' | 'alltime';

interface Player {
    rank: number;
    userId: string;
    username: string;
    avatar?: string;
    wins: number;
    earnings: number;
    gamesPlayed: number;
    winRate: number;
    badge?: string;
}

interface LeaderboardData {
    period: Period;
    players: Player[];
    prizePool: number;
    resetsIn?: string;
    totalPlayers: number;
}

export default function Leaderboard() {
    const [period, setPeriod] = useState<Period>('daily');
    const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLeaderboard();
    }, [period]);

    const fetchLeaderboard = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/api/leaderboard/${period}`);
            setLeaderboard(res.data);
        } catch (error) {
            console.error('Failed to fetch leaderboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const getBadgeIcon = (rank: number) => {
        if (rank === 1) return '🥇';
        if (rank === 2) return '🥈';
        if (rank === 3) return '🥉';
        return `#${rank}`;
    };

    const getRankColor = (rank: number) => {
        if (rank === 1) return 'from-yellow-400 to-orange-500';
        if (rank === 2) return 'from-gray-300 to-gray-400';
        if (rank === 3) return 'from-amber-600 to-amber-700';
        return 'from-slate-700 to-slate-800';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <Trophy className="w-16 h-16 mx-auto text-yellow-400 mb-4" />
                    <h1 className="text-4xl font-black text-white mb-2">Leaderboards</h1>
                    <p className="text-gray-300">Compete for glory and prizes!</p>
                </div>

                {/* Period Tabs */}
                <div className="flex gap-2 mb-6 overflow-x-auto">
                    {(['daily', 'weekly', 'monthly', 'alltime'] as Period[]).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all ${period === p
                                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg scale-105'
                                    : 'bg-slate-800 text-gray-400 hover:bg-slate-700'
                                }`}
                        >
                            {p.charAt(0).toUpperCase() + p.slice(1)}
                        </button>
                    ))}
                </div>

                {/* Prize Pool & Reset Info */}
                {leaderboard && period !== 'alltime' && (
                    <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 mb-6 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <Gift className="w-5 h-5 text-yellow-400" />
                            <span className="text-white font-bold">Prize Pool: {leaderboard.prizePool} Birr</span>
                        </div>
                        {leaderboard.resetsIn && (
                            <div className="flex items-center gap-2 text-gray-400">
                                <Clock className="w-4 h-4" />
                                <span className="text-sm">Resets in {leaderboard.resetsIn}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Leaderboard List */}
                {loading ? (
                    <div className="text-center text-white py-12">
                        <div className="animate-spin w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                        <p>Loading leaderboard...</p>
                    </div>
                ) : leaderboard && leaderboard.players.length > 0 ? (
                    <div className="space-y-3">
                        {leaderboard.players.map((player, index) => (
                            <motion.div
                                key={player.userId}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={`bg-gradient-to-r ${getRankColor(player.rank)} rounded-xl p-4 flex items-center gap-4 shadow-lg`}
                            >
                                {/* Rank Badge */}
                                <div className="text-3xl font-black w-16 text-center">
                                    {getBadgeIcon(player.rank)}
                                </div>

                                {/* Player Info */}
                                <div className="flex-1">
                                    <h3 className="text-white font-bold text-lg">{player.username}</h3>
                                    <div className="flex gap-4 text-sm">
                                        <span className="text-white/80">
                                            <TrendingUp className="w-4 h-4 inline mr-1" />
                                            {player.wins} wins
                                        </span>
                                        <span className="text-white/80">
                                            <Medal className="w-4 h-4 inline mr-1" />
                                            {player.winRate.toFixed(1)}% win rate
                                        </span>
                                    </div>
                                </div>

                                {/* Earnings */}
                                <div className="text-right">
                                    <div className="text-2xl font-black text-white">{player.earnings}</div>
                                    <div className="text-sm text-white/60">Birr</div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-gray-400 py-12">
                        <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p>No players yet. Be the first!</p>
                    </div>
                )}

                {/* Total Players */}
                {leaderboard && (
                    <div className="text-center text-gray-400 mt-6">
                        Total Players: {leaderboard.totalPlayers}
                    </div>
                )}
            </div>
        </div>
    );
}
