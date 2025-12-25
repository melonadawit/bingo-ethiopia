'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Clock, ArrowRight, MessageCircle, AlertCircle, Plus } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Step {
    id: string;
    type: 'EMAIL' | 'SMS' | 'TELEGRAM' | 'WAIT';
    label: string;
    details: string;
}

const MOCK_FLOW: Step[] = [
    { id: '1', type: 'TELEGRAM', label: 'Welcome Message', details: 'Send immediately on signup' },
    { id: '2', type: 'WAIT', label: 'Wait 24 Hours', details: 'Delay' },
    { id: '3', type: 'TELEGRAM', label: 'First Deposit Bonus', details: '100% Match up to 5000' },
    { id: '4', type: 'WAIT', label: 'Wait 3 Days', details: 'Check if no deposit' },
    { id: '5', type: 'SMS', label: 'Reminder Alert', details: 'Urgent: Bonus expiring' },
];

export function DripBuilder() {
    const [flow, setFlow] = useState<Step[]>(MOCK_FLOW);

    const getIcon = (type: string) => {
        switch (type) {
            case 'TELEGRAM': return <MessageCircle className="w-5 h-5 text-blue-500" />;
            case 'WAIT': return <Clock className="w-5 h-5 text-amber-500" />;
            case 'SMS': return <AlertCircle className="w-5 h-5 text-green-500" />;
            default: return <Mail className="w-5 h-5 text-gray-500" />;
        }
    };

    return (
        <Card className="w-full bg-slate-950/50 border-slate-800 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
                    Automated Drip Sequence
                </CardTitle>
                <Button size="sm" variant="outline" className="border-blue-500/20 hover:bg-blue-500/10 text-blue-400">
                    <Plus className="w-4 h-4 mr-2" /> Add Step
                </Button>
            </CardHeader>
            <CardContent className="relative pt-8 pb-12 px-4 overflow-x-auto">
                <div className="flex items-center space-x-4 min-w-max">
                    {flow.map((step, index) => (
                        <div key={step.id} className="flex items-center">
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: index * 0.1 }}
                                className="relative group"
                            >
                                <div className="w-64 h-32 rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-4 flex flex-col justify-between hover:border-blue-500/50 transition-colors cursor-pointer shadow-lg">
                                    <div className="flex items-start justify-between">
                                        <div className="p-2 rounded-lg bg-white/5">{getIcon(step.type)}</div>
                                        <span className="text-[10px] font-mono text-white/30 truncate">STEP {index + 1}</span>
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm text-white/90">{step.label}</div>
                                        <div className="text-xs text-white/50">{step.details}</div>
                                    </div>
                                </div>
                                {/* Connector Line */}
                                {index < flow.length - 1 && (
                                    <div className="absolute top-1/2 -right-6 w-6 h-0.5 bg-white/10" />
                                )}
                            </motion.div>

                            {index < flow.length - 1 ? (
                                <ArrowRight className="w-4 h-4 text-white/20 mx-2" />
                            ) : (
                                <div className="ml-4 px-4 py-2 rounded-full border border-dashed border-white/10 text-xs text-white/30 cursor-pointer hover:border-white/30 hover:text-white/50 transition-colors">
                                    + End
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
