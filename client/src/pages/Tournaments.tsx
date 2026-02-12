import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Timer, Trophy, Calendar, Clock, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

interface Tournament {
    id: string;
    name: string;
    type: string;
    end_date: string;
    start_date: string;
    participant_count: number;
    prize_pool: number;
    entry_fee: number;
    description: string;
    status: string;
    is_active: boolean;
}

export default function TournamentsPage() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const { data: tournaments, isLoading } = useQuery({
        queryKey: ['tournaments', 'active'],
        queryFn: async () => {
            const res = await api.get('/tournaments/active');
            return res.data.tournaments as Tournament[];
        },
        refetchInterval: 10000 // Refresh every 10 seconds for immediate updates
    });

    const joinTournament = async (tournamentId: string) => {
        if (!user?.telegram_id) {
            toast.error('You must be logged in to join tournaments');
            return;
        }

        try {
            await api.post('/tournaments/join', { tournamentId, userId: user.telegram_id });
            toast.success('Successfully joined tournament!');
            navigate(`/game/tournament-${tournamentId}?mode=standard&type=tournament`);
        } catch (error: any) {
            if (error.response?.data?.error?.includes('Already joined')) {
                navigate(`/game/tournament-${tournamentId}?mode=standard&type=tournament`);
                return;
            }
            toast.error(error.response?.data?.error || 'Failed to join tournament');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-xl text-white animate-pulse flex items-center gap-3">
                    <Trophy className="text-yellow-500" />
                    Loading tournaments...
                </div>
            </div>
        );
    }

    const now = Date.now();
    const liveTournaments = (tournaments || []).filter(t => {
        const start = new Date(t.start_date).getTime();
        const end = new Date(t.end_date).getTime();
        return now >= start && now < end;
    });
    const upcomingTournaments = (tournaments || []).filter(t => {
        const start = new Date(t.start_date).getTime();
        return start > now;
    });

    return (
        <div className="min-h-screen bg-[#0B1120] p-6 pb-24 relative overflow-hidden">
            {/* Atmospheric Background */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] -z-10" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px] -z-10" />

            <div className="max-w-4xl mx-auto">
                <header className="mb-12 text-center">
                    <div className="inline-block p-3 bg-yellow-500/10 rounded-2xl mb-4 border border-yellow-500/20">
                        <Trophy className="text-yellow-500 w-8 h-8" />
                    </div>
                    <h1 className="text-4xl lg:text-5xl font-black text-white mb-4 tracking-tighter uppercase italic">
                        Elite Tournaments
                    </h1>
                    <p className="text-slate-400 text-lg max-w-xl mx-auto">
                        Compete with the best players in Ethiopia and win massive prize pools!
                    </p>
                </header>

                {(!tournaments || tournaments.length === 0) ? (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white/5 backdrop-blur-xl rounded-3xl p-12 text-center border border-white/10"
                    >
                        <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Calendar className="text-slate-500 w-10 h-10" />
                        </div>
                        <p className="text-white text-2xl font-black mb-2">No Active Tournaments</p>
                        <p className="text-slate-400">New competitions are being prepared. Check back shortly!</p>
                    </motion.div>
                ) : (
                    <div className="space-y-16">
                        {/* LIVE TOURNAMENTS */}
                        {liveTournaments.length > 0 && (
                            <section>
                                <div className="flex items-center justify-between mb-8 px-2">
                                    <h2 className="text-2xl font-black text-white flex items-center gap-4">
                                        <div className="relative">
                                            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                            <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping opacity-75"></div>
                                        </div>
                                        Live Now
                                    </h2>
                                    <div className="bg-green-500/10 text-green-400 text-xs font-bold px-4 py-1.5 rounded-full border border-green-500/20 uppercase tracking-widest">
                                        Joinable
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    {liveTournaments.map((tournament) => (
                                        <TournamentCard key={tournament.id} tournament={tournament} onJoin={joinTournament} onResult={() => navigate(`/leaderboard?period=weekly`)} />
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* UPCOMING TOURNAMENTS */}
                        {upcomingTournaments.length > 0 && (
                            <section>
                                <div className="flex items-center justify-between mb-8 px-2">
                                    <h2 className="text-2xl font-black text-white/50 flex items-center gap-4">
                                        <Timer className="w-6 h-6 text-indigo-400" />
                                        Coming Soon
                                    </h2>
                                    <div className="bg-indigo-500/10 text-indigo-400 text-xs font-bold px-4 py-1.5 rounded-full border border-indigo-500/20 uppercase tracking-widest">
                                        Starts Soon
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    {upcomingTournaments.map((tournament) => (
                                        <TournamentCard key={tournament.id} tournament={tournament} onJoin={joinTournament} onResult={() => navigate(`/leaderboard?period=weekly`)} />
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function TournamentCard({ tournament, onJoin, onResult }: { tournament: Tournament, onJoin: (id: string) => void, onResult: () => void }) {
    const isLive = tournament.is_active;
    const startDate = new Date(tournament.start_date);
    const endDate = new Date(tournament.end_date);
    const now = new Date();

    const isUpcoming = !isLive && startDate > now;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`relative overflow-hidden bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10 transition-all duration-300 group ${!isLive ? 'opacity-80 grayscale-[0.3]' : 'hover:bg-white/10 hover:border-indigo-500/30 shadow-2xl shadow-indigo-500/10'}`}
        >
            {/* Background Glow */}
            {isLive && (
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl group-hover:bg-indigo-500/30 transition-colors duration-500" />
            )}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 relative z-10">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase ${isLive ? 'bg-green-500 text-white animate-pulse' : 'bg-slate-700 text-slate-300'}`}>
                            {isLive ? 'LIVE' : (isUpcoming ? 'UPCOMING' : 'CLOSED')}
                        </span>
                        <span className="text-indigo-400 text-[10px] font-black tracking-widest uppercase flex items-center gap-1">
                            <Clock size={10} />
                            {tournament.type}
                        </span>
                    </div>
                    <h2 className="text-2xl font-black text-white group-hover:text-indigo-200 transition-colors">
                        {tournament.name}
                    </h2>
                    <p className="text-slate-400 text-sm mt-1 line-clamp-1 italic">
                        {tournament.description || 'Global Bingo competition with high rewards.'}
                    </p>
                </div>

                <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Prize Pool</div>
                    <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-amber-500">
                        {tournament.prize_pool.toLocaleString()} <span className="text-sm">Birr</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 relative z-10">
                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Entry Fee</div>
                    <div className="text-base font-bold text-white">{tournament.entry_fee} Br</div>
                </div>
                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Players</div>
                    <div className="text-base font-bold text-white">{tournament.participant_count} Joined</div>
                </div>
                <div className="bg-white/5 rounded-xl p-3 border border-white/5 col-span-2">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        {isLive ? 'Ends In' : (isUpcoming ? 'Starts In' : 'Completed At')}
                    </div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                        <Timer size={14} className="text-indigo-400" />
                        {isLive ? endDate.toLocaleString() : (isUpcoming ? startDate.toLocaleString() : 'Closed')}
                    </div>
                </div>
            </div>

            <div className="flex gap-3 relative z-10">
                <button
                    onClick={() => onJoin(tournament.id)}
                    disabled={!isLive}
                    className={`flex-[2] font-black py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-3 ${isLive
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:scale-[1.02] active:scale-95 shadow-xl shadow-indigo-600/20'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                >
                    {isLive ? (
                        <>
                            <ExternalLink size={18} />
                            PLAY NOW
                        </>
                    ) : (
                        isUpcoming ? 'WAITING TO START' : 'FINISHED'
                    )}
                </button>
                <button
                    onClick={onResult}
                    className="flex-1 bg-white/5 text-white font-black py-4 px-6 rounded-xl hover:bg-white/10 transition-all border border-white/10 active:scale-95"
                >
                    RANKINGS
                </button>
            </div>
        </motion.div>
    );
}
