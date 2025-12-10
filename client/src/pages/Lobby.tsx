import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Users, Clock, Trophy, PlayCircle, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

// Mock data - no backend needed
const mockGameModes = [
    {
        id: 'classic-bingo',
        title: 'Classic Bingo',
        description: 'Traditional 75-ball bingo with standard patterns',
        minBet: 10,
        maxBet: 100,
        activePlayers: 24,
        icon: 'PlayCircle',
        color: 'from-blue-500 to-cyan-500'
    },
    {
        id: 'speed-bingo',
        title: 'Speed Bingo',
        description: 'Fast-paced 30-ball bingo for quick wins',
        minBet: 5,
        maxBet: 50,
        activePlayers: 18,
        icon: 'Zap',
        color: 'from-yellow-500 to-orange-500'
    },
    {
        id: 'jackpot-bingo',
        title: 'Jackpot Bingo',
        description: 'Progressive jackpot with massive prizes',
        minBet: 20,
        maxBet: 200,
        activePlayers: 42,
        icon: 'Trophy',
        color: 'from-purple-500 to-pink-500'
    }
];

const mockStats = {
    activePlayers: 84,
    totalPrizePool: 12500,
    isSystemLive: true
};

const iconMap: Record<string, any> = {
    'Zap': Zap,
    'PlayCircle': PlayCircle,
    'Trophy': Trophy
};

export default function Lobby() {
    const navigate = useNavigate();
    const gameModes = mockGameModes;
    const stats = mockStats;

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-black text-white mb-2 bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                        Game Lobby
                    </h1>
                    <p className="text-slate-400">Choose your game mode and start playing!</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <Card variant="glass" className="flex items-center justify-between p-6">
                        <div>
                            <p className="text-slate-400 text-sm font-medium">Active Players</p>
                            <h3 className="text-3xl font-bold text-white mt-2">
                                {stats.activePlayers}
                            </h3>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                            <Users size={24} />
                        </div>
                    </Card>
                    <Card variant="glass" className="flex items-center justify-between p-6">
                        <div>
                            <p className="text-slate-400 text-sm font-medium">Total Prize Pool</p>
                            <h3 className="text-3xl font-bold text-white mt-2">
                                {stats.totalPrizePool}
                            </h3>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                            <span className="font-bold text-lg">Birr</span>
                        </div>
                    </Card>
                    <Card variant="glass" className="flex items-center justify-between p-6">
                        <div>
                            <p className="text-slate-400 text-sm font-medium">System Status</p>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="relative flex h-3 w-3">
                                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${stats.isSystemLive ? 'bg-green-400' : 'bg-red-400'} opacity-75`}></span>
                                    <span className={`relative inline-flex rounded-full h-3 w-3 ${stats.isSystemLive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                </span>
                                <span className={`font-bold ${stats.isSystemLive ? 'text-green-400' : 'text-red-400'}`}>
                                    {stats.isSystemLive ? 'Live' : 'Offline'}
                                </span>
                            </div>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                            <Clock size={24} />
                        </div>
                    </Card>
                </div>

                {/* Game Modes */}
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                    <Trophy className="text-indigo-400" size={28} />
                    Available Games
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {gameModes.map((mode, idx) => {
                        const IconComponent = mode.icon && iconMap[mode.icon] ? iconMap[mode.icon] : Trophy;
                        return (
                            <motion.div
                                key={mode.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                            >
                                <div className="group h-full flex flex-col relative overflow-hidden bg-slate-800/50 border border-slate-700 rounded-2xl p-6">
                                    <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${mode.color} opacity-10 blur-2xl group-hover:opacity-20 transition-opacity`} />

                                    <div className="relative z-10 flex flex-col h-full">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className={`p-3 rounded-xl bg-gradient-to-br ${mode.color} text-white shadow-lg`}>
                                                <IconComponent size={24} />
                                            </div>
                                            <div className="flex items-center gap-1 text-xs font-bold text-slate-400 bg-slate-900/50 px-2 py-1 rounded-full border border-slate-700">
                                                <Users size={12} />
                                                {mode.activePlayers} Playing
                                            </div>
                                        </div>

                                        <h3 className="text-xl font-bold text-white mb-1 group-hover:text-indigo-400 transition-colors">{mode.title}</h3>
                                        <p className="text-slate-400 text-sm mb-6 flex-1">{mode.description}</p>

                                        <div className="mt-auto">
                                            <div className="flex items-center justify-between mb-4 p-3 bg-slate-900/50 rounded-lg border border-slate-800">
                                                <span className="text-sm text-slate-400">Entry Bet</span>
                                                <span className="text-lg font-bold text-white">{mode.minBet} Birr</span>
                                            </div>
                                            <Button
                                                type="button"
                                                className="w-full relative z-20"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    console.log('Join Room clicked!', mode.id);
                                                    console.log('Navigating to:', `/game/${mode.id}`);
                                                    navigate(`/game/${mode.id}`);
                                                }}
                                            >
                                                Join Room
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
