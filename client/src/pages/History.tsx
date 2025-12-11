import { useState } from 'react';
import { Trophy, Clock, Users, Coins, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';

const History = () => {
    const [filter, setFilter] = useState<'all' | 'won' | 'lost'>('all');

    // Mock game history
    const games = [
        { id: 1, mode: 'Speed Bingo', result: 'won', prize: 500, players: 24, date: '2 hours ago', position: 1 },
        { id: 2, mode: 'Classic Bingo', result: 'lost', prize: 0, players: 18, date: '3 hours ago', position: 8 },
        { id: 3, mode: 'Speed Bingo', result: 'won', prize: 250, players: 30, date: '5 hours ago', position: 2 },
        { id: 4, mode: 'Mega Bingo', result: 'lost', prize: 0, players: 50, date: '1 day ago', position: 15 },
        { id: 5, mode: 'Speed Bingo', result: 'won', prize: 150, players: 20, date: '1 day ago', position: 3 },
        { id: 6, mode: 'Classic Bingo', result: 'lost', prize: 0, players: 25, date: '2 days ago', position: 12 },
    ];

    const filteredGames = games.filter(game =>
        filter === 'all' ? true : game.result === filter
    );

    const stats = {
        totalGames: games.length,
        wins: games.filter(g => g.result === 'won').length,
        totalWinnings: games.reduce((sum, g) => sum + g.prize, 0),
        winRate: Math.round((games.filter(g => g.result === 'won').length / games.length) * 100)
    };

    return (
        <div className="min-h-screen bg-[#0B1120]">
            {/* Stats Overview */}
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-gradient-to-br from-purple-900/50 to-indigo-900/50 rounded-2xl p-6 mb-6 border border-purple-500/20"
            >
                <h1 className="text-2xl font-black text-white mb-4">Game History</h1>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-black/20 rounded-xl p-3">
                        <div className="text-slate-400 text-xs mb-1">Total Games</div>
                        <div className="text-2xl font-bold text-white">{stats.totalGames}</div>
                    </div>
                    <div className="bg-black/20 rounded-xl p-3">
                        <div className="text-slate-400 text-xs mb-1">Wins</div>
                        <div className="text-2xl font-bold text-green-400">{stats.wins}</div>
                    </div>
                    <div className="bg-black/20 rounded-xl p-3">
                        <div className="text-slate-400 text-xs mb-1">Total Won</div>
                        <div className="text-2xl font-bold text-yellow-400">{stats.totalWinnings} Birr</div>
                    </div>
                    <div className="bg-black/20 rounded-xl p-3">
                        <div className="text-slate-400 text-xs mb-1">Win Rate</div>
                        <div className="text-2xl font-bold text-indigo-400">{stats.winRate}%</div>
                    </div>
                </div>
            </motion.div>

            {/* Filter Tabs */}
            <div className="flex gap-2 mb-4">
                {[
                    { key: 'all', label: 'All Games' },
                    { key: 'won', label: 'Wins' },
                    { key: 'lost', label: 'Losses' }
                ].map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setFilter(tab.key as any)}
                        className={cn(
                            "flex-1 py-2 px-4 rounded-xl font-bold text-sm transition-all",
                            filter === tab.key
                                ? "bg-indigo-600 text-white"
                                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Game List */}
            <div className="space-y-3">
                {filteredGames.map((game, index) => (
                    <motion.div
                        key={game.id}
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className={cn(
                            "bg-slate-900/50 rounded-2xl p-4 border",
                            game.result === 'won'
                                ? "border-green-500/30 bg-gradient-to-r from-green-900/10 to-transparent"
                                : "border-slate-800"
                        )}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                {game.result === 'won' ? (
                                    <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                                        <Trophy size={20} className="text-green-400" />
                                    </div>
                                ) : (
                                    <div className="w-10 h-10 bg-slate-700 rounded-full flex items-center justify-center">
                                        <Trophy size={20} className="text-slate-500" />
                                    </div>
                                )}
                                <div>
                                    <div className="text-white font-bold">{game.mode}</div>
                                    <div className="text-slate-400 text-xs flex items-center gap-1">
                                        <Clock size={12} />
                                        {game.date}
                                    </div>
                                </div>
                            </div>

                            {game.result === 'won' && (
                                <div className="text-right">
                                    <div className="text-green-400 font-black text-xl">+{game.prize}</div>
                                    <div className="text-slate-400 text-xs">Birr</div>
                                </div>
                            )}
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-2 bg-black/20 rounded-xl p-2">
                            <div className="text-center">
                                <div className="text-slate-400 text-[10px] mb-1">Position</div>
                                <div className={cn(
                                    "font-bold text-sm",
                                    game.position <= 3 ? "text-yellow-400" : "text-slate-300"
                                )}>
                                    #{game.position}
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-slate-400 text-[10px] mb-1">Players</div>
                                <div className="font-bold text-sm text-slate-300 flex items-center justify-center gap-1">
                                    <Users size={12} />
                                    {game.players}
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="text-slate-400 text-[10px] mb-1">Prize Pool</div>
                                <div className="font-bold text-sm text-slate-300 flex items-center justify-center gap-1">
                                    <Coins size={12} />
                                    {game.players * 50}
                                </div>
                            </div>
                        </div>

                        {/* View Details */}
                        <button className="w-full mt-2 py-2 text-indigo-400 hover:text-indigo-300 text-sm font-medium flex items-center justify-center gap-1 transition-colors">
                            View Details
                            <ChevronDown size={16} />
                        </button>
                    </motion.div>
                ))}
            </div>

            {filteredGames.length === 0 && (
                <div className="text-center py-12">
                    <Trophy size={48} className="text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-400">No games found</p>
                </div>
            )}
        </div>
    );
};

export default History;
