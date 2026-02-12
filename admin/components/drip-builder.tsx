
'use client';

import { useState, useEffect } from 'react';
import { motion, Reorder } from 'framer-motion';
import { Mail, Clock, ArrowRight, MessageCircle, AlertCircle, Plus, Trash2, Save, Loader2, GripVertical } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAdmin } from '@/lib/api';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Step {
    id: string;
    type: 'EMAIL' | 'SMS' | 'TELEGRAM' | 'WAIT';
    label: string;
    details: string;
    message?: string; // Content of the message
    delay?: string;   // For WAIT steps (e.g. "24h")
}

const DEFAULT_STEPS: Step[] = [
    { id: '1', type: 'TELEGRAM', label: 'Welcome Bonus', details: 'Send immediately on signup', message: 'Welcome to Bingo! Here is your bonus.' },
];

export function DripBuilder() {
    const queryClient = useQueryClient();

    // Fetch existing sequence
    const { data, isLoading } = useQuery({
        queryKey: ['drip-sequence'],
        queryFn: async () => {
            const res = await fetchAdmin('/marketing/drip');
            return res.sequence && res.sequence.length > 0 ? res.sequence : DEFAULT_STEPS;
        }
    });

    const [flow, setFlow] = useState<Step[]>([]);

    useEffect(() => {
        if (data) {
            setFlow(data);
        }
    }, [data]);


    const saveMutation = useMutation({
        mutationFn: async (newFlow: Step[]) => {
            return fetchAdmin('/marketing/drip', {
                method: 'POST',
                body: JSON.stringify({ sequence: newFlow })
            });
        },
        onSuccess: () => {
            toast.success('Drip sequence saved!');
            queryClient.invalidateQueries({ queryKey: ['drip-sequence'] });
        },
        onError: () => toast.error('Failed to save sequence')
    });

    const handleDelete = (id: string) => {
        setFlow(flow.filter(s => s.id !== id));
    };

    const handleAdd = (step: Step) => {
        setFlow([...flow, step]);
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'TELEGRAM': return <MessageCircle className="w-5 h-5 text-blue-500" />;
            case 'WAIT': return <Clock className="w-5 h-5 text-amber-500" />;
            case 'SMS': return <AlertCircle className="w-5 h-5 text-green-500" />;
            default: return <Mail className="w-5 h-5 text-gray-500" />;
        }
    };

    if (isLoading) return <div className="p-8 text-center text-white/50 animate-pulse">Loading Sequence...</div>;

    return (
        <Card className="w-full bg-slate-950/50 border-slate-800 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
                        Automated Drip Sequence
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">Drag to reorder. Messages sent automatically based on timing.</p>
                </div>
                <div className="flex gap-2">
                    <AddStepDialog onAdd={handleAdd} />
                    <Button
                        size="sm"
                        onClick={() => saveMutation.mutate(flow)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        disabled={saveMutation.isPending}
                    >
                        {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Save Changes
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="relative pt-8 pb-12 px-4 overflow-x-auto custom-scrollbar">

                {/* Reorderable List Horizontal (using Framer Motion Reorder if possible, or simpler list) */}
                {/* Framer Reorder Horizontal is tricky with flex. Let's stick to a clean list we can manipulate */}

                <div className="flex items-center space-x-4 min-w-max pb-4">
                    {flow.map((step, index) => (
                        <div key={step.id} className="flex items-center relative group">

                            {/* Card */}
                            <motion.div
                                layout
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="relative"
                            >
                                <div className="w-64 h-36 rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-4 flex flex-col justify-between hover:border-blue-500/50 transition-colors shadow-lg relative group">

                                    {/* Delete Button (Hover) */}
                                    <button
                                        onClick={() => handleDelete(step.id)}
                                        className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/20"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>

                                    <div className="flex items-start justify-between">
                                        <div className="p-2 rounded-lg bg-white/5">{getIcon(step.type)}</div>
                                        <span className="text-[10px] font-mono text-white/30 truncate ml-2">STEP {index + 1}</span>
                                    </div>

                                    <div>
                                        <div className="font-bold text-sm text-white/90 truncate pr-6">{step.label}</div>
                                        <div className="text-xs text-white/50 line-clamp-2 mt-1">{step.details}</div>
                                    </div>

                                    {/* Additional Info Badge */}
                                    {step.type === 'WAIT' && (
                                        <div className="mt-2 inline-block px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-mono">
                                            ⏳ {step.delay || '24h'}
                                        </div>
                                    )}
                                </div>
                            </motion.div>

                            {/* Arrow */}
                            {index < flow.length - 1 ? (
                                <ArrowRight className="w-4 h-4 text-white/20 mx-2" />
                            ) : (
                                <div className="ml-4 flex flex-col items-center justify-center opacity-50 hover:opacity-100 transition-opacity">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse mb-1"></div>
                                    <span className="text-[10px] text-green-400 font-mono">FLOW END</span>
                                </div>
                            )}
                        </div>
                    ))}

                    {flow.length === 0 && (
                        <div className="text-white/30 text-sm italic p-4 border border-dashed border-white/10 rounded-xl">
                            No steps defined. Add a step to start.
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function AddStepDialog({ onAdd }: { onAdd: (s: Step) => void }) {
    const [open, setOpen] = useState(false);
    const [type, setType] = useState<Step['type']>('TELEGRAM');
    const [label, setLabel] = useState('');
    const [details, setDetails] = useState('');
    const [delay, setDelay] = useState('24h');
    const [message, setMessage] = useState('');

    const handleSubmit = () => {
        onAdd({
            id: Math.random().toString(36).substr(2, 9),
            type,
            label: label || (type === 'WAIT' ? 'Delay' : 'Message'),
            details: type === 'WAIT' ? `Wait for ${delay}` : details || 'Sent automatically',
            delay: type === 'WAIT' ? delay : undefined,
            message: type === 'TELEGRAM' ? message : undefined
        });
        setOpen(false);
        // Reset
        setLabel('');
        setDetails('');
        setMessage('');
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="border-blue-500/20 hover:bg-blue-500/10 text-blue-400">
                    <Plus className="w-4 h-4 mr-2" /> Add Step
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-700 text-white">
                <DialogHeader>
                    <DialogTitle>Add Sequence Step</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Step Type</Label>
                        <Select value={type} onValueChange={(v: any) => setType(v)}>
                            <SelectTrigger className="bg-black/20 border-white/10">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="TELEGRAM">Telegram Message</SelectItem>
                                <SelectItem value="WAIT">Time Delay (Wait)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Label (Internal Name)</Label>
                        <Input
                            value={label}
                            onChange={e => setLabel(e.target.value)}
                            placeholder={type === 'WAIT' ? "e.g. Wait 1 Day" : "e.g. Welcome Back"}
                            className="bg-black/20 border-white/10"
                        />
                    </div>

                    {type === 'WAIT' ? (
                        <div className="space-y-2">
                            <Label>Wait Duration</Label>
                            <Select value={delay} onValueChange={setDelay}>
                                <SelectTrigger className="bg-black/20 border-white/10"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1h">1 Hour</SelectItem>
                                    <SelectItem value="6h">6 Hours</SelectItem>
                                    <SelectItem value="12h">12 Hours</SelectItem>
                                    <SelectItem value="24h">24 Hours (1 Day)</SelectItem>
                                    <SelectItem value="48h">48 Hours (2 Days)</SelectItem>
                                    <SelectItem value="7d">7 Days</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2">
                                <Label>Message Content</Label>
                                <Textarea
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                    placeholder="Hello! Did you know..."
                                    className="bg-black/20 border-white/10 h-24"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Details (Short Description)</Label>
                                <Input
                                    value={details}
                                    onChange={e => setDetails(e.target.value)}
                                    placeholder="e.g. Sent after 24h inactivity"
                                    className="bg-black/20 border-white/10"
                                />
                            </div>
                        </>
                    )}

                    <Button onClick={handleSubmit} className="w-full bg-blue-600 hover:bg-blue-700 mt-4">
                        Add to Sequence
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

