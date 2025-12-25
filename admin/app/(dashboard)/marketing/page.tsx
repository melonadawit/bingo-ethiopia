'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAdmin } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Megaphone, Plus, Send, Wand2, Users, Rocket, ExternalLink, X, Clock, Calendar, ArrowRight, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { TelegramEditor } from '@/components/telegram-editor';
import { PhonePreview } from '@/components/phone-preview';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AICopywriter } from '@/components/ai-copywriter';
import { HeatmapSelector } from '@/components/heatmap-selector';

interface Campaign {
    id: string;
    name: string;
    status: string;
    sent_count: number;
    created_at: string;
    message_template?: string;
    button_text?: string;
}

const CAMPAIGN_TEMPLATES = [
    { label: 'Welcome Bonus 🎁', text: "👋 Welcome to Bingo Ethiopia!\n\nHere is your starter bonus. Play your first game now!", btn: "Claim Bonus" },
    { label: 'Weekend Reload 🔄', text: "🚀 Weekend Special!\n\nDeposit 100 ETB and get 10% Extra. Limited time only!", btn: "Deposit Now" },
    { label: 'New Game Mode 🎮', text: "🔥 Mulu Zig is here!\n\nThe new high-stakes mode is live. Can you handle it?", btn: "Play Now" },
];

