import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

interface Event {
    id: string;
    name: string;
    type: string;
    description: string;
    multiplier: number;
    start_time: string;
    end_time: string;
}

export default function EventsPage() {
    const { data: events, isLoading } = useQuery({
        queryKey: ['events', 'active'],
        queryFn: async () => {
            const res = await api.get('/events/active');
            return res.data.events as Event[];
        },
        refetchInterval: 30000 // Refresh every 30 seconds
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-xl">Loading events...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-900 via-red-900 to-pink-900 p-6">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-bold text-white mb-8 text-center">
                    🎉 Special Events
                </h1>

                {!events || events.length === 0 ? (
                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center">
                        <p className="text-white text-xl">No active events right now</p>
                        <p className="text-white/70 mt-2">Check back soon for special events!</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {events.map((event) => {
                            const endTime = new Date(event.end_time);
                            const minutesLeft = Math.floor((endTime.getTime() - Date.now()) / (1000 * 60));
                            const hoursLeft = Math.floor(minutesLeft / 60);

                            return (
                                <div
                                    key={event.id}
                                    className="bg-gradient-to-r from-orange-500/20 via-red-500/20 to-pink-500/20 backdrop-blur-lg rounded-2xl p-6 border-2 border-orange-400/30 hover:border-orange-400/50 transition-all animate-pulse-slow"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h2 className="text-3xl font-bold text-white mb-2">
                                                {event.name}
                                            </h2>
                                            <span className="inline-block px-3 py-1 bg-orange-500/30 rounded-full text-sm text-white">
                                                {event.type.replace('_', ' ').toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-5xl font-bold text-yellow-300">
                                                {event.multiplier}x
                                            </div>
                                            <div className="text-sm text-white/70">Rewards</div>
                                        </div>
                                    </div>

                                    <p className="text-white/90 text-lg mb-4">
                                        {event.description}
                                    </p>

                                    <div className="bg-white/10 rounded-lg p-4 mb-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-white/70 text-sm">Time Remaining</div>
                                                <div className="text-white text-2xl font-bold">
                                                    {hoursLeft > 0 ? `${hoursLeft}h ${minutesLeft % 60}m` : `${minutesLeft}m`}
                                                </div>
                                            </div>
                                            <div className="text-6xl">
                                                {event.type === 'happy_hour' && '⏰'}
                                                {event.type === 'weekend_bonanza' && '🎊'}
                                                {event.type === 'flash_sale' && '⚡'}
                                                {event.type === 'holiday' && '🎄'}
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => window.location.href = '/lobby'}
                                        className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold py-4 px-6 rounded-xl hover:from-orange-600 hover:to-red-700 transition-all text-lg"
                                    >
                                        🎮 Play Now & Get {event.multiplier}x Rewards!
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
