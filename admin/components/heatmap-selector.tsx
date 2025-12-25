'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const CITIES = [
    { id: 'addis', name: 'Addis Ababa', density: 95, users: '12.5k' },
    { id: 'adama', name: 'Adama', density: 65, users: '4.2k' },
    { id: 'hawassa', name: 'Hawassa', density: 50, users: '3.1k' },
    { id: 'bahir_dar', name: 'Bahir Dar', density: 40, users: '2.8k' },
    { id: 'mekelle', name: 'Mekelle', density: 30, users: '1.9k' },
    { id: 'diredawa', name: 'Dire Dawa', density: 45, users: '3.0k' },
];

export function HeatmapSelector({ onSelect }: { onSelect: (cities: string[]) => void }) {
    const [selected, setSelected] = useState<string[]>(['addis']);

    const toggleCity = (id: string) => {
        const newSelection = selected.includes(id)
            ? selected.filter(c => c !== id)
            : [...selected, id];
        setSelected(newSelection);
        onSelect(newSelection);
    };

    return (
        <div className="bg-slate-900/50 p-4 rounded-xl border border-white/10">
            <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-semibold text-white flex items-center">
                    <MapPin className="w-4 h-4 mr-2 text-indigo-400" />
                    Geo-Targeting
                </div>
                <div className="text-xs text-white/50">
                    Est. Reach: <span className="text-white font-mono">{selected.reduce((acc, curr) => {
                        const city = CITIES.find(c => c.id === curr);
                        return acc + (city ? parseFloat(city.users) : 0);
                    }, 0).toFixed(1)}k</span> Users
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
                {CITIES.map((city) => {
                    const isSelected = selected.includes(city.id);
                    return (
                        <motion.button
                            key={city.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => toggleCity(city.id)}
                            className={cn(
                                "relative overflow-hidden rounded-lg p-3 text-left transition-all border",
                                isSelected
                                    ? "bg-indigo-600/20 border-indigo-500/50"
                                    : "bg-white/5 border-white/5 hover:bg-white/10"
                            )}
                        >
                            {/* Heat bar background */}
                            <div
                                className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-transparent to-indigo-500 opacity-50"
                                style={{ width: `${city.density}%` }}
                            />

                            <div className="flex justify-between items-start">
                                <span className={cn("text-sm font-medium", isSelected ? "text-indigo-300" : "text-white/80")}>
                                    {city.name}
                                </span>
                                {isSelected && <div className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]" />}
                            </div>
                            <div className="mt-1 text-xs text-white/40 flex items-center">
                                <Users className="w-3 h-3 mr-1 opacity-50" />
                                {city.users}
                            </div>
                        </motion.button>
                    );
                })}
            </div>
        </div>
    );
}
