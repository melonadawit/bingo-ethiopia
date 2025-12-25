'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAdmin } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, Calendar, Trophy, Users, Clock, PlayCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface Tournament {
    id: string;
    title: string;
    description: string;
    start_time: string;
    end_time: string;
    prize_pool: number;
    entry_fee: number;
    status: 'scheduled' | 'active' | 'completed' | 'cancelled';
}

export default function TournamentsPage() {
    const queryClient = useQueryClient();
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [start, setStart] = useState('');
    const [end, setEnd] = useState('');
    const [prize, setPrize] = useState('');
    const [fee, setFee] = useState('');

    const { data, isLoading } = useQuery<{ tournaments: Tournament[] }>({
        queryKey: ['tournaments'],
        queryFn: () => fetchAdmin('/tournaments'),
    });

    const createMutation = useMutation({
        mutationFn: async () => {
            return fetchAdmin('/tournaments', {
                method: 'POST',
                body: JSON.stringify({
                    title,
                    description: desc,
                    start_time: new Date(start).toISOString(),
                    end_time: new Date(end).toISOString(),
                    prize_pool: parseFloat(prize),
                    entry_fee: parseFloat(fee)
                })
            });
        },
        onSuccess: () => {
            setIsCreateOpen(false);
            toast.success('Tournament scheduled successfully');
            queryClient.invalidateQueries({ queryKey: ['tournaments'] });
            // Reset form
            setTitle(''); setDesc(''); setStart(''); setEnd(''); setPrize(''); setFee('');
        },
        onError: () => toast.error('Failed to schedule tournament')
    });

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-gradient-to-br from-green-500/5 to-emerald-500/5 p-8 rounded-3xl border border-white/10 shadow-xl backdrop-blur-3xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

                <div className="z-10">
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-emerald-600">Tournament Center</h1>
                    <p className="text-muted-foreground mt-2 text-lg">Automate competition schedules and prize distribution.</p>
                </div>

                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button size="lg" className="z-10 bg-green-600 hover:bg-green-700 shadow-xl shadow-green-500/20 rounded-full px-8 py-6 text-lg transition-transform hover:scale-105 active:scale-95">
                            <Plus className="h-5 w-5 mr-3" />
                            Schedule Tournament
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>New Tournament</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Title</label>
                                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Friday Night Grand Slam" />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Description</label>
                                <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Rules and details..." />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Start Time</label>
                                    <Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">End Time</label>
                                    <Input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Prize Pool (ETB)</label>
                                    <Input type="number" value={prize} onChange={(e) => setPrize(e.target.value)} placeholder="10000" />
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Entry Fee (ETB)</label>
                                    <Input type="number" value={fee} onChange={(e) => setFee(e.target.value)} placeholder="50" />
                                </div>
                            </div>

                            <Button onClick={() => createMutation.mutate()} disabled={!title || !start || createMutation.isPending} className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white">
                                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Schedule Automated Event"}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* List */}
            <div className="grid gap-6">
                {isLoading ? <div>Loading tournaments...</div> : data?.tournaments?.map((t) => {
                    const statusColors = {
                        scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
                        active: 'bg-green-100 text-green-800 border-green-200 animate-pulse',
                        completed: 'bg-gray-100 text-gray-800 border-gray-200',
                        cancelled: 'bg-red-100 text-red-800 border-red-200'
                    };

                    return (
                        <Card key={t.id} className="group hover:shadow-lg transition-all border-l-4 border-l-transparent hover:border-l-green-500">
                            <CardContent className="p-6 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-xl font-bold">{t.title}</h3>
                                        <Badge variant="outline" className={statusColors[t.status] || ''}>
                                            {t.status.toUpperCase()}
                                        </Badge>
                                    </div>
                                    <p className="text-muted-foreground text-sm line-clamp-1">{t.description}</p>

                                    <div className="flex items-center gap-6 text-sm text-foreground/80 pt-2">
                                        <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded">
                                            <Calendar className="w-4 h-4 text-green-600" />
                                            <span className="font-mono">{format(new Date(t.start_time), 'MMM d, HH:mm')}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <Clock className="w-4 h-4 text-muted-foreground" />
                                            <span>Duration: {((new Date(t.end_time).getTime() - new Date(t.start_time).getTime()) / 3600000).toFixed(1)}h</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-8 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-8 w-full md:w-auto mt-4 md:mt-0">
                                    <div className="text-center">
                                        <div className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Prize Pool</div>
                                        <div className="text-2xl font-black text-green-600 flex items-center justify-center">
                                            <Trophy className="w-5 h-5 mr-1" />
                                            {t.prize_pool.toLocaleString()}
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Entry</div>
                                        <div className="text-xl font-bold">{t.entry_fee > 0 ? t.entry_fee : 'FREE'}</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}


                {data?.tournaments?.length === 0 && (
                    <div className="text-center p-12 bg-muted/20 rounded-3xl border border-dashed">
                        <Trophy className="mx-auto h-12 w-12 text-muted-foreground mb-4 opacity-30" />
                        <h3 className="font-medium text-xl">No Tournaments Scheduled</h3>
                        <p className="text-muted-foreground">Set up the next big event to drive engagement.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
