import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { useState } from 'react';
import { X } from 'lucide-react';
import api from '../services/api';

interface Event {
    id: string;
    name: string;
    description: string;
    multiplier: number;
    end_time: string;
    is_active: boolean;
}

export default function EventBanner() {
    const location = useLocation();
    const [isVisible, setIsVisible] = useState(true);

    const { data: events } = useQuery({
        queryKey: ['events', 'active'],
        queryFn: async () => {
            const res = await api.get('/events/active');
            return res.data.events as Event[];
        },
        refetchInterval: 30000 // Refresh every 30 seconds
    });

    // Only show on Lobby
    if (location.pathname !== '/lobby') return null;

    const activeEvents = (events || []).filter(e => e.is_active && new Date(e.end_time) > new Date());

    if (!isVisible || activeEvents.length === 0) {
        return null;
    }

    return (
        <div className="fixed top-20 left-0 right-0 z-40 pointer-events-none">
            <div className="max-w-4xl mx-auto px-4 pointer-events-auto">
                {activeEvents.map((event) => {
                    const endTime = new Date(event.end_time);
                    const minutesLeft = Math.floor((endTime.getTime() - Date.now()) / (1000 * 60));

                    return (
                        <div
                            key={event.id}
                            className="relative bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white rounded-2xl p-4 mb-2 shadow-2xl animate-in slide-in-from-top duration-500"
                        >
                            {/* Close Button */}
                            <button
                                onClick={() => setIsVisible(false)}
                                className="absolute top-2 right-2 p-1 bg-black/20 hover:bg-black/40 rounded-full transition-colors"
                            >
                                <X size={16} />
                            </button>

                            <div className="flex items-center justify-between pr-8">
                                <div className="flex items-center gap-4">
                                    <div className="text-4xl animate-bounce">🎉</div>
                                    <div>
                                        <h3 className="text-xl font-bold">{event.name}</h3>
                                        <p className="text-sm opacity-90">{event.description}</p>
                                    </div>
                                </div>
                                <div className="text-right hidden sm:block">
                                    <div className="text-3xl font-bold">{event.multiplier}x</div>
                                    <div className="text-sm opacity-90">Rewards!</div>
                                    <div className="text-xs mt-1 bg-black/20 px-2 py-0.5 rounded-full inline-block">
                                        ⏱️ {minutesLeft}m left
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
