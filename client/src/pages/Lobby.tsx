import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';

import { Users, Clock, Trophy, PlayCircle, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

// Mock data - aligned with backend
const mockGameModes = [
    {
        id: 'and-zig',
        title: 'And-zig (አንድ ዝግ)',
        description: 'Complete 1 Line or 4 Corners',
        minBet: 10,
        maxBet: 100,
        activePlayers: 142,
        icon: 'Zap',
        color: 'from-blue-500 to-cyan-500'
    },
    {
        id: 'hulet-zig',
        title: 'Hulet-zig (ሁለት ዝግ)',
        description: 'Complete 2 Lines',
        minBet: 20,
        maxBet: 50,
        activePlayers: 89,
        icon: 'PlayCircle',
        color: 'from-purple-500 to-pink-500'
    },
    {
        id: 'mulu-zig',
        title: 'Mulu-zig (ሙሉ ዝግ)',
        description: 'Blackout: Mark All 25 Cells',
        minBet: 50,
        maxBet: 200,
        activePlayers: 215,
        icon: 'Trophy',
        color: 'from-amber-500 to-orange-500'
    }
];

const mockStats = {
    activePlayers: 446,
    totalPrizePool: 45200,
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
        <div className="min-h-screen">
            <div className="w-full">
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
                                <div
                                    className="group h-full flex flex-col relative overflow-hidden bg-slate-800/50 border border-slate-700 rounded-2xl p-6 cursor-pointer hover:border-indigo-500/50 hover:bg-slate-800/80 transition-all shadow-lg hover:shadow-indigo-500/10"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        console.log('Join Room clicked!', mode.id);
                                        navigate(`/game/${mode.id}?mode=${mode.id}`);
                                    }}
                                >
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

                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors">{mode.title}</h3>
                                            <span className="text-emerald-400 font-bold bg-emerald-400/10 px-2 py-0.5 rounded text-sm whitespace-nowrap">
                                                {mode.minBet} Birr
                                            </span>
                                        </div>

                                        <p className="text-slate-400 text-sm">{mode.description}</p>
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
