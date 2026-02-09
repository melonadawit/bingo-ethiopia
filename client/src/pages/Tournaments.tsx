import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

interface Tournament {
    id: string;
    name: string;
    type: string;
    end_date: string;
    start_date: string;
    participant_count: number;
    prize_pool: number;
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
        refetchInterval: 60000 // Refresh every minute
    });

    const joinTournament = async (tournamentId: string) => {
        if (!user?.telegram_id) {
            toast.error('You must be logged in to join tournaments');
            return;
        }

        try {
            await api.post('/tournaments/join', { tournamentId, userId: user.telegram_id });
            toast.success('Successfully joined tournament!');
        } catch (error: any) {
            toast.error(error.response?.data?.error || 'Failed to join tournament');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-xl">Loading tournaments...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-bold text-white mb-8 text-center uppercase tracking-tight">
                    🏆 Active Tournaments
                </h1>

                {!tournaments || tournaments.length === 0 ? (
                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center">
                        <p className="text-white text-xl font-bold">No active tournaments right now</p>
                        <p className="text-white/70 mt-2">Check back soon!</p>

                        <div className="mt-8 p-4 bg-zinc-900/50 rounded-xl border border-white/5 text-left max-w-sm mx-auto shadow-2xl">
                            <h3 className="text-sm font-bold text-white/50 mb-2 uppercase tracking-widest">Debugging info:</h3>
                            <p className="text-xs text-white/70 font-mono">Is Loading: No</p>
                            <p className="text-xs text-white/70 font-mono">Data Count: {tournaments?.length || 0}</p>
                            <p className="text-xs text-white/70 font-mono break-all">API URL: https://bingo-api.melonadawit71.workers.dev</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-12">
                        {/* ACTIVE TOURNAMENTS */}
                        {tournaments.filter(t => t.is_active).length > 0 ? (
                            <section>
                                <h2 className="text-2xl font-bold text-green-400 mb-6 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
                                    Live Now
                                </h2>
                                <div className="space-y-6">
                                    {tournaments.filter(t => t.is_active).map((tournament) => (
                                        <TournamentCard key={tournament.id} tournament={tournament} onJoin={joinTournament} onResult={() => navigate(`/leaderboard?period=weekly`)} />
                                    ))}
                                </div>
                            </section>
                        ) : (
                            <div className="bg-white/11 backdrop-blur-lg rounded-2xl p-8 text-center border mr-2 border-white/5">
                                <p className="text-white text-xl font-bold">No active tournaments right now</p>
                                <p className="text-white/70 mt-2">Check back soon!</p>

                                <div className="mt-8 p-4 bg-zinc-900/50 rounded-xl border border-white/5 text-left max-w-sm mx-auto shadow-2xl">
                                    <h3 className="text-sm font-bold text-white/50 mb-2 uppercase tracking-widest">Debugging info:</h3>
                                    <p className="text-xs text-white/70 font-mono">Is Loading: No</p>
                                    <p className="text-xs text-white/70 font-mono">Data Count: {tournaments?.length || 0}</p>
                                    <p className="text-xs text-white/70 font-mono break-all">API URL: https://bingo-api.melonadawit71.workers.dev</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function TournamentCard({ tournament, onJoin, onResult }: { tournament: Tournament, onJoin: (id: string) => void, onResult: () => void }) {
    return (
        <div
            className={`bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 transition-all ${!tournament.is_active ? 'opacity-75 grayscale-[0.5]' : 'hover:bg-white/15'}`}
        >
            <div className="flex justify-between items-start mb-4">
                <div className="flex-1 min-w-0 pr-4">
                    <h2 className="text-2xl font-bold text-white mb-2 truncate">
                        {tournament.name}
                    </h2>
                    <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold text-white ${tournament.is_active ? 'bg-green-500/30' : 'bg-gray-500/30'}`}>
                            {tournament.is_active ? 'ACTIVE' : (tournament.status === 'completed' ? 'FINISHED' : 'SCHEDULED')}
                        </span>
                        <span className="inline-block px-3 py-1 bg-purple-500/30 rounded-full text-xs text-white">
                            {tournament.type.replace('_', ' ').toUpperCase()}
                        </span>
                    </div>
                    <p className="text-white/80 text-sm line-clamp-2 break-words">
                        {tournament.description || 'Join the competition and win big!'}
                    </p>
                </div>
                <div className="text-right shrink-0">
                    <div className="text-3xl font-bold text-yellow-400">
                        {tournament.prize_pool} Birr
                    </div>
                    <div className="text-sm text-white/70">Prize Pool</div>
                </div>
            </div>

            <div className="flex gap-3 justify-center">
                <button
                    onClick={() => onJoin(tournament.id)}
                    disabled={!tournament.is_active}
                    className={`flex-1 font-bold py-3 px-6 rounded-xl transition-all ${tournament.is_active
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/20'
                        : 'bg-white/5 text-white/30 cursor-not-allowed border border-white/5'
                        }`}
                >
                    {tournament.is_active ? '🎮 Join Tournament' : '🔒 Closed'}
                </button>
                <button
                    onClick={onResult}
                    className="flex-1 bg-white/10 text-white font-bold py-3 px-6 rounded-xl hover:bg-white/20 transition-all border border-white/10"
                >
                    📊 Results
                </button>
            </div>
        </div>
    );
}
