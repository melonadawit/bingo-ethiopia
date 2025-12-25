import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

interface Tournament {
    id: string;
    name: string;
    type: string;
    end_date: string;
    participant_count: number;
    prize_pool: number;
}

export default function TournamentsPage() {
    const { user } = useAuth();

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
                <h1 className="text-4xl font-bold text-white mb-8 text-center">
                    🏆 Active Tournaments
                </h1>

                {!tournaments || tournaments.length === 0 ? (
                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center">
                        <p className="text-white text-xl">No active tournaments right now</p>
                        <p className="text-white/70 mt-2">Check back soon!</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {tournaments.map((tournament) => {
                            const endDate = new Date(tournament.end_date);
                            const hoursLeft = Math.floor((endDate.getTime() - Date.now()) / (1000 * 60 * 60));

                            return (
                                <div
                                    key={tournament.id}
                                    className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 hover:bg-white/15 transition-all"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h2 className="text-2xl font-bold text-white mb-2">
                                                {tournament.name}
                                            </h2>
                                            <span className="inline-block px-3 py-1 bg-purple-500/30 rounded-full text-sm text-white">
                                                {tournament.type.charAt(0).toUpperCase() + tournament.type.slice(1)}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-3xl font-bold text-yellow-400">
                                                {tournament.prize_pool} Birr
                                            </div>
                                            <div className="text-sm text-white/70">Prize Pool</div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className="bg-white/5 rounded-lg p-3">
                                            <div className="text-white/70 text-sm">Participants</div>
                                            <div className="text-white text-xl font-bold">
                                                {tournament.participant_count || 0}
                                            </div>
                                        </div>
                                        <div className="bg-white/5 rounded-lg p-3">
                                            <div className="text-white/70 text-sm">Ends in</div>
                                            <div className="text-white text-xl font-bold">
                                                {hoursLeft}h
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => joinTournament(tournament.id)}
                                            className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3 px-6 rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all"
                                        >
                                            🎮 Join Tournament
                                        </button>
                                        <button
                                            onClick={() => window.location.href = `/tournaments/${tournament.id}/leaderboard`}
                                            className="flex-1 bg-white/10 text-white font-bold py-3 px-6 rounded-xl hover:bg-white/20 transition-all"
                                        >
                                            📊 Leaderboard
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
