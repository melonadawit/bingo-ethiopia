import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { Zap, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';

interface Event {
    id: string;
    name: string;
    type: string;
    description: string;
    multiplier: number;
    start_time: string;
    end_time: string;
    status: string;
    is_active: boolean;
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
                <div className="text-xl text-white">Loading events...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-indigo-900 p-6">
            <div className="max-w-4xl mx-auto">
                <header className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-white mb-4 tracking-tight uppercase">
                        🏆 Active Events
                    </h1>
                    <p className="text-white/60 text-lg max-w-2xl mx-auto">
                        Boost your winnings with limited-time rewards and special game modes!
                    </p>
                </header>

                {!events || events.length === 0 ? (
                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center">
                        <p className="text-white text-xl">No active events right now</p>
                        <p className="text-white/70 mt-2">Check back soon!</p>

                        <div className="mt-8 p-4 bg-zinc-900/50 rounded-xl border border-white/5 text-left max-w-sm mx-auto">
                            <h3 className="text-sm font-bold text-white/50 mb-2 uppercase tracking-widest">Debugging info:</h3>
                            <p className="text-xs text-white/70 font-mono">Is Loading: No</p>
                            <p className="text-xs text-white/70 font-mono">Data Count: {events?.length || 0}</p>
                            <p className="text-xs text-white/70 font-mono break-all">API URL: https://bingo-api.melonadawit71.workers.dev</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-12">
                        {/* ACTIVE EVENTS */}
                        {events.filter(e => e.is_active).length > 0 ? (
                            <section>
                                <h2 className="text-2xl font-bold text-orange-400 mb-6 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-orange-500 rounded-full animate-ping"></span>
                                    Active Now
                                </h2>
                                <div className="space-y-6">
                                    {events.filter(e => e.is_active).map((event: any) => (
                                        <EventCard key={event.id} event={event} />
                                    ))}
                                </div>
                            </section>
                        ) : (
                            <div className="bg-white/11 backdrop-blur-lg rounded-2xl p-8 text-center border mr-2 border-white/5">
                                <p className="text-white text-xl">No active events right now</p>
                                <p className="text-white/70 mt-2">Check back soon!</p>

                                <div className="mt-8 p-4 bg-zinc-900/50 rounded-xl border border-white/5 text-left max-w-sm mx-auto">
                                    <h3 className="text-sm font-bold text-white/50 mb-2 uppercase tracking-widest">Debugging info:</h3>
                                    <p className="text-xs text-white/70 font-mono">Is Loading: No</p>
                                    <p className="text-xs text-white/70 font-mono">Data Count: {events?.length || 0}</p>
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

function EventCard({ event }: { event: Event }) {
    const endTime = new Date(event.end_time);
    const minutesLeft = Math.floor((endTime.getTime() - Date.now()) / (1000 * 60));
    const hoursLeft = Math.floor(minutesLeft / 60);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`backdrop-blur-lg rounded-2xl p-6 border-2 transition-all ${event.is_active
                ? 'bg-gradient-to-r from-orange-500/20 via-red-500/20 to-pink-500/20 border-orange-400/30 hover:border-orange-400/50'
                : 'bg-white/5 border-white/10 opacity-75 grayscale-[0.5]'
                }`}
        >
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h2 className={`text-3xl font-bold mb-2 ${event.is_active ? 'text-white' : 'text-white/70'}`}>
                        {event.name}
                    </h2>
                    <div className="flex items-center gap-2">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold text-white ${event.is_active ? 'bg-orange-500/30' : 'bg-gray-500/30'}`}>
                            {event.is_active ? 'LIVE' : 'ENDED'}
                        </span>
                        <span className="inline-block px-3 py-1 bg-white/10 rounded-full text-xs text-white uppercase tracking-wider">
                            {event.type.replace('_', ' ')}
                        </span>
                    </div>
                </div>
                <div className="text-right">
                    <div className={`text-5xl font-bold ${event.is_active ? 'text-yellow-400' : 'text-white/30'}`}>
                        {event.multiplier}x
                    </div>
                    <div className="text-xs text-white/50 uppercase font-bold tracking-widest">Multiplier</div>
                </div>
            </div>

            <p className="text-white/90 text-lg mb-6 leading-relaxed">
                {event.description}
            </p>

            {event.is_active && (
                <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Zap className="w-5 h-5 text-yellow-400 animate-pulse" />
                            <div>
                                <div className="text-white/50 text-xs uppercase font-bold tracking-wider">Closes In</div>
                                <div className="text-white text-xl font-mono font-bold">
                                    {hoursLeft > 0 ? `${hoursLeft}h ${minutesLeft % 60}m` : `${minutesLeft}m`}
                                </div>
                            </div>
                        </div>
                        <div className="text-5xl opacity-80">
                            {event.type === 'happy_hour' && '🍻'}
                            {event.type === 'weekend_bonanza' && '🎉'}
                            {event.type === 'flash_sale' && '⚡'}
                            {event.type === 'holiday' && '🎁'}
                            {!['happy_hour', 'weekend_bonanza', 'flash_sale', 'holiday'].includes(event.type) && '⭐'}
                        </div>
                    </div>
                </div>
            )}

            <button
                onClick={() => window.location.href = '/lobby'}
                disabled={!event.is_active}
                className={`w-full font-bold py-4 px-6 rounded-xl transition-all text-lg flex items-center justify-center gap-3 ${event.is_active
                    ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white hover:from-orange-600 hover:to-red-700 shadow-lg shadow-orange-500/20'
                    : 'bg-white/5 text-white/30 cursor-not-allowed border border-white/5'
                    }`}
            >
                {event.is_active ? (
                    <>
                        <span>🎮 Play Now & Boost Rewards</span>
                    </>
                ) : (
                    <>
                        <Calendar className="w-5 h-5" />
                        <span>Event Concluded</span>
                    </>
                )}
            </button>
        </motion.div>
    );
}
