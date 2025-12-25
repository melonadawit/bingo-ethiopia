'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAdmin } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Save, Loader2, RotateCcw, AlertTriangle, ArrowRight, Upload, GripVertical, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { TelegramEditor } from '@/components/telegram-editor';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';

interface BotConfig {
    key: string;
    value: string;
    description: string;
    category: string;
}

// Fixed Flow Definitions (This maps keys to visual flows)
const FLOW_DEFINITIONS = {
    onboarding: [
        { key: 'welcome_message', label: 'Welcome (Start)', desc: 'First message sent to new users' },
        { key: 'referral_message', label: 'Referral Invite', desc: 'Message when sharing invite link' },
    ],
    deposit: [
        { key: 'msg_dep_start', label: 'Step 1: Ask Amount', desc: 'Prompt asking how much to deposit' },
        { key: 'msg_dep_method', label: 'Step 2: Choose Method', desc: 'Selection for CBE/Telebirr' },
        { key: 'msg_dep_instructions', label: 'Step 3: Payment Info', desc: 'Displaying account number' },
        { key: 'msg_dep_confirm', label: 'Step 4: Confirmation', desc: 'Asking for reference number' },
        { key: 'msg_dep_success', label: 'Step 5: Success', desc: 'Deposit credited notification' },
    ],
    withdrawal: [
        { key: 'msg_wd_start', label: 'Step 1: Ask Amount', desc: 'Prompt asking how much to withdraw' },
        { key: 'msg_wd_bank', label: 'Step 2: Bank Details', desc: 'Asking for bank account info' },
        { key: 'msg_wd_pending', label: 'Step 3: Processing', desc: 'Withdrawal request received' },
        { key: 'msg_wd_success', label: 'Step 4: Approved', desc: 'Money sent notification' },
    ],
    game: [
        { key: 'msg_game_waiting', label: 'Lobby Waiting', desc: 'Waiting for players to join' },
        { key: 'msg_game_start', label: 'Game Started', desc: 'Bingo start announcement' },
        { key: 'msg_game_win', label: 'Winner Announcement', desc: 'When someone says BINGO' },
    ]
};