export default function MarketingPage() {
    const queryClient = useQueryClient();
    const [isCreating, setIsCreating] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [message, setMessage] = useState('');
    const [btnText, setBtnText] = useState('');
    const [segment, setSegment] = useState('all');

    const sendMutation = useMutation({
        mutationFn: async (id: string) => fetchAdmin(`/marketing/campaigns/${id}/send`, { method: 'POST' }),
        onSuccess: () => {
            toast.success('Campaign sent to bot loop');
            queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
        },
        onError: () => toast.error('Failed to send campaign')
    });

    const { data: campaigns, isLoading } = useQuery<{ campaigns: Campaign[] }>({
        queryKey: ['marketing-campaigns'],
        queryFn: () => fetchAdmin('/marketing/campaigns'),
    });

    const createMutation = useMutation({
        mutationFn: async () => {
            return fetchAdmin('/marketing/campaigns', {
                method: 'POST',
                body: JSON.stringify({
                    name,
                    status: 'draft',
                    message_template: message,
                    button_text: btnText,
                    // segment logic would go here
                })
            });
        },
        onSuccess: () => {
            setIsCreating(false);
            setName('');
            setMessage('');
            setBtnText('');
            toast.success('Campaign draft created');
            queryClient.invalidateQueries({ queryKey: ['marketing-campaigns'] });
        }
    });

    const applyTemplate = (val: string) => {
        const t = CAMPAIGN_TEMPLATES.find(t => t.label === val);
        if (t) {
            setMessage(t.text);
            setBtnText(t.btn);
        }
    };

    return (
        <div className="space-y-6 pb-20 relative">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-gradient-to-br from-purple-500/5 to-pink-500/5 p-8 rounded-3xl border border-white/10 shadow-xl backdrop-blur-3xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

                <div className="z-10">
                    <h1 className="text-4xl font-extrabold tracking-tight text-foreground">Marketing Hub</h1>
                    <p className="text-muted-foreground mt-2 text-lg max-w-xl">Create immersive campaigns specifically designed for Telegram interactions.</p>
                </div>
                {!isCreating && (
                    <Button onClick={() => setIsCreating(true)} size="lg" className="z-10 bg-purple-600 hover:bg-purple-700 shadow-xl shadow-purple-500/20 rounded-full px-8 py-6 text-lg transition-transform hover:scale-105 active:scale-95">
                        <Plus className="h-5 w-5 mr-3" />
                        Create Campaign
                    </Button>
                )}
            </div>

            {/* Drip Sequence Visualizer */}
            <Card className="bg-black/30 border-white/10 backdrop-blur pb-6 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <Zap className="w-32 h-32" />
                </div>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-orange-400" />
                        Active Drip Sequences
                    </CardTitle>
                    <CardDescription>Visual timeline of automated onboarding messages.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4 overflow-x-auto pb-4">
                        {/* Step 1 */}
                        <div className="flex-1 min-w-[200px] relative">
                            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30 relative z-10 hover:bg-purple-500/20 transition-colors cursor-pointer group">
                                <Badge className="mb-2 bg-purple-500">Day 0</Badge>
                                <h3 className="font-bold text-white mb-1 group-hover:text-purple-300">Welcome Bonus</h3>
                                <p className="text-xs text-muted-foreground">Sent immediately after signup.</p>
                            </div>
                            <ArrowRight className="absolute -right-6 top-1/2 -translate-y-1/2 text-white/20 w-8 h-8 z-0" />
                        </div>

                        {/* Step 2 */}
                        <div className="flex-1 min-w-[200px] relative">
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10 relative z-10 hover:border-purple-500/50 transition-colors cursor-pointer group">
                                <Badge variant="outline" className="mb-2 text-white/50 border-white/20">Day 2</Badge>
                                <h3 className="font-bold text-white mb-1 group-hover:text-purple-300">How to Play</h3>
                                <p className="text-xs text-muted-foreground">Video tutorial link.</p>
                            </div>
                            <ArrowRight className="absolute -right-6 top-1/2 -translate-y-1/2 text-white/20 w-8 h-8 z-0" />
                        </div>

                        {/* Step 3 */}
                        <div className="flex-1 min-w-[200px] relative">
                            <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30 relative z-10 hover:bg-orange-500/20 transition-colors cursor-pointer group">
                                <Badge className="mb-2 bg-orange-500">Day 5</Badge>
                                <h3 className="font-bold text-white mb-1 group-hover:text-orange-300">Deposit Match</h3>
                                <p className="text-xs text-muted-foreground">50% extra on first deposit.</p>
                            </div>
                            <ArrowRight className="absolute -right-6 top-1/2 -translate-y-1/2 text-white/20 w-8 h-8 z-0" />
                        </div>

                        {/* Step 4 */}
                        <div className="flex-1 min-w-[200px] relative">
                            <div className="p-4 rounded-xl bg-white/5 border border-dashed border-white/20 relative z-10 flex flex-col items-center justify-center text-center py-8 hover:bg-white/10 transition-colors cursor-pointer text-muted-foreground hover:text-white">
                                <Plus className="w-8 h-8 mb-2 opacity-50" />
                                <span className="text-xs font-bold uppercase tracking-wider">Add Step</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Creation Area - Split View */}
            <AnimatePresence>
                {isCreating && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="grid lg:grid-cols-2 gap-8 items-start mb-12">
                            {/* Left: Editor */}
                            <Card className="border-none shadow-2xl bg-card/50 backdrop-blur-md">
                                <CardHeader className="border-b bg-muted/20 pb-4">
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="text-xl flex items-center">
                                            <Wand2 className="w-5 h-5 mr-2 text-purple-500" />
                                            Campaign Editor
                                        </CardTitle>
                                        <Button variant="ghost" size="icon" onClick={() => setIsCreating(false)}>
                                            <X className="w-5 h-5" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6 p-6">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold">Campaign Name</label>
                                            <Input placeholder="e.g. October Fest" value={name} onChange={(e) => setName(e.target.value)} className="bg-background/50" />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold flex items-center"><Users className="w-3 h-3 mr-1" /> Audience</label>
                                                <Select value={segment} onValueChange={setSegment}>
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">Every User</SelectItem>
                                                        <SelectItem value="depositors">Active Players</SelectItem>
                                                        <SelectItem value="vip">VIPs</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold flex items-center"><Rocket className="w-3 h-3 mr-1" /> Template</label>
                                                <Select onValueChange={applyTemplate}>
                                                    <SelectTrigger className="bg-purple-500/10 border-purple-500/20 text-purple-500"><SelectValue placeholder="Pick one..." /></SelectTrigger>
                                                    <SelectContent>
                                                        {CAMPAIGN_TEMPLATES.map(t => <SelectItem key={t.label} value={t.label}>{t.label}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold flex items-center justify-between">
                                                <span>Message</span>
                                                <AICopywriter onGenerate={setMessage} />
                                            </label>
                                            <TelegramEditor value={message} onChange={setMessage} minHeight="240px" />
                                        </div>

                                        <div className="pt-4 border-t border-white/5">
                                            <HeatmapSelector onSelect={(c) => console.log(c)} />
                                        </div>

                                        <div className="space-y-4 pt-4 border-t border-white/5">
                                            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Rich Media & Actions</h3>

                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold flex items-center">
                                                    <ExternalLink className="w-3 h-3 mr-1" /> Media Attachment (URL)
                                                </label>
                                                <Input
                                                    placeholder="https://example.com/image.jpg"
                                                    className="bg-background/50 font-mono text-xs"
                                                />
                                                <p className="text-[10px] text-muted-foreground">Supported: JPG, PNG, MP4. content will be sent as caption.</p>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold flex items-center">
                                                    <Rocket className="w-3 h-3 mr-1" /> Action Buttons
                                                </label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <Input
                                                        placeholder="Button Label (e.g. Play Now)"
                                                        value={btnText}
                                                        onChange={(e) => setBtnText(e.target.value)}
                                                    />
                                                    <Input
                                                        placeholder="Action URL (e.g. https://...)"
                                                        className="font-mono text-xs"
                                                    />
                                                </div>
                                                <Button variant="outline" size="sm" className="w-full border-dashed border-white/20 text-muted-foreground hover:text-white">
                                                    <Plus className="w-3 h-3 mr-1" /> Add Another Button
                                                </Button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t flex gap-3 justify-end">
                                        <Button variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
                                        <Button size="lg" onClick={() => createMutation.mutate()} disabled={!name} className="bg-purple-600 hover:bg-purple-700 w-full sm:w-auto">
                                            Create Draft
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Right: Preview (Sticky) */}
                            <div className="hidden lg:block sticky top-6">
                                <div className="text-center mb-4 text-sm text-foreground/50 font-medium uppercase tracking-widest">
                                    LIVE PREVIEW
                                </div>
                                <PhonePreview
                                    message={message}
                                    buttonText={btnText}
                                    title="BingoBot"
                                />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Campaign List */}
            <h2 className="text-xl font-bold mt-12 mb-6 px-1 flex items-center">
                Recently Active
                <Badge variant="secondary" className="ml-3 rounded-full">{campaigns?.campaigns?.length || 0}</Badge>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? [1, 2, 3].map(i => <div key={i} className="h-48 bg-muted/20 animate-pulse rounded-xl" />) :
                    campaigns?.campaigns?.map((campaign) => (
                        <motion.div
                            key={campaign.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="group"
                        >
                            <Card className="hover:shadow-2xl transition-all duration-300 border-none bg-card/80 backdrop-blur hover:-translate-y-1 overflow-hidden">
                                <CardHeader className="flex flex-row items-start justify-between pb-2">
                                    <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-2xl group-hover:bg-purple-200 dark:group-hover:bg-purple-800/50 transition-colors">
                                        <Megaphone className="h-6 w-6 text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform" />
                                    </div>
                                    <Badge variant="outline" className={cn(
                                        "uppercase text-[10px] tracking-wider",
                                        campaign.status === 'completed' ? "bg-green-100 text-green-700 border-green-200" : "bg-yellow-100 text-yellow-700 border-yellow-200"
                                    )}>
                                        {campaign.status}
                                    </Badge>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <CardTitle className="text-lg font-bold mb-1 line-clamp-1">{campaign.name}</CardTitle>
                                        <CardDescription className="text-xs font-mono">
                                            {format(new Date(campaign.created_at), 'MMM d, h:mm a')}
                                        </CardDescription>
                                    </div>

                                    <div className="flex justify-between items-end border-t border-border/50 pt-4">
                                        <div className="text-center">
                                            <div className="text-2xl font-bold">{campaign.sent_count}</div>
                                            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Recipients</div>
                                        </div>

                                        {campaign.status === 'draft' ? (
                                            <Button
                                                size="sm"
                                                onClick={() => sendMutation.mutate(campaign.id)}
                                                className="bg-foreground text-background rounded-full px-6 hover:scale-105 transition-transform"
                                            >
                                                Launch <Rocket className="w-3 h-3 ml-2" />
                                            </Button>
                                        ) : (
                                            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
                                                Details <ExternalLink className="w-3 h-3 ml-1" />
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
            </div>
        </div >
    );
}
