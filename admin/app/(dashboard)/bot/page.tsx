'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAdmin } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Save, Loader2, RotateCcw, AlertTriangle, ArrowRight, Upload, GripVertical, Plus, Shield, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { TelegramEditor } from '@/components/telegram-editor';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion-impl"
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
// Fixed Flow Definitions (This maps keys to visual flows)
const FLOW_DEFINITIONS = {
    onboarding: [
        { key: 'botFlows.onboarding.welcome', label: 'Welcome Message', desc: 'First message sent to new users', default: '👋 Welcome to Bingo Ethiopia!' },
        { key: 'botFlows.referral.share_message', label: 'Referral Invite', desc: 'Message when sharing invite link. Use {link} for the invite URL.', default: '🔗 Invite your friends to Online Bingo and earn rewards!\n\n🎁 {link}' },
    ],
    deposit: [
        { key: 'prompts.depositAmount', label: 'Step 1: Ask Amount', desc: 'Prompt asking how much to deposit', default: '💰 ማስገባት የሚፈልጉትን መጠን ከ10 ብር ጀምሮ ያስገቡ።' },

        { key: 'prompts.selectDepositBank', label: 'Step 2: Choose Method', desc: 'Selection for CBE/Telebirr', default: 'እባክዎት ማስገባት የሚፈልጉበትን ባንክ ይምረጡ።' },
        { key: 'prompts.depositInstructionFooter', label: 'Step 3: Instructions & Contact Info', desc: 'Combined instructions and support contact', default: 'የሚያጋጥማቹ የክፍያ ችግር:\n@onlineetbingosupport\n@onlineetbingosupport1 ላይ ፃፉልን።\n\n2. የከፈሉበትን አጭር የጹሁፍ መልዕክት(message) copy በማድረግ እዚ ላይ Past አድረገው ያስገቡና ይላኩት👇👇👇' },
        { key: 'prompts.depositPending', label: 'Step 4: Pending Message', desc: 'Message after receipt submission', default: '✅ Your deposit Request have been sent to admins please wait 1 min.' },
        { key: 'prompts.depositApproved', label: 'Step 5: Success Message', desc: 'Notification when admin approves', default: '✅ Your deposit of {amount} ETB is confirmed.\n🧾 Ref: {ref}' },
        { key: 'prompts.depositDeclined', label: 'Failure Message', desc: 'Notification when admin declines', default: '❌ Your deposit of {amount} ETB is Declined.' },
    ],
    withdrawal: [
        { key: 'prompts.withdrawAmount', label: 'Step 1: Ask Amount', desc: 'Prompt asking how much to withdraw', default: '💰 ማውጣት የሚፈልጉትን የገንዘብ መጠን ያስገቡ ?' },
        { key: 'prompts.withdrawMinError', label: 'Error: Min Amount', desc: 'Error when amount is too low', default: 'ዝቅተኛው ማውጣት የምትችሉት መጠን {min} ብር ነው።' },
        { key: 'prompts.withdrawMaxError', label: 'Error: Max Amount', desc: 'Error when amount is too high', default: 'ከፍተኛው ማውጣት የምትችሉት መጠን {max}ብር ነው።' },
        { key: 'prompts.withdrawBalanceError', label: 'Error: Low Balance', desc: 'Error when balance is insufficient', default: '❌ በቂ ባላንስ የለዎትም!\n\n💳 የእርስዎ ባላንስ: {balance} ብር\n💰 የጠየቁት መጠን: {amount} ብር' },
        { key: 'prompts.selectWithdrawBank', label: 'Step 2: Choose Bank', desc: 'Prompt to select withdrawal bank', default: 'እባክዎን የሚያወጡበትን ባንክ ይምረጡ' },
        { key: 'prompts.enterPhone', label: 'Step 3: Enter Phone', desc: 'Prompt for Telebirr number', default: 'እባክዎን ስልክ ቁጥርን ያስገቡ' },
        { key: 'prompts.enterAccount', label: 'Step 3: Enter Account', desc: 'Prompt for Bank Account', default: 'እባክዎን አካውንት ቁጥርን ያስገቡ' },
        { key: 'prompts.withdrawPending', label: 'Step 4: Pending Message', desc: 'Message after request submission', default: '✅ Your withdrawal Request have been sent to admins please wait 1 min.' },
        { key: 'prompts.withdrawApproved', label: 'Step 5: Success Message', desc: 'Notification when admin approves', default: '✅ Your withdrawal of {amount} ETB is confirmed.\n🧾 Ref: {ref}' },
        { key: 'prompts.withdrawDeclined', label: 'Failure Message', desc: 'Notification when admin declines', default: '❌ Withdrawal Declined...' },
    ],
    game: [
        { key: 'botFlows.game.waiting', label: 'Lobby Waiting', desc: 'Waiting for players to join' },
        { key: 'botFlows.game.start', label: 'Game Started', desc: 'Bingo start announcement' },
        { key: 'botFlows.game.win', label: 'Winner Announcement', desc: 'When someone says BINGO' },
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
                        placeholder={step.default}
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

                    {/* Dynamic Bank Manager (Injected for Step 2) */}
                    {step.key === 'prompts.selectDepositBank' && (
                        <div className="mt-4 pt-4 border-t border-white/10">
                            <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                <GripVertical className="w-4 h-4 text-muted-foreground" /> Manage Payment Methods
                            </h4>
                            <div className="space-y-2">
                                {(() => {
                                    const raw = localConfigs['botPaymentMethods'];
                                    const defaultMethods = [
                                        { key: 'telebirr', label: 'Telebirr', enabled: true },
                                        { key: 'cbe', label: 'CBE', enabled: true },
                                        { key: 'abyssinia', label: 'Abyssinia', enabled: true },
                                        { key: 'awash', label: 'Awash', enabled: true },
                                    ];

                                    // Parse saved methods or use defaults
                                    const savedMethods = raw ? JSON.parse(raw) : defaultMethods;

                                    // Merge: Ensure all default methods exist in the final list
                                    // If a method exists in saved, use saved state. If not, append default.
                                    const methods = [...savedMethods];
                                    defaultMethods.forEach(def => {
                                        if (!methods.find((m: any) => m.key === def.key)) {
                                            methods.push(def);
                                        }
                                    });

                                    const updateMethods = (newMethods: any[]) => {
                                        handleChange('botPaymentMethods', JSON.stringify(newMethods));
                                    };

                                    return methods.map((m: any, idx: number) => (
                                        <div key={m.key} className="flex items-center gap-3 bg-black/20 p-2 rounded border border-white/5">
                                            <Switch
                                                checked={m.enabled}
                                                onCheckedChange={(checked) => {
                                                    const newM = methods.map((item: any, i: number) =>
                                                        i === idx ? { ...item, enabled: checked } : item
                                                    );
                                                    updateMethods(newM);
                                                }}
                                            />
                                            <Input
                                                value={m.label}
                                                onChange={(e) => {
                                                    const newM = methods.map((item: any, i: number) =>
                                                        i === idx ? { ...item, label: e.target.value } : item
                                                    );
                                                    updateMethods(newM);
                                                }}
                                                className="h-8 text-sm bg-transparent border-transparent focus:bg-black/40 focus:border-white/20"
                                            />
                                            <div className="ml-auto text-xs text-muted-foreground font-mono">{m.key}</div>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>
                    )}
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
                    <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-cyan-600">
                        Bot Logic Studio <Badge variant="outline" className="ml-2 text-xs align-middle">v2.4</Badge>
                    </h1>
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
                    <TabsTrigger value="bank-instructions" className="data-[state=active]:bg-cyan-600 data-[state=active]:text-white h-10 px-6">Bank Instructions</TabsTrigger>
                    <TabsTrigger value="withdrawal" className="data-[state=active]:bg-orange-600 data-[state=active]:text-white h-10 px-6">Withdrawal Flow</TabsTrigger>
                    <TabsTrigger value="game" className="data-[state=active]:bg-purple-600 data-[state=active]:text-white h-10 px-6">Game Events</TabsTrigger>
                    <TabsTrigger value="admins" className="data-[state=active]:bg-red-600 data-[state=active]:text-white h-10 px-6">Admin Access</TabsTrigger>
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

                <TabsContent value="bank-instructions" className="mt-0">
                    <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
                        <CardHeader>
                            <CardTitle>Bank-Specific Deposit Instructions</CardTitle>
                            <CardDescription>Customize the deposit instructions for each payment method. Include account details and support contact info.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {(() => {
                                const raw = localConfigs['botPaymentMethods'];
                                const defaultMethods = [
                                    { key: 'telebirr', label: 'Telebirr', enabled: true },
                                    { key: 'cbe', label: 'CBE', enabled: true },
                                    { key: 'abyssinia', label: 'Abyssinia', enabled: false },
                                    { key: 'awash', label: 'Awash', enabled: true }
                                ];

                                const savedMethods = raw ? JSON.parse(raw) : defaultMethods;
                                const methods = [...savedMethods];
                                defaultMethods.forEach(def => {
                                    if (!methods.find((m: any) => m.key === def.key)) {
                                        methods.push(def);
                                    }
                                });

                                return methods.filter((m: any) => m.enabled).map((method: any) => {
                                    const instructionKey = `methods.${method.key}.instructions.am`;
                                    const value = localConfigs[instructionKey] || '';
                                    const isDirty = dirtyKeys.has(instructionKey);

                                    return (
                                        <div key={method.key} className={cn(
                                            "p-6 rounded-xl border transition-all",
                                            isDirty ? "bg-blue-500/5 border-blue-500/50" : "bg-white/5 border-white/10"
                                        )}>
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                                                    {method.label.charAt(0)}
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-lg">{method.label}</h3>
                                                    <p className="text-xs text-muted-foreground">Deposit instructions for {method.label}</p>
                                                </div>
                                                {isDirty && <Badge variant="outline" className="ml-auto">Modified</Badge>}
                                            </div>
                                            <Textarea
                                                value={value}
                                                onChange={(e) => handleChange(instructionKey, e.target.value)}
                                                placeholder={`የሚያጋጥማቹ የክፍያ ችግር:\n@betesebbingosupport ላይ ፃፉልን።\n\n1. ከታች ባለው የ${method.label} አካውንት {amount} ብር ያስገቡ\n     Account: XXXX\n     Name: Tadese\n\n2. የከፈሉበትን አጭር የጹሁፍ መልዕክት(message) copy በማድረግ እዚ ላይ Past አድረገው ያስገቡና ይላኩት👇👇👇`}
                                                className="min-h-[200px] font-mono text-sm bg-black/40 border-white/10"
                                            />
                                            <p className="text-xs text-muted-foreground mt-2">
                                                💡 Use <code className="bg-white/10 px-1 rounded">{'{amount}'}</code> as a placeholder for the deposit amount
                                            </p>
                                        </div>
                                    );
                                });
                            })()}
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

                <TabsContent value="admins" className="mt-0">
                    <Card className="border-white/10 bg-black/40 backdrop-blur-xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="w-6 h-6 text-red-500" /> Authorized Bot Admins
                            </CardTitle>
                            <CardDescription>
                                These Telegram User IDs will receive payment notifications and have access to the /admin command.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {(() => {
                                const raw = localConfigs['admin_ids'];
                                const adminIds = raw ? JSON.parse(raw) : [123456789]; // Default dummy

                                const updateIds = (newIds: number[]) => {
                                    handleChange('admin_ids', JSON.stringify(newIds));
                                };

                                return (
                                    <div className="space-y-4 max-w-md">
                                        {/* Add New */}
                                        <div className="flex gap-2">
                                            <Input
                                                id="new-admin-id"
                                                placeholder="Enter Telegram User ID (e.g., 123456789)"
                                                type="number"
                                                className="bg-white/5 border-white/10"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        const val = parseInt(e.currentTarget.value);
                                                        if (val && !adminIds.includes(val)) {
                                                            updateIds([...adminIds, val]);
                                                            e.currentTarget.value = '';
                                                        }
                                                    }
                                                }}
                                            />
                                            <Button onClick={() => {
                                                const el = document.getElementById('new-admin-id') as HTMLInputElement;
                                                const val = parseInt(el.value);
                                                if (val && !adminIds.includes(val)) {
                                                    updateIds([...adminIds, val]);
                                                    el.value = '';
                                                }
                                            }}>
                                                <Plus className="w-4 h-4 mr-2" /> Add ID
                                            </Button>
                                        </div>

                                        {/* List */}
                                        <div className="space-y-2">
                                            {adminIds.map((id: number) => (
                                                <div key={id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 group hover:border-white/20">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-mono text-xs">ID</div>
                                                        <span className="font-mono text-lg tracking-wide">{id}</span>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => updateIds(adminIds.filter((x: number) => x !== id))}
                                                        className="text-red-500 hover:bg-red-500/10 opacity-50 group-hover:opacity-100"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                            {adminIds.length === 0 && (
                                                <div className="text-center p-8 text-muted-foreground bg-white/5 rounded-xl border border-dashed border-white/10">
                                                    No admins configured. No one will receive alerts!
                                                </div>
                                            )}
                                        </div>

                                        <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20 text-sm text-blue-300">
                                            <p className="font-bold flex items-center gap-2 mb-1"><AlertTriangle className="w-4 h-4" /> How to find ID?</p>
                                            Ask the potential admin to forward a message to <b>@userinfobot</b> on Telegram to get their numeric ID.
                                        </div>
                                    </div>
                                );
                            })()}
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