export default function BotPage() {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('onboarding');

    // Server State
    const { data, isLoading } = useQuery({
        queryKey: ['bot-configs'],
        queryFn: () => fetchAdmin('/bot/config'),
    });

    // Local State
    const [localConfigs, setLocalConfigs] = useState<Record<string, string>>({});
    const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set());

    // Sync server data
    useEffect(() => {
        if (data?.configs) {
            const initial: Record<string, string> = {};
            data.configs.forEach((c: BotConfig) => {
                if (!dirtyKeys.has(c.key)) {
                    initial[c.key] = c.value;
                }
            });
            setLocalConfigs(prev => ({ ...prev, ...initial }));
        }
    }, [data, dirtyKeys]);

    const handleChange = (key: string, newValue: string) => {
        setLocalConfigs(prev => ({ ...prev, [key]: newValue }));
        setDirtyKeys(prev => {
            const next = new Set(prev);
            next.add(key);
            return next;
        });
    };

    const mutation = useMutation({
        mutationFn: async (updates: { key: string, value: string }[]) => {
            return fetchAdmin('/bot/config', {
                method: 'POST',
                body: JSON.stringify({ updates })
            });
        },
        onSuccess: () => {
            toast.success('Configuration saved successfully');
            setDirtyKeys(new Set());
            queryClient.invalidateQueries({ queryKey: ['bot-configs'] });
        },
        onError: () => toast.error('Failed to save changes')
    });

    const handleSaveAll = () => {
        const updates = Array.from(dirtyKeys).map(key => ({ key, value: localConfigs[key] }));
        if (updates.length > 0) mutation.mutate(updates);
    };

    const handleDiscard = () => {
        if (confirm('Discard all unsaved changes?')) {
            setDirtyKeys(new Set());
            if (data?.configs) {
                const initial: Record<string, string> = {};
                data.configs.forEach((c: BotConfig) => initial[c.key] = c.value);
                setLocalConfigs(initial);
            }
        }
    };

    const hasChanges = dirtyKeys.size > 0;

    if (isLoading) return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

    const renderFlowStep = (step: any, index: number) => {
        const value = localConfigs[step.key] || '';
        const isDirty = dirtyKeys.has(step.key);

        return (
            <div key={step.key} className="relative pl-8 pb-8 border-l-2 border-dashed border-white/10 last:border-0">
                <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-blue-500 border-4 border-[#0a0a0a]" />
                <div className={cn(
                    "flex flex-col gap-4 p-4 rounded-xl border transition-all",
                    isDirty ? "bg-blue-500/5 border-blue-500/50" : "bg-white/5 border-white/10 hover:border-white/20"
                )}>
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Step {index + 1}</div>
                            <h3 className="font-bold text-white text-lg">{step.label}</h3>
                            <p className="text-sm text-muted-foreground">{step.desc}</p>
                        </div>
                        {isDirty && <Badge className="bg-blue-500">Modified</Badge>}
                    </div>

                    <TelegramEditor
                        value={value}
                        onChange={(val) => handleChange(step.key, val)}
                        minHeight="100px"
                        variables={
                            activeTab === 'deposit' ? ['amount', 'method', 'account_no'] :
                                activeTab === 'withdrawal' ? ['amount', 'bank', 'fee', 'net_amount'] :
                                    activeTab === 'game' ? ['winner', 'win_amount', 'game_id', 'pot_size'] :
                                        ['username', 'first_name', 'balance']
                        }
                    />

                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="h-7 text-xs border-white/10">
                            <Plus className="w-3 h-3 mr-1" /> Add Button
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 text-xs border-white/10">
                            <Upload className="w-3 h-3 mr-1" /> Attach Media
                        </Button>
                    </div>
                </div>
                {index < (FLOW_DEFINITIONS[activeTab as keyof typeof FLOW_DEFINITIONS]?.length || 0) - 1 && (
                    <div className="absolute left-[-11px] bottom-[-10px] text-white/20">
                        <ArrowRight className="w-5 h-5 rotate-90" />
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-8 relative max-w-6xl mx-auto pb-40">
            {/* Header */}
            <div className="flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-xl z-40 py-6 border-b">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-600">Bot Logic Studio</h1>
                    <p className="text-muted-foreground mt-1">Design and re-arrange conversation flows.</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="ghost"
                        onClick={handleDiscard}
                        disabled={!hasChanges}
                    >
                        Discard
                    </Button>
                    <Button
                        onClick={handleSaveAll}
                        disabled={!hasChanges}
                        className={cn(hasChanges ? "bg-blue-600" : "opacity-50")}
                    >
                        {mutation.isPending ? <Loader2 className="animate-spin" /> : <Save className="mr-2 w-4 h-4" />}
                        Save Changes
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="onboarding" value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full justify-start h-12 bg-black/40 p-1 mb-8 overflow-x-auto">
                    <TabsTrigger value="onboarding" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white h-10 px-6">Onboarding</TabsTrigger>
                    <TabsTrigger value="deposit" className="data-[state=active]:bg-green-600 data-[state=active]:text-white h-10 px-6">Deposit Flow</TabsTrigger>
                    <TabsTrigger value="withdrawal" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white h-10 px-6">Withdrawal Flow</TabsTrigger>
                    <TabsTrigger value="game" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white h-10 px-6">Game Events</TabsTrigger>
                    <TabsTrigger value="other" className="data-[state=active]:bg-gray-600 data-[state=active]:text-white h-10 px-6">Other Configs</TabsTrigger>
                </TabsList>

                <TabsContent value="onboarding" className="mt-0">
                    <Card className="border-none bg-transparent">
                        <CardContent className="p-0 space-y-2">
                            {FLOW_DEFINITIONS.onboarding.map((step, i) => renderFlowStep(step, i))}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="deposit" className="mt-0">
                    <Card className="border-none bg-transparent">
                        <CardContent className="p-0 space-y-2">
                            {FLOW_DEFINITIONS.deposit.map((step, i) => renderFlowStep(step, i))}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="withdrawal" className="mt-0">
                    <Card className="border-none bg-transparent">
                        <CardContent className="p-0 space-y-2">
                            {FLOW_DEFINITIONS.withdrawal.map((step, i) => renderFlowStep(step, i))}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="game" className="mt-0">
                    <Card className="border-none bg-transparent">
                        <CardContent className="p-0 space-y-2">
                            {FLOW_DEFINITIONS.game.map((step, i) => renderFlowStep(step, i))}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="other" className="mt-0">
                    <Card className="bg-black/20 border-white/10">
                        <CardHeader>
                            <CardTitle>Global Settings</CardTitle>
                            <CardDescription>Miscellaneous configuration keys.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-4">
                            {/* Render anything not in flows */}
                            {data?.configs
                                ?.filter((c: BotConfig) =>
                                    !Object.values(FLOW_DEFINITIONS).flat().some(f => f.key === c.key)
                                )
                                .map((c: BotConfig) => (
                                    <div key={c.key} className="grid gap-2">
                                        <label className="text-sm font-bold">{c.key}</label>
                                        <Input
                                            value={localConfigs[c.key] || c.value}
                                            onChange={(e) => handleChange(c.key, e.target.value)}
                                            className="bg-white/5"
                                        />
                                    </div>
                                ))
                            }
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
