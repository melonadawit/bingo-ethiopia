import { useState, useMemo } from 'react';
import { useGameHistory } from '../hooks/useGameHistory';
import { ArrowUpRight, ArrowDownRight, Filter, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';

// Helper to format currency
const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('en-ET', { style: 'currency', currency: 'ETB' }).format(amount).replace('ETB', '').trim();
};

const History = () => {
    const [filter, setFilter] = useState<'all' | 'won' | 'lost'>('all');
    const { data: userStats, isLoading } = useGameHistory();

    const games = useMemo(() => {
        if (!userStats?.recent_games) return [];
        return userStats.recent_games.map(game => ({
            id: game.game_id || game.id, // Prefer game_id if available (UUID), or row ID
            displayId: (game.game_id || game.id || '').toString().slice(0, 8).toUpperCase(),
            mode: game.game?.mode || 'Unknown',
            result: ((Number(game.winnings) || 0) > 0 ? 'won' : 'lost') as 'won' | 'lost',
            prize: Number(game.winnings) || 0,
            stake: Number((game.game as any)?.entry_fee) || 0,
            date: new Date(game.joined_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            time: new Date(game.joined_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            fullDate: new Date(game.joined_at),
            timestamp: new Date(game.joined_at).getTime(),
            card_id: game.card_id || 0,
            total_spent: Number((game.game as any)?.entry_fee) || 0
        }));
    }, [userStats]);

    const filteredGames = games.filter(game =>
        filter === 'all' ? true : game.result === filter
    );

    const stats = {
        totalWonCount: userStats?.games_won || 0,
        totalLostCount: (userStats?.games_played || 0) - (userStats?.games_won || 0),
        totalWonAmount: Number(userStats?.total_winnings) || 0,
        totalLostAmount: games.filter(g => g.result === 'lost').reduce((acc, g) => acc + g.stake, 0) // Estimate lost amount from local games list
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#110C1D] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#110C1D] text-white p-4 font-sans">
            {/* Top Tabs (REMOVED as per user request) */}

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                {/* Won Card */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-gradient-to-br from-teal-600 to-teal-800 rounded-2xl p-4 shadow-lg border-t border-teal-400/20"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <ArrowUpRight size={16} className="text-white" />
                        <span className="text-sm font-medium text-teal-100">Total Won</span>
                    </div>
                    <div className="text-3xl font-black text-white mb-1">{stats.totalWonCount}</div>
                    <div className="text-[10px] text-teal-200 font-medium">
                        {formatMoney(stats.totalWonAmount)} Birr earned
                    </div>
                </motion.div>

                {/* Lost Card */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-gradient-to-br from-rose-600 to-pink-700 rounded-2xl p-4 shadow-lg border-t border-pink-400/20"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <ArrowDownRight size={16} className="text-white" />
                        <span className="text-sm font-medium text-pink-100">Total Lost</span>
                    </div>
                    <div className="text-3xl font-black text-white mb-1">{stats.totalLostCount}</div>
                    <div className="text-[10px] text-pink-200 font-medium">
                        {formatMoney(stats.totalLostAmount)} Birr spent
                    </div>
                </motion.div>
            </div>

            {/* Filter Pills */}
            <div className="flex gap-3 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                <button
                    onClick={() => setFilter('all')}
                    className={cn(
                        "flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-colors",
                        filter === 'all'
                            ? "bg-cyan-500 text-white shadow-cyan-500/30 shadow-lg"
                            : "bg-[#2C2440] text-slate-400"
                    )}
                >
                    <Filter size={14} />
                    All ({games.length})
                </button>
                <button
                    onClick={() => setFilter('won')}
                    className={cn(
                        "px-5 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-colors",
                        filter === 'won'
                            ? "bg-[#333060] text-teal-400 border border-teal-500/50"
                            : "bg-[#2C2440] text-slate-400"
                    )}
                >
                    Won ({games.filter(g => g.result === 'won').length})
                </button>
                <button
                    onClick={() => setFilter('lost')}
                    className={cn(
                        "px-5 py-2.5 rounded-xl font-bold text-sm whitespace-nowrap transition-colors",
                        filter === 'lost'
                            ? "bg-[#333060] text-pink-400 border border-pink-500/50"
                            : "bg-[#2C2440] text-slate-400"
                    )}
                >
                    Lost ({games.filter(g => g.result === 'lost').length})
                </button>
            </div>

            {/* Game List */}
            <div className="space-y-4">
                {filteredGames.map((game, index) => (
                    <motion.div
                        key={`${game.id}-${index}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-[#1E192D] rounded-2xl p-4 border border-white/5 shadow-xl relative overflow-hidden"
                    >
                        {/* Decorative background glow */}
                        <div className={cn(
                            "absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] opacity-10 pointer-events-none",
                            game.result === 'won' ? "bg-teal-500" : "bg-pink-500"
                        )} />

                        {/* Header */}
                        <div className="flex justify-between items-start mb-4 relative z-10">
                            <div className="flex items-start gap-3">
                                <div className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center",
                                    game.result === 'won' ? "bg-teal-500/20 text-teal-400" : "bg-pink-500/20 text-pink-400"
                                )}>
                                    {game.result === 'won' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-base">Game {game.displayId}</h3>
                                    <div className="flex items-center gap-1.5 text-slate-400 text-xs mt-0.5">
                                        <Calendar size={10} />
                                        <span>{game.date}, {game.time}</span>
                                        <span className="text-white/40">•</span>
                                        <span>Card #{game.card_id}</span>
                                        <span className="text-white/40">•</span>
                                        <span>{formatMoney(game.total_spent)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className={cn(
                                "px-3 py-1 rounded-lg text-xs font-bold",
                                game.result === 'won'
                                    ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                                    : "bg-pink-500/10 text-pink-400 border border-pink-500/20"
                            )}>
                                {game.result === 'won' ? 'Won' : 'Lost'}
                            </div>
                        </div>

                        {/* Grid Stats */}
                        <div className="grid grid-cols-3 gap-2 relative z-10">
                            <div className="bg-[#262038] rounded-xl p-2.5 flex flex-col items-center justify-center">
                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Stake</span>
                                <span className="text-white font-bold">{game.stake}</span>
                            </div>
                            <div className="bg-[#262038] rounded-xl p-2.5 flex flex-col items-center justify-center">
                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Prize</span>
                                <span className={cn(
                                    "font-bold",
                                    game.result === 'won' ? "text-teal-400" : "text-white"
                                )}>{game.prize}</span>
                            </div>
                            <div className="bg-[#262038] rounded-xl p-2.5 flex flex-col items-center justify-center">
                                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Mode</span>
                                <span className="text-white font-bold text-xs capitalize">{game.mode.replace('-', ' ')}</span>
                            </div>
                        </div>
                    </motion.div>
                ))}

                {filteredGames.length === 0 && (
                    <div className="text-center py-20 opacity-50">
                        <p className="mb-2">No games found yet.</p>
                        <p className="text-sm">Play a game to start tracking your history!</p>
                    </div>
                )}
            </div>


        </div>
    );
};

export default History;
