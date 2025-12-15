import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Users, Clock, Trophy, PlayCircle, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import api from '../services/api';

const iconMap: Record<string, any> = {
    'Zap': Zap,
    'PlayCircle': PlayCircle,
    'Trophy': Trophy
};

// Fallback mode definitions - ALWAYS show these 3 modes
const defaultModes = [
    {
        id: 'and-zig',
        title: 'Ande Zig (አንድ ዝግ)',
        description: 'Complete 1 Line or 4 Corners',
        minBet: 50,
        activePlayers: 0,
        icon: 'Zap',
        color: 'from-blue-500 to-cyan-500'
    },
    {
        id: 'hulet-zig',
        title: 'Hulet Zig (ሁለት ዝግ)',
        description: 'Complete 2 Lines',
        minBet: 100,
        activePlayers: 0,
        icon: 'PlayCircle',
        color: 'from-purple-500 to-pink-500'
    },
    {
        id: 'mulu-zig',
        title: 'Mulu Zig (ሙሉ ዝግ)',
        description: 'Blackout: Mark All 25 Cells',
        minBet: 150,
        activePlayers: 0,
        icon: 'Trophy',
        color: 'from-amber-500 to-orange-500'
    }
];

export default function Lobby() {
    const navigate = useNavigate();
    const [gameModes, setGameModes] = useState<any[]>(defaultModes); // Start with default modes
    const [stats, setStats] = useState<any>({ activePlayers: 0, totalPrizePool: 0, isSystemLive: true });

    // Fetch real data from API
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch game modes with real player counts
                const modesResponse = await api.get('/api/game/modes');
                // If API returns data, use it; otherwise keep default modes
                if (modesResponse.data && modesResponse.data.length > 0) {
                    setGameModes(modesResponse.data);
                }

                // Fetch global stats
                const statsResponse = await api.get('/api/game/stats');
                setStats(statsResponse.data);
            } catch (error) {
                console.error('Error fetching game data:', error);
                // Keep default modes on error - don't change gameModes
            }
        };

        fetchData();

        // Refresh data every 10 seconds for live updates
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0B1120] to-black text-white overflow-x-hidden">
            {/* Ambient Background Elements */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[120px] mix-blend-screen animate-pulse" />
                <div className="absolute bottom-[-10%] right-[20%] w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] mix-blend-screen" />
            </div>

            <div className="relative z-10 w-full max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-12 text-center relative">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <h1 className="text-6xl font-black mb-4 tracking-tight">
                            <span className="bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(234,179,8,0.3)]">
                                BINGO ETHIOPIA
                            </span>
                        </h1>
                        <p className="text-slate-400 text-lg max-w-2xl mx-auto font-light mb-6">
                            Experience the thrill of real-time bingo. Choose your game mode below.
                        </p>


                    </motion.div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <Card variant="glass" className="relative overflow-hidden group border-white/5 bg-white/5 backdrop-blur-xl hover:bg-white/10 transition-all duration-300">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                            <div className="flex items-center justify-between p-6">
                                <div>
                                    <p className="text-indigo-300 text-sm font-semibold tracking-wider uppercase">Active Players</p>
                                    <h3 className="text-4xl font-black text-white mt-1 drop-shadow-lg">
                                        {stats.activePlayers}
                                    </h3>
                                </div>
                                <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                                    <Users size={28} />
                                </div>
                            </div>
                        </Card>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                    >
                        <Card variant="glass" className="relative overflow-hidden group border-white/5 bg-white/5 backdrop-blur-xl hover:bg-white/10 transition-all duration-300">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                            <div className="flex items-center justify-between p-6">
                                <div>
                                    <p className="text-emerald-300 text-sm font-semibold tracking-wider uppercase">Active Players</p>
                                    <h3 className="text-4xl font-black text-white mt-1 drop-shadow-lg">
                                        {(stats.totalPlayers || 0)}
                                    </h3>
                                </div>
                                <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                                    <span className="font-bold text-xl">Br</span>
                                </div>
                            </div>
                        </Card>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                    >
                        <Card variant="glass" className="relative overflow-hidden group border-white/5 bg-white/5 backdrop-blur-xl hover:bg-white/10 transition-all duration-300">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                            <div className="flex items-center justify-between p-6">
                                <div>
                                    <p className="text-green-300 text-sm font-semibold tracking-wider uppercase">System Status</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="relative flex h-3 w-3">
                                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${stats.isSystemLive ? 'bg-green-400' : 'bg-red-400'} opacity-75`}></span>
                                            <span className={`relative inline-flex rounded-full h-3 w-3 ${stats.isSystemLive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                        </span>
                                        <span className={`text-xl font-bold ${stats.isSystemLive ? 'text-green-400' : 'text-red-400'}`}>
                                            {stats.isSystemLive ? 'Live' : 'Offline'}
                                        </span>
                                    </div>
                                </div>
                                <div className="w-14 h-14 rounded-2xl bg-green-500/20 border border-green-500/30 flex items-center justify-center text-green-400 shadow-[0_0_20px_rgba(34,197,94,0.2)]">
                                    <Clock size={28} />
                                </div>
                            </div>
                        </Card>
                    </motion.div>
                </div>

                {/* Game Modes */}
                <motion.h2
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-2xl font-bold text-white mb-8 flex items-center gap-3 pl-2"
                >
                    <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-lg">
                        <Trophy className="text-white" size={24} />
                    </div>
                    Available Game Rooms
                </motion.h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {gameModes.map((mode, idx) => {
                        const IconComponent = mode.icon && iconMap[mode.icon] ? iconMap[mode.icon] : Trophy;
                        return (
                            <motion.div
                                key={mode.id}
                                initial={{ opacity: 0, y: 40 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6 + (idx * 0.1), duration: 0.6 }}
                            >
                                <div
                                    className="group h-full flex flex-col relative overflow-hidden bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-3xl p-5 cursor-pointer hover:bg-white/[0.07] hover:border-indigo-500/50 hover:shadow-[0_0_40px_-10px_rgba(99,102,241,0.3)] transition-all duration-500 hover:-translate-y-2"
                                    onClick={async (e) => {
                                        e.preventDefault();
                                        console.log('Join Room clicked!', mode.id);

                                        try {
                                            // Create game and get UUID
                                            const response = await api.post('/game/create', { mode: mode.id });
                                            const { gameId } = response.data;
                                            console.log('Game created:', gameId);

                                            // Navigate to game with proper UUID
                                            navigate(`/game/${gameId}?mode=${mode.id}`);
                                        } catch (error) {
                                            console.error('Failed to create game:', error);
                                            alert('Failed to join game. Please try again.');
                                        }
                                    }}
                                >
                                    {/* Glowing Background Blob */}
                                    <div className={`absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br ${mode.color} opacity-0 group-hover:opacity-20 blur-3xl transition-opacity duration-700`} />
                                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 pointer-events-none" />

                                    <div className="relative z-10 flex flex-col h-full">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className={`p-3 rounded-2xl bg-gradient-to-br ${mode.color} text-white shadow-lg ring-1 ring-white/20 group-hover:scale-110 transition-transform duration-500`}>
                                                <IconComponent size={24} />
                                            </div>
                                            <div className="flex items-center gap-2 text-xs font-bold text-indigo-200 bg-indigo-500/10 px-3 py-1.5 rounded-full border border-indigo-500/20 backdrop-blur-sm">
                                                <Users size={12} className="animate-pulse" />
                                                {mode.activePlayers} Playing
                                            </div>
                                        </div>

                                        <div className="mb-2">
                                            <div className="flex justify-between items-center mb-1">
                                                <h3 className="text-xl font-black text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-indigo-300 transition-all duration-300">
                                                    {mode.title}
                                                </h3>
                                                <span className="text-emerald-400 font-black bg-emerald-500/10 px-3 py-1 rounded-lg border border-emerald-500/20 text-sm shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                                                    {mode.minBet} Br
                                                </span>
                                            </div>
                                            <div className="h-0.5 w-full bg-gradient-to-r from-white/10 to-transparent my-3 group-hover:from-indigo-500/50 transition-colors duration-500" />
                                        </div>

                                        <p className="text-slate-400 text-sm leading-relaxed font-medium">{mode.description}</p>

                                        <div className="mt-4 flex items-center text-xs font-semibold text-slate-500 group-hover:text-indigo-400 transition-colors">
                                            <span>Click to join room</span>
                                            <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 duration-300">→</span>
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
