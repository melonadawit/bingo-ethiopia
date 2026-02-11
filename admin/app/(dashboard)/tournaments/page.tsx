'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAdmin } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, Calendar, Trophy, Users, Clock, PlayCircle, Sparkles, MessageSquare, RefreshCw, Send, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Megaphone, Save } from 'lucide-react';

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

interface SpecialEvent {
    id: string;
    title: string;
    description: string;
    type: string;
    multiplier: number;
    start_time: string;
    end_time: string;
    status: string;
}

export default function TournamentsPage() {
    const queryClient = useQueryClient();
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    // --- Announcement State (Migration from Settings) ---
    const [announcement, setAnnouncement] = useState<any>({
        enabled: false,
        id: '',
        title: '',
        message: '',
        image_url: '',
        action_text: '',
        action_url: ''
    });

    const [isGeneratingAI, setIsGeneratingAI] = useState(false);

    // Fetch Current Config for Announcement
    const { data: config } = useQuery({
        queryKey: ['admin-config'],
        queryFn: () => fetchAdmin('/config/latest'),
    });

    // Sync Announcement State
    useEffect(() => {
        if (config?.features?.announcement) {
            setAnnouncement(config.features.announcement);
        }
    }, [config]);

    // Save Announcement Mutation
    const updateConfigMutation = useMutation({
        mutationFn: async (newConfig: any) => {
            // Merge with existing config structure
            const current = config || {};
            const features = { ...current.features, announcement: newConfig };

            // We need to send the FULL payload as the backend expects
            return fetchAdmin('/config/update', {
                method: 'POST',
                // Note: We are only updating the announcement part of features here, 
                // but ideally we should send the whole config to avoid race conditions. 
                // For now, assuming relatively isolated usage.
                body: JSON.stringify({
                    version: current.version,
                    rules: current.rules,
                    features
                })
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-config'] });
            toast.success("Announcement settings saved");
        }
    });

    const updateAnnouncement = (key: string, value: any) => {
        const updated = { ...announcement, [key]: value };
        setAnnouncement(updated);
        // Debounce save? For now explicit save button is better for AI flow.
    };

    const generateAI = async (type: 'tournament' | 'win' | 'event') => {
        setIsGeneratingAI(true);
        try {
            const promptMap = {
                'tournament': 'Upcoming Tournament',
                'win': 'Jackpot Winner',
                'event': 'Special Holiday Event'
            };

            const res = await fetchAdmin('/generate-announcement', {
                method: 'POST',
                body: JSON.stringify({ topic: promptMap[type], type })
            });

            if (res.title && res.message) {
                setAnnouncement((prev: any) => ({
                    ...prev,
                    title: res.title,
                    message: res.message
                }));
                toast.success("AI generated content!");
            }
        } catch (e) {
            toast.error("AI Generation Failed");
        } finally {
            setIsGeneratingAI(false);
        }
    };

    const generateImage = async (style: string) => {
        setIsGeneratingAI(true);
        try {
            // For simplicity, using a fixed prompt structure based on title
            const prompt = `Poster for event: ${announcement.title || 'Bingo Game'}, ${style}`;

            const res = await fetchAdmin('/generate-image', {
                method: 'POST',
                body: JSON.stringify({ prompt })
            });

            if (res.url) {
                updateAnnouncement('image_url', res.url);
                toast.success("AI Image Generated!");
            } else {
                toast.error("Generation failed (no URL)");
            }
        } catch (e) {
            console.error(e);
            toast.error("AI Image Gen Failed");
        } finally {
            setIsGeneratingAI(false);
        }
    };

    const handleImageUpload = async (file: File) => {
        setIsGeneratingAI(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            // We need a special fetch here because we are sending FormData, not JSON
            // fetchAdmin wrapper might default to JSON, so let's verify or use raw fetch if needed.
            // Assuming fetchAdmin handles it or we manually do it. 
            // Let's manually do it to be safe as fetchAdmin headers might conflict.
            const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://bingo-api-worker.melonadawit71.workers.dev';
            const res = await fetch(`${API_URL}/admin/upload-image`, {
                method: 'POST',
                body: formData
            });

            if (!res.ok) throw new Error('Upload failed');

            const data = await res.json();
            if (data.url) {
                updateAnnouncement('image_url', data.url);
                toast.success("Image Uploaded!");
            }
        } catch (e) {
            console.error(e);
            toast.error("Upload Failed");
        } finally {
            setIsGeneratingAI(false);
        }
    };


    // ... Form State (title, desc, etc.)
    const [title, setTitle] = useState('');
    const [desc, setDesc] = useState('');
    const [start, setStart] = useState('');
    const [end, setEnd] = useState('');
    const [prize, setPrize] = useState('');
    const [fee, setFee] = useState('');
    const [announce, setAnnounce] = useState(true); // Default to true

    // ... Queries and Mutations (existing)

    const { data, isLoading } = useQuery<{ tournaments: Tournament[] }>({
        queryKey: ['tournaments'],
        queryFn: () => fetchAdmin('/tournaments'),
    });

    const { data: eventsData, isLoading: isEventsLoading } = useQuery<{ events: SpecialEvent[] }>({
        queryKey: ['admin-events'],
        queryFn: () => fetchAdmin('/events'),
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
                    entry_fee: parseFloat(fee),
                    announce // Send flag
                })
            });
        },
        onSuccess: () => {
            setIsCreateOpen(false);
            toast.success('Tournament scheduled successfully');
            if (announce) toast.success('Global announcement triggered!');
            queryClient.invalidateQueries({ queryKey: ['tournaments'] });
            // Reset form
            setTitle(''); setDesc(''); setStart(''); setEnd(''); setPrize(''); setFee(''); setAnnounce(true);
        },
        onError: () => toast.error('Failed to schedule tournament')
    });

    // --- EVENT STATE ---
    const [isEventCreateOpen, setIsEventCreateOpen] = useState(false);
    const [eventForm, setEventForm] = useState({
        title: '',
        description: '',
        type: 'happy_hour',
        multiplier: '1.5',
        start_time: '',
        end_time: '',
        announce: true
    });

    const createEventMutation = useMutation({
        mutationFn: async () => {
            return fetchAdmin('/events', {
                method: 'POST',
                body: JSON.stringify({
                    title: eventForm.title,
                    description: eventForm.description,
                    type: eventForm.type,
                    multiplier: parseFloat(eventForm.multiplier),
                    start_time: new Date(eventForm.start_time).toISOString(),
                    end_time: new Date(eventForm.end_time).toISOString(),
                    announce: eventForm.announce
                })
            });
        },
        onSuccess: () => {
            setIsEventCreateOpen(false);
            setEventForm({
                title: '',
                description: '',
                type: 'happy_hour',
                multiplier: '1.5',
                start_time: '',
                end_time: '',
                announce: true
            });
            toast.success('Special event scheduled!');
            queryClient.invalidateQueries({ queryKey: ['admin-events'] });
        },
        onError: () => toast.error('Failed to schedule event')
    });

    // --- MANAGE ACTIONS ---
    const handleAction = async (type: 'tournaments' | 'events', id: string, action: 'end' | 'delete') => {
        const confirmMsg = action === 'delete' ? "Are you sure you want to PERMANENTLY delete this?" : "End this early?";
        if (!confirm(confirmMsg)) return;

        try {
            if (action === 'end') {
                await fetchAdmin(`/${type}/${id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({
                        status: type === 'tournaments' ? 'completed' : 'ended',
                        end_time: new Date().toISOString()
                    })
                });
                toast.success("Ended successfully");
            } else {
                await fetchAdmin(`/${type}/${id}`, { method: 'DELETE' });
                toast.success("Deleted successfully");
            }
            queryClient.invalidateQueries({ queryKey: [type === 'tournaments' ? 'tournaments' : 'admin-events'] });
        } catch (e) {
            console.error(e);
            toast.error("Action failed");
        }
    };


    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-gradient-to-br from-green-500/5 to-emerald-500/5 p-8 rounded-3xl border border-white/10 shadow-xl backdrop-blur-3xl relative overflow-hidden">
                {/* ... (Header Content) */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />
                <div className="z-10">
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-emerald-600">Tournament & Events Center</h1>
                    <p className="text-muted-foreground mt-2 text-lg">Manage competitions and global broadcasts.</p>
                </div>

                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button size="lg" className="z-10 bg-green-600 hover:bg-green-700 shadow-xl shadow-green-500/20 rounded-full px-8 py-6 text-lg transition-transform hover:scale-105 active:scale-95">
                            <Plus className="h-5 w-5 mr-3" />
                            Schedule Tournament
                        </Button>
                    </DialogTrigger>
                    {/* ... (Dialog Content) */}
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



                            <div className="flex items-center space-x-2 mt-2 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                                <Switch id="auto-announce" checked={announce} onCheckedChange={setAnnounce} />
                                <Label htmlFor="auto-announce" className="text-sm font-medium cursor-pointer">
                                    Auto-Announce to all players immediately
                                </Label>
                            </div>

                            <Button onClick={() => createMutation.mutate()} disabled={!title || !start || createMutation.isPending} className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white">
                                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Schedule Automated Event"}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* --- NEW: Create Event Dialog --- */}
                <Dialog open={isEventCreateOpen} onOpenChange={setIsEventCreateOpen}>
                    <DialogTrigger asChild>
                        <Button size="lg" variant="secondary" className="z-10 bg-purple-600 hover:bg-purple-700 shadow-xl shadow-purple-500/20 rounded-full px-8 py-6 text-lg transition-transform hover:scale-105 active:scale-95 ml-4 text-white">
                            <Sparkles className="h-5 w-5 mr-3" />
                            Launch Event
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Create Special Event</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Event Title</label>
                                <Input value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} placeholder="e.g. Weekend Frenzy" />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Event Type</label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                    value={eventForm.type}
                                    onChange={(e) => setEventForm({ ...eventForm, type: e.target.value })}
                                >
                                    <option value="happy_hour">⏰ Happy Hour</option>
                                    <option value="weekend_bonanza">🎊 Weekend Bonanza</option>
                                    <option value="flash_sale">⚡ Flash Sale</option>
                                    <option value="holiday">🎄 Holiday Special</option>
                                </select>
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Multiplier (e.g. 1.5x)</label>
                                <Input type="number" step="0.1" value={eventForm.multiplier} onChange={(e) => setEventForm({ ...eventForm, multiplier: e.target.value })} placeholder="1.5" />
                            </div>
                            <div className="grid gap-2">
                                <label className="text-sm font-medium">Description</label>
                                <Textarea value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} placeholder="Event details..." />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">Start Time</label>
                                    <Input type="datetime-local" value={eventForm.start_time} onChange={(e) => setEventForm({ ...eventForm, start_time: e.target.value })} />
                                </div>
                                <div className="grid gap-2">
                                    <label className="text-sm font-medium">End Time</label>
                                    <Input type="datetime-local" value={eventForm.end_time} onChange={(e) => setEventForm({ ...eventForm, end_time: e.target.value })} />
                                </div>
                            </div>

                            <div className="flex items-center space-x-2 mt-2 p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                                <Switch id="event-announce" checked={eventForm.announce} onCheckedChange={(c) => setEventForm({ ...eventForm, announce: c })} />
                                <Label htmlFor="event-announce" className="text-sm font-medium cursor-pointer">
                                    Auto-Announce (Trigger Popup)
                                </Label>
                            </div>

                            <Button onClick={() => createEventMutation.mutate()} disabled={createEventMutation.isPending} className="w-full mt-4 bg-purple-600 hover:bg-purple-700 text-white">
                                {createEventMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Launch Event 🚀"}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Global Announcement Editor (AI Powered) */}
            <Card className="bg-black/40 border-purple-500/20 shadow-2xl backdrop-blur-xl overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-pink-500" />
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <Megaphone className="w-6 h-6 text-purple-400" />
                            Global Pop-up Announcement
                        </CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">Broadcast important news to all players on sign-in.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-full border border-white/5">
                            <Label htmlFor="announce-active" className="text-xs font-medium text-purple-200">Live Status</Label>
                            <Switch
                                id="announce-active"
                                checked={announcement?.enabled || false}
                                onCheckedChange={(checked: boolean) => updateAnnouncement('enabled', checked)}
                                className="data-[state=checked]:bg-purple-500"
                            />
                        </div>
                        <Button
                            onClick={() => updateConfigMutation.mutate(announcement)}
                            disabled={updateConfigMutation.isPending}
                            className="bg-purple-600 hover:bg-purple-700"
                        >
                            {updateConfigMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            Save Changes
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* AI Generator Bar */}
                    <div className="bg-gradient-to-r from-purple-900/20 to-blue-900/20 p-4 rounded-xl border border-purple-500/10 flex flex-col md:flex-row items-center gap-4">
                        <div className="flex items-center gap-2 text-purple-300 font-mono text-sm shrink-0">
                            <Sparkles className="w-4 h-4" />
                            AI CONTENT GEN
                        </div>
                        <div className="flex gap-2 w-full">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => generateAI('tournament')}
                                disabled={isGeneratingAI}
                                className="flex-1 bg-black/30 border-purple-500/30 hover:bg-purple-500/20 text-purple-200"
                            >
                                {isGeneratingAI ? <Loader2 className="w-3 h-3 animate-spin" /> : "🏆 Tournament Promo"}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => generateAI('win')}
                                disabled={isGeneratingAI}
                                className="flex-1 bg-black/30 border-yellow-500/30 hover:bg-yellow-500/20 text-yellow-200"
                            >
                                {isGeneratingAI ? <Loader2 className="w-3 h-3 animate-spin" /> : "💰 Big Win Alert"}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => generateAI('event')}
                                disabled={isGeneratingAI}
                                className="flex-1 bg-black/30 border-blue-500/30 hover:bg-blue-500/20 text-blue-200"
                            >
                                {isGeneratingAI ? <Loader2 className="w-3 h-3 animate-spin" /> : "🎉 Holiday Event"}
                            </Button>
                        </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Headline</Label>
                                <Input
                                    value={announcement?.title || ''}
                                    onChange={(e) => updateAnnouncement('title', e.target.value)}
                                    className="bg-white/5 border-white/10 font-bold"
                                    placeholder="Make it catchy..."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Message Body</Label>
                                <Textarea
                                    value={announcement?.message || ''}
                                    onChange={(e) => updateAnnouncement('message', e.target.value)}
                                    className="bg-white/5 border-white/10 h-[120px]"
                                    placeholder="Details..."
                                />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Image URL</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={announcement?.image_url || ''}
                                        onChange={(e) => updateAnnouncement('image_url', e.target.value)}
                                        className="bg-white/5 border-white/10"
                                        placeholder="https://..."
                                    />
                                    <Button
                                        size="icon"
                                        variant="outline"
                                        className="border-purple-500/50 hover:bg-purple-500/10 text-purple-400 shrink-0"
                                        onClick={() => generateImage('poster')}
                                        disabled={isGeneratingAI}
                                        title="Generate AI Image"
                                    >
                                        <Sparkles className="w-4 h-4" />
                                    </Button>
                                    <div className="relative">
                                        <Input
                                            type="file"
                                            id="img-upload"
                                            className="hidden"
                                            accept="image/*"
                                            onChange={(e) => {
                                                if (e.target.files?.[0]) handleImageUpload(e.target.files[0]);
                                            }}
                                        />
                                        <Button
                                            size="icon"
                                            variant="outline"
                                            className="border-white/20 hover:bg-white/10 shrink-0"
                                            onClick={() => document.getElementById('img-upload')?.click()}
                                            disabled={isGeneratingAI}
                                            title="Upload Image"
                                        >
                                            <div className="w-4 h-4 flex items-center justify-center font-bold">↑</div>
                                        </Button>
                                    </div>
                                </div>
                                {announcement.image_url && (
                                    <div className="w-full h-40 rounded-xl overflow-hidden border border-white/20 mt-2 relative group">
                                        <img src={announcement.image_url} alt="Preview" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <p className="text-xs text-white">Preview</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Action Text</Label>
                                    <Input
                                        value={announcement?.action_text || ''}
                                        onChange={(e) => updateAnnouncement('action_text', e.target.value)}
                                        className="bg-white/5 border-white/10"
                                        placeholder="Join Now"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Action URL</Label>
                                    <Input
                                        value={announcement?.action_url || ''}
                                        onChange={(e) => updateAnnouncement('action_url', e.target.value)}
                                        className="bg-white/5 border-white/10"
                                        placeholder="https://t.me/..."
                                    />
                                </div>
                            </div>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => updateAnnouncement('id', crypto.randomUUID())}
                                className="w-full mt-2"
                            >
                                <RefreshCw className="w-3 h-3 mr-2" />
                                Reset View History (Show to everyone again)
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tournament List (Existing) */}
            <div className="space-y-4">
                <h2 className="text-2xl font-bold flex items-center gap-2 px-2">
                    <Trophy className="w-6 h-6 text-green-600" />
                    Automated Tournaments
                </h2>
                <div className="grid gap-6">
                    {isLoading ? <div>Loading tournaments...</div> : data?.tournaments?.map((t) => {
                        // ...
                        const now = new Date();
                        const end = new Date(t.end_time);
                        const isEnded = now > end || t.status === 'completed';
                        const diff = end.getTime() - now.getTime();
                        const hours = Math.floor(diff / (1000 * 60 * 60));
                        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

                        const statusColors: Record<string, string> = {
                            scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
                            active: 'bg-green-100 text-green-800 border-green-200 animate-pulse',
                            completed: 'bg-gray-100 text-gray-800 border-gray-200',
                            cancelled: 'bg-red-100 text-red-800 border-red-200',
                            ended: 'bg-red-100 text-red-800 border-red-200'
                        };

                        const displayStatus = isEnded ? 'ended' : t.status;

                        return (
                            <Card key={t.id} className={`group hover:shadow-lg transition-all border-l-4 ${isEnded ? 'opacity-60 grayscale-[0.5]' : 'border-l-green-500 hover:border-l-green-600'}`}>
                                <CardContent className="p-6 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-xl font-bold">{t.title}</h3>
                                            <Badge variant="outline" className={statusColors[displayStatus] || ''}>
                                                {(displayStatus || '').toUpperCase()}
                                            </Badge>
                                            {!isEnded && t.status === 'active' && (
                                                <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200 font-mono">
                                                    <Clock className="w-3 h-3 mr-1" />
                                                    Ends in: {hours}h {mins}m
                                                </Badge>
                                            )}
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
                                                {(t.prize_pool || 0).toLocaleString()}
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Entry</div>
                                            <div className="text-xl font-bold">{(t.entry_fee || 0) > 0 ? t.entry_fee : 'FREE'}</div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        {!isEnded && t.status !== 'completed' && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-orange-600 border-orange-200 hover:bg-orange-50"
                                                onClick={() => handleAction('tournaments', t.id, 'end')}
                                            >
                                                End Now
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => handleAction('tournaments', t.id, 'delete')}
                                        >
                                            Delete
                                        </Button>
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

            {/* Special Events List */}
            <div className="space-y-4">
                <hr className="border-white/5 my-8" />
                <h2 className="text-2xl font-bold flex items-center gap-2 px-2">
                    <Sparkles className="w-6 h-6 text-purple-600" />
                    Special Events & Multipliers
                </h2>
                <div className="grid gap-6">
                    {isEventsLoading ? <div>Loading events...</div> : eventsData?.events?.map((e: any) => {
                        const now = new Date();
                        const end = new Date(e.end_time);
                        const isEnded = now > end || e.status === 'ended';
                        const diff = end.getTime() - now.getTime();
                        const hours = Math.floor(diff / (1000 * 60 * 60));
                        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

                        const statusColors: Record<string, string> = {
                            active: 'bg-green-100 text-green-800 border-green-200 animate-pulse',
                            scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
                            ended: 'bg-red-100 text-red-800 border-red-200',
                            completed: 'bg-gray-100 text-gray-800 border-gray-200'
                        };

                        const displayStatus = isEnded ? 'ended' : e.status;

                        return (
                            <Card key={e.id} className={`group hover:shadow-lg transition-all border-l-4 ${isEnded ? 'opacity-60 grayscale-[0.5]' : 'border-l-purple-500 hover:border-l-purple-600'}`}>
                                <CardContent className="p-6 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-xl font-bold">{e.title}</h3>
                                            <Badge variant="outline" className={statusColors[displayStatus] || ''}>
                                                {(displayStatus || '').toUpperCase()}
                                            </Badge>
                                            {!isEnded && e.status === 'active' && (
                                                <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200 font-mono">
                                                    <Clock className="w-3 h-3 mr-1" />
                                                    Ends in: {hours}h {mins}m
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-muted-foreground text-sm line-clamp-1">{e.description}</p>

                                        <div className="flex items-center gap-6 text-sm text-foreground/80 pt-2">
                                            <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded">
                                                <Calendar className="w-4 h-4 text-purple-600" />
                                                <span className="font-mono">{format(new Date(e.start_time), 'MMM d, HH:mm')}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="w-4 h-4 text-muted-foreground" />
                                                <span>Ends: {format(new Date(e.end_time), 'MMM d, HH:mm')}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-8 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-8 w-full md:w-auto mt-4 md:mt-0">
                                        <div className="text-center">
                                            <div className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Benefit</div>
                                            <div className="text-2xl font-black text-purple-600 flex items-center justify-center">
                                                <Sparkles className="w-5 h-5 mr-1" />
                                                {e.multiplier}x Multiplier
                                            </div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-sm text-muted-foreground uppercase tracking-wider mb-1">Type</div>
                                            <div className="text-xl font-bold capitalize">{e.type.replace('_', ' ')}</div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        {!isEnded && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-orange-600 border-orange-200 hover:bg-orange-50"
                                                onClick={() => handleAction('events', e.id, 'end')}
                                            >
                                                End Now
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => handleAction('events', e.id, 'delete')}
                                        >
                                            Delete
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}

                    {eventsData?.events?.length === 0 && (
                        <div className="text-center p-12 bg-muted/20 rounded-3xl border border-dashed">
                            <Sparkles className="mx-auto h-12 w-12 text-muted-foreground mb-4 opacity-30" />
                            <h3 className="font-medium text-xl">No Special Events Scheduled</h3>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

