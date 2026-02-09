'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { Shield, Zap, User, DollarSign, Trophy, Minus, Maximize2, X, GripHorizontal, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { fetchAdmin } from '@/lib/api';

interface Event {
    id: string;
    type: 'INFO' | 'WIN' | 'RISK' | 'JOIN';
    message: string;
    timestamp: Date;
}


export function LiveFeed() {

    // Use TanStack Query
    const { data: events = [] } = useQuery({
        queryKey: ['admin-feed'],
        queryFn: async () => {
            const res = await fetchAdmin('/feed');
            // Map backend format to UI format if needed
            // Backend returns { events: [{id, type, message, timestamp}]}
            // We need to parse timestamp
            return (res.events || []).map((e: any) => ({
                ...e,
                timestamp: new Date(e.timestamp)
            }));
        },
        refetchInterval: 5000,
    });

    const [isMinimized, setIsMinimized] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    const constraintsRef = useRef(null);

    const getIcon = (type: string) => {
        switch (type) {
            case 'WIN': return <Trophy className="w-3 h-3 text-yellow-500" />;
            case 'RISK': return <Shield className="w-3 h-3 text-red-500" />;
            case 'JOIN': return <User className="w-3 h-3 text-blue-500" />;
            default: return <Zap className="w-3 h-3 text-gray-500" />;
        }
    };

    if (!isVisible) return (
        <Button
            onClick={() => setIsVisible(true)}
            className="fixed bottom-4 right-4 z-50 rounded-full h-10 w-10 p-0 bg-green-900/80 hover:bg-green-800 border border-green-500/50 shadow-lg animate-pulse"
        >
            <Zap className="w-5 h-5 text-green-400" />
        </Button>
    );

    return (
        <motion.div
            drag={!isMaximized}
            dragMomentum={false}
            className={cn(
                "fixed z-50 transition-all duration-300 ease-in-out bg-black/90 border border-white/10 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto",
                isMaximized ? "inset-10 rounded-xl w-auto h-auto" :
                    isMinimized ? "bottom-4 right-4 w-64 h-10 rounded-t-lg cursor-pointer" :
                        "bottom-4 right-4 w-80 h-64 rounded-xl"
            )}
            onClick={() => isMinimized && setIsMinimized(false)}
        >
            {/* Header / Drag Handle */}
            <div className="flex items-center justify-between p-2 bg-white/5 border-b border-white/5 h-10 shrink-0 cursor-grab active:cursor-grabbing">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-mono font-bold text-green-400">
                        SYSTEM FEED {isMaximized && '(FULL LOGS)'}
                    </span>
                </div>

                <div className="flex items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
                    <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }} className="hover:bg-white/10 p-1 rounded">
                        {isMinimized ? <ChevronUp className="w-3 h-3 text-white/70" /> : <Minus className="w-3 h-3 text-white/70" />}
                    </button>
                    {!isMinimized && (
                        <button onClick={() => setIsMaximized(!isMaximized)} className="hover:bg-white/10 p-1 rounded">
                            <Maximize2 className="w-3 h-3 text-white/70" />
                        </button>
                    )}
                    <button onClick={() => setIsVisible(false)} className="hover:bg-red-500/20 p-1 rounded group">
                        <X className="w-3 h-3 text-white/70 group-hover:text-red-400" />
                    </button>
                </div>
            </div>

            {/* Content Area */}
            {!isMinimized && (
                <div className="flex-1 overflow-y-auto p-3 space-y-2 relative font-mono scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    <AnimatePresence initial={false}>
                        {events.map((event: any) => (
                            <motion.div
                                key={event.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className={cn(
                                    "flex items-start gap-2 text-xs p-1.5 rounded hover:bg-white/5 transition-colors border-l-2",
                                    event.type === 'RISK' ? "border-red-500 bg-red-500/5" :
                                        event.type === 'WIN' ? "border-yellow-500 bg-yellow-500/5" :
                                            "border-transparent"
                                )}
                            >
                                <span className="mt-0.5 shrink-0">{getIcon(event.type)}</span>
                                <div className="flex flex-col w-full">
                                    <span className="text-white/90 leading-tight">{event.message}</span>
                                    <div className="flex justify-between items-center text-[9px] text-white/30 mt-1">
                                        <span>{event.id}</span>
                                        <span>{event.timestamp.toLocaleTimeString()}</span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {events.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-white/20 text-xs">
                            <span className="animate-spin text-lg">⟳</span>
                            Listening...
                        </div>
                    )}
                </div>
            )}
        </motion.div>
    );
}
