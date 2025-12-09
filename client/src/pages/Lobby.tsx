import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Users, Clock, Trophy, PlayCircle, Zap } from 'lucide-react';
import { motion } from 'framer-motion';
import { gameService, type GameMode, type GlobalStats } from '../services/game';

const iconMap: Record<string, any> = {
    'Zap': Zap,
    'PlayCircle': PlayCircle,
    'Trophy': Trophy
};

export default function Lobby() {
    const navigate = useNavigate();
    const [gameModes, setGameModes] = useState<GameMode[]>([]);
    const [stats, setStats] = useState<GlobalStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [modesData, statsData] = await Promise.all([
                    gameService.getGameModes(),
                    gameService.getGlobalStats()
                ]);
                setGameModes(modesData);
                setStats(statsData);
            } catch (err) {
                console.error("Failed to fetch lobby data:", err);
                setError('Failed to load game data. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return <div className="text-white text-center mt-20">Loading Lobby...</div>;
    }

    if (error) {
        return <div className="text-red-400 text-center mt-20">{error}</div>;
    }

    return (
        <div className="space-y-8">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card variant="glass" className="flex items-center justify-between p-6">
                    <div>
                        <p className="text-slate-400 text-sm font-medium">Total Players Online</p>
                        <h3 className="text-3xl font-black text-white mt-1">
                            {stats?.onlinePlayers?.toLocaleString() || '-'}
                        </h3>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                        <Users size={24} />
                    </div>
                </Card>
                <Card variant="glass" className="flex items-center justify-between p-6">
                    <div>
                        <p className="text-slate-400 text-sm font-medium">Global Derash (Pool)</p>
                        <h3 className="text-3xl font-black text-emerald-400 mt-1">
                            ETB {stats?.jackpotPool?.toLocaleString() || '-'}
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
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${stats?.isSystemLive ? 'bg-green-400' : 'bg-red-400'} opacity-75`}></span>
                                <span className={`relative inline-flex rounded-full h-3 w-3 ${stats?.isSystemLive ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            </span>
                            <span className={`font-bold ${stats?.isSystemLive ? 'text-green-400' : 'text-red-400'}`}>
                                {stats?.isSystemLive ? 'Live' : 'Offline'}
                            </span>
                        </div>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center text-green-400">
                        <Clock size={24} />
                    </div>
                </Card>
            </div>

            {/* Game Modes */}
            <div>
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                    <span className="w-2 h-8 bg-indigo-500 rounded-full" />
                    Select Game Mode
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
                                <Card variant="interactive" className="group h-full flex flex-col relative overflow-hidden">
                                    <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${mode.color} opacity-10 blur-2xl group-hover:opacity-20 transition-opacity`} />

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
                                            className="w-full"
                                            onClick={() => navigate(`/game/${mode.id}`)}
                                        >
                                            Join Room
                                        </Button>
                                    </div>
                                </Card>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
