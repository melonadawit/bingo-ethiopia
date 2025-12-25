import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

interface Event {
    id: string;
    name: string;
    description: string;
    multiplier: number;
    end_time: string;
}

export default function EventBanner() {
    const { data: events } = useQuery({
        queryKey: ['events', 'active'],
        queryFn: async () => {
            const res = await api.get('/events/active');
            return res.data.events as Event[];
        },
        refetchInterval: 30000 // Refresh every 30 seconds
    });

    if (!events || events.length === 0) {
        return null;
    }

    return (
        <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
            <div className="max-w-7xl mx-auto p-4 pointer-events-auto">
                {events.map((event) => {
                    const endTime = new Date(event.end_time);
                    const minutesLeft = Math.floor((endTime.getTime() - Date.now()) / (1000 * 60));

                    return (
                        <div
                            key={event.id}
                            className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white rounded-2xl p-4 mb-2 shadow-2xl animate-pulse"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="text-4xl">🎉</div>
                                    <div>
                                        <h3 className="text-xl font-bold">{event.name}</h3>
                                        <p className="text-sm opacity-90">{event.description}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-bold">{event.multiplier}x</div>
                                    <div className="text-sm opacity-90">Rewards!</div>
                                    <div className="text-xs mt-1">Ends in {minutesLeft}m</div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
