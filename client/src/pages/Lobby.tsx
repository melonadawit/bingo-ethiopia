import { useNavigate } from 'react-router-dom';
import { Users, Trophy, PlayCircle, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';

const iconMap: Record<string, any> = {
    'Zap': Zap,
    'PlayCircle': PlayCircle,
    'Trophy': Trophy
};

// Fallback mode definitions - ALWAYS show these 3 modes
const defaultModes = [
    {
        id: 'ande-zig',
        title: 'Ande Zig (አንድ ዝግ)',
        description: 'Complete 1 Line or 4 Corners',
        minBet: 10,
        activePlayers: 0,
        icon: 'Zap',
        color: 'from-blue-500 to-cyan-500'
    },
    {
        id: 'hulet-zig',
        title: 'Hulet Zig (ሁለት ዝግ)',
        description: 'Complete 2 Lines',
        minBet: 20,
        activePlayers: 0,
        icon: 'PlayCircle',
        color: 'from-purple-500 to-pink-500'
    },
    {
        id: 'mulu-zig',
        title: 'Mulu Zig (ሙሉ ዝግ)',
        description: 'Blackout: Mark All 25 Cells',
        minBet: 50,
        activePlayers: 0,
        icon: 'Trophy',
        color: 'from-amber-500 to-orange-500'
    }
];

export default function Lobby() {
    const navigate = useNavigate();
    const [gameModes, setGameModes] = useState<any[]>(defaultModes);

    // Fetch real data from API
    useEffect(() => {
        const fetchData = async () => {
            try {
                const modesResponse = await api.get('/api/game/modes');
                if (modesResponse.data && modesResponse.data.length > 0) {
                    setGameModes(modesResponse.data);
                }
            } catch (error) {
                console.error('Error fetching game data:', error);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 10000);
        return () => clearInterval(interval);
    }, []);

    const { data: activeTournaments } = useQuery({
        queryKey: ['tournaments', 'featured'],
        queryFn: async () => {
            const res = await api.get('/tournaments/active');
            return (res.data.tournaments || []).filter((t: any) => t.is_active);
        },
        refetchInterval: 30000
    });

    const { data: activeEvents } = useQuery({
        queryKey: ['events', 'featured'],
        queryFn: async () => {
            const res = await api.get('/events/active');
            return (res.data.events || []).filter((e: any) => e.is_active);
        },
        refetchInterval: 30000
    });

    const hasFeatured = (activeTournaments && activeTournaments.length > 0) || (activeEvents && activeEvents.length > 0);

    return (
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0B1120] to-black text-white overflow-x-hidden relative">
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

                {/* Featured Highlights */}
                {hasFeatured && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mb-12"
                    >
                        <div className="flex items-center gap-2 mb-4 px-2">
                            <Zap className="text-yellow-400 fill-yellow-400" size={20} />
                            <h2 className="text-lg font-bold text-white uppercase tracking-wider">Live Highlights</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Tournaments Banner */}
                            {(activeTournaments || []).slice(0, 1).map((t: any) => (
                                <div
                                    key={t.id}
                                    onClick={() => navigate('/tournaments')}
                                    className="relative overflow-hidden bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl p-6 cursor-pointer hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] transition-all group"
                                >
                                    <div className="relative z-10">
                                        <div className="text-xs font-bold text-indigo-200 mb-1 uppercase tracking-tighter">Active Tournament</div>
                                        <h3 className="text-2xl font-black text-white mb-2">{t.name}</h3>
                                        <div className="flex items-center gap-4">
                                            <div className="text-yellow-300 font-bold">{t.prize_pool} Birr Pool</div>
                                            <div className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold font-mono tracking-tighter">JOIN NOW</div>
                                        </div>
                                    </div>
                                    <Trophy className="absolute right-[-10px] bottom-[-10px] w-32 h-32 text-white/10 rotate-12 group-hover:rotate-6 transition-transform" />
                                </div>
                            ))}

                            {/* Events Banner */}
                            {(activeEvents || []).slice(0, 1).map((e: any) => (
                                <div
                                    key={e.id}
                                    onClick={() => navigate('/events')}
                                    className="relative overflow-hidden bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl p-6 cursor-pointer hover:shadow-[0_0_30px_rgba(249,115,22,0.4)] transition-all group text-right"
                                >
                                    <div className="relative z-10">
                                        <div className="text-xs font-bold text-orange-200 mb-1 uppercase tracking-tighter">Special Event Live</div>
                                        <h3 className="text-2xl font-black text-white mb-2">{e.name}</h3>
                                        <div className="flex items-center gap-4 justify-end">
                                            <div className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold font-mono tracking-tighter">PLAY & WIN</div>
                                            <div className="text-yellow-300 font-bold">{e.multiplier}x Multiplier</div>
                                        </div>
                                    </div>
                                    <Zap className="absolute left-[-10px] bottom-[-10px] w-32 h-32 text-white/10 -rotate-12 group-hover:-rotate-6 transition-transform" />
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Game Modes titles */}
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
                                    className="group h-full flex flex-col relative overflow-hidden bg-white/[0.03] backdrop-blur-md border border-white/10 rounded-2xl p-3.5 cursor-pointer hover:bg-white/[0.07] hover:border-indigo-500/50 hover:shadow-[0_0_40px_-10px_rgba(99,102,241,0.3)] transition-all duration-500 hover:-translate-y-1"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        try {
                                            const gameId = `${mode.id}-global-v55`;
                                            navigate(`/game/${gameId}?mode=${mode.id}`);
                                        } catch (error) {
                                            console.error('Error joining game:', error);
                                            toast.error('Failed to join game. Please try again.');
                                        }
                                    }}
                                >
                                    {/* Glowing Background Blob */}
                                    <div className={`absolute -top-20 -right-20 w-64 h-64 bg-gradient-to-br ${mode.color} opacity-0 group-hover:opacity-20 blur-3xl transition-opacity duration-700`} />
                                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 pointer-events-none" />

                                    <div className="relative z-10 flex flex-col h-full">
                                        <div className="flex items-start justify-between mb-2">
                                            <div className={`p-2 rounded-xl bg-gradient-to-br ${mode.color} text-white shadow-lg ring-1 ring-white/20 group-hover:scale-110 transition-transform duration-500`}>
                                                <IconComponent size={20} />
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
                                            <div className="h-0.5 w-full bg-gradient-to-r from-white/10 to-transparent my-2 group-hover:from-indigo-500/50 transition-colors duration-500" />
                                        </div>

                                        <p className="text-slate-400 text-sm leading-relaxed font-medium">{mode.description}</p>

                                        <div className="mt-2 flex items-center text-[10px] font-semibold text-slate-500 group-hover:text-indigo-400 transition-colors">
                                            <span>Click to join room</span>
                                            <span className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1 group-hover:translate-x-0 duration-300">→</span>
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
