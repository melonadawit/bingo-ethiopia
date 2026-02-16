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
        { key: 'welcome_message', label: 'Welcome Message', desc: 'First message sent to new users', default: '👋 Welcome to Bingo Ethiopia!' },
        { key: 'msg_welcome_back', label: 'Welcome Back', desc: 'Message for returning users', default: '👋 Welcome back! We missed you.' },
        { key: 'msg_reg_success', label: 'Registration Success', desc: 'Sent after successful phone verification', default: '✅ <b>Registration Complete!</b>' },
        { key: 'referral_message', label: 'Referral Invite', desc: 'Message when sharing invite link. Use {link} for the invite URL.', default: '🔗 Invite your friends to Online Bingo and earn rewards!\n\n🎁 {link}' },
    ],
    deposit: [
        { key: 'msg_dep_start', label: 'Step 1: Ask Amount', desc: 'Prompt asking how much to deposit', default: '💰 ማስገባት የሚፈልጉትን መጠን ከ10 ብር ጀምሮ ያስገቡ።' },
        { key: 'msg_dep_method', label: 'Step 2: Choose Method', desc: 'Selection for CBE/Telebirr', default: 'እባክዎት ማስገባት የሚፈልጉበትን ባንክ ይምረጡ።' },
        { key: 'msg_dep_instructions', label: 'Step 3: Instructions & Contact Info', desc: 'Combined instructions and support contact', default: 'የሚያጋጥማቹ የክፍያ ችግር:\n@onlineetbingosupport\n@onlineetbingosupport1 ላይ ፃፉልን።\n\n2. የከፈሉበትን አጭር የጹሁፍ መልዕክት(message) copy በማድረግ እዚ ላይ Past አድረገው ያስገቡና ይላኩት👇👇👇' },
        { key: 'msg_dep_confirm', label: 'Step 4: Pending Message', desc: 'Message after receipt submission', default: '✅ Your deposit Request have been sent to admins please wait 1 min.' },
        { key: 'msg_dep_success', label: 'Step 5: Success Message', desc: 'Notification when admin approves', default: '✅ Your deposit of {amount} ETB is confirmed.\n🧾 Ref: {ref}' },
        { key: 'msg_dep_declined', label: 'Failure Message', desc: 'Notification when admin declines', default: '❌ Your deposit of {amount} ETB is Declined.' },
    ],
    withdrawal: [
        { key: 'msg_wd_start', label: 'Step 1: Ask Amount', desc: 'Prompt asking how much to withdraw', default: '💰 ማውጣት የሚፈልጉትን የገንዘብ መጠን ያስገቡ ?' },
        { key: 'msg_wd_min_err', label: 'Error: Min Amount', desc: 'Error when amount is too low', default: 'ዝቅተኛው ማውጣት የምትችሉት መጠን {min} ብር ነው።' },
        { key: 'msg_wd_max_err', label: 'Error: Max Amount', desc: 'Error when amount is too high', default: 'ከፍተኛው ማውጣት የምትችሉት መጠን {max}ብር ነው።' },
        { key: 'msg_wd_bal_err', label: 'Error: Low Balance', desc: 'Error when balance is insufficient', default: '❌ በቂ ባላንስ የለዎትም!\n\n💳 የእርስዎ ባላንስ: {balance} ብር\n💰 የጠየቁት መጠን: {amount} ብር' },
        { key: 'msg_wd_bank', label: 'Step 2: Choose Bank', desc: 'Prompt to select withdrawal bank', default: 'እባክዎን የሚያወጡበትን ባንክ ይምረጡ' },
        { key: 'msg_wd_phone', label: 'Step 3: Enter Phone', desc: 'Prompt for Telebirr number', default: 'እባክዎን ስልክ ቁጥርን ያስገቡ' },
        { key: 'msg_wd_account', label: 'Step 3: Enter Account', desc: 'Prompt for Bank Account', default: 'እባክዎን አካውንት ቁጥርን ያስገቡ' },
        { key: 'msg_wd_confirm', label: 'Step 4: Pending Message', desc: 'Message after request submission', default: '✅ Your withdrawal Request have been sent to admins please wait 1 min.' },
        { key: 'msg_wd_success', label: 'Step 5: Success Message', desc: 'Notification when admin approves', default: '✅ Your withdrawal of {amount} ETB is confirmed.\n🧾 Ref: {ref}' },
        { key: 'msg_wd_declined', label: 'Failure Message', desc: 'Notification when admin declines', default: '❌ Withdrawal Declined...' },
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

    const safeJsonParse = (val: string | any, fallback: any) => {
        if (!val) return fallback;
        if (typeof val !== 'string') return val;
        try {
            return JSON.parse(val);
        } catch (e) {
            console.error('JSON Parse Error:', e, 'for value:', val);
            return fallback;
        }
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
        onError: (err: any) => {
            console.error('Save Error:', err);
            toast.error('Failed to save changes: ' + (err.message || 'Unknown error'));
        }
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

    const renderFlowStep = (step: any, index: number, flowType: keyof typeof FLOW_DEFINITIONS) => {
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
                        id={step.key}
                        name={step.key}
                        value={value}
                        onChange={(val) => handleChange(step.key, val)}
                        minHeight="100px"
                        placeholder={step.default}
                        variables={
                            flowType === 'deposit' ? ['amount', 'method', 'account_no'] :
                                flowType === 'withdrawal' ? ['amount', 'bank', 'fee', 'net_amount'] :
                                    flowType === 'game' ? ['winner', 'win_amount', 'game_id', 'pot_size'] :
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
                    {step.key === 'msg_dep_method' && (
                        <div className="mt-4 pt-4 border-t border-white/10">
                            <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                <GripVertical className="w-4 h-4 text-muted-foreground" /> Manage Payment Methods
                            </h4>
                            <div className="space-y-2">
                                {(() => {
                                    const raw = localConfigs['payment_methods'];
                                    const parsed = safeJsonParse(raw, {});

                                    // Normalize to object if it's an array
                                    const savedMethods = Array.isArray(parsed)
                                        ? Object.fromEntries(parsed.map((m: any) => [m.key || m.name?.toLowerCase(), m]))
                                        : parsed;

                                    const defaultMethods = {
                                        telebirr: { name: 'Telebirr', account: '0931503559', accountName: 'Tadese', enabled: true },
                                        cbe: { name: 'CBE', account: '1000123456789', accountName: 'Bingo Ethiopia', enabled: true },
                                        abyssinia: { name: 'Abyssinia', account: '2000987654321', accountName: 'Bingo Ethiopia', enabled: true },
                                        awash: { name: 'Awash', account: '3000123456789', accountName: 'Bingo Ethiopia', enabled: true },
                                    };

                                    // Merge: Ensure all default keys exist and have explicit enabled status
                                    const methods: Record<string, any> = { ...defaultMethods };
                                    Object.entries(savedMethods).forEach(([k, v]: [string, any]) => {
                                        methods[k] = { ...methods[k], ...v };
                                    });

                                    const updateMethods = (newMethods: any) => {
                                        // Ensure every method in newMethods has an explicit enabled boolean
                                        const synchronizedMethods = Object.fromEntries(
                                            Object.entries(newMethods).map(([k, v]: [string, any]) => [
                                                k,
                                                { ...v, enabled: !!v.enabled }
                                            ])
                                        );

                                        handleChange('payment_methods', JSON.stringify(synchronizedMethods));

                                        // Also update botPaymentMethods array for bot compatibility
                                        const botArray = Object.entries(synchronizedMethods).map(([k, v]: [string, any]) => ({
                                            key: k,
                                            label: v.name,
                                            enabled: !!v.enabled
                                        }));
                                        handleChange('botPaymentMethods', JSON.stringify(botArray));
                                    };

                                    return Object.entries(methods).map(([key, m]: [string, any]) => (
                                        <div key={key} className="flex flex-col gap-2 bg-black/20 p-3 rounded border border-white/5">
                                            <div className="flex items-center gap-3">
                                                <Switch
                                                    checked={!!m.enabled}
                                                    onCheckedChange={(checked) => {
                                                        const updated = { ...methods, [key]: { ...m, enabled: checked } };
                                                        updateMethods(updated);
                                                    }}
                                                />
                                                <Input
                                                    id={`bank-name-${key}`}
                                                    name={`bank-name-${key}`}
                                                    value={m.name || ''}
                                                    onChange={(e) => updateMethods({ ...methods, [key]: { ...m, name: e.target.value } })}
                                                    className="h-8 text-sm bg-transparent border-transparent focus:bg-black/40 focus:border-white/20 font-bold text-white flex-1"
                                                />
                                                <div className="text-xs text-muted-foreground font-mono">{key}</div>
                                            </div>
                                            {m.enabled && (
                                                <div className="grid grid-cols-2 gap-2 ml-12">
                                                    <div>
                                                        <label htmlFor={`bank-account-${key}`} className="text-[10px] text-muted-foreground uppercase">Number/Account</label>
                                                        <Input
                                                            id={`bank-account-${key}`}
                                                            name={`bank-account-${key}`}
                                                            value={m.account || ''}
                                                            onChange={(e) => updateMethods({ ...methods, [key]: { ...m, account: e.target.value } })}
                                                            className="h-7 text-xs bg-black/40 border-white/10"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label htmlFor={`bank-holder-${key}`} className="text-[10px] text-muted-foreground uppercase">Account Name</label>
                                                        <Input
                                                            id={`bank-holder-${key}`}
                                                            name={`bank-holder-${key}`}
                                                            value={m.accountName || ''}
                                                            onChange={(e) => updateMethods({ ...methods, [key]: { ...m, accountName: e.target.value } })}
                                                            className="h-7 text-xs bg-black/40 border-white/10"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>
                    )}
                </div>
                {index < (FLOW_DEFINITIONS[flowType]?.length || 0) - 1 && (
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
                        Bot Logic Studio <Badge variant="outline" className="ml-2 text-xs align-middle bg-green-500/20 text-green-400 border-green-500/30">v3.2 - STABLE</Badge>
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
                            {/* Welcome Bonus Special Control */}
                            <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-blue-600/10 to-indigo-600/10 border border-blue-500/20 shadow-lg">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white">
                                            <Plus className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg">New User Welcome Bonus</h3>
                                            <p className="text-sm text-muted-foreground">Apply a free balance to users upon registration.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full border border-white/10">
                                        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground pr-2 border-r border-white/10">Bonus Status</span>
                                        <Switch
                                            checked={localConfigs['welcome_bonus_enabled'] !== 'false'}
                                            onCheckedChange={(checked) => handleChange('welcome_bonus_enabled', String(checked))}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-blue-400 uppercase tracking-widest">Bonus Amount (ETB)</label>
                                        <Input
                                            type="number"
                                            value={localConfigs['welcome_bonus_amount'] || '5'}
                                            onChange={(e) => handleChange('welcome_bonus_amount', e.target.value)}
                                            className="bg-black/40 border-white/10 h-10 text-xl font-bold font-mono"
                                            placeholder="5"
                                        />
                                    </div>
                                    <div className="flex items-end text-xs text-muted-foreground pb-2">
                                        <AlertTriangle className="w-4 h-4 mr-2 text-yellow-500" />
                                        This bonus is only given to new users once during registration.
                                    </div>
                                </div>
                            </div>

                            {FLOW_DEFINITIONS.onboarding.map((step, i) => renderFlowStep(step, i, 'onboarding'))}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="deposit" className="mt-0">
                    <Card className="border-none bg-transparent">
                        <CardContent className="p-0 space-y-2">
                            {FLOW_DEFINITIONS.deposit.map((step, i) => renderFlowStep(step, i, 'deposit'))}
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
                                const raw = localConfigs['payment_methods'];
                                const defaultMethods = {
                                    telebirr: { name: 'Telebirr', account: '0931503559', accountName: 'Tadese', enabled: true },
                                    cbe: { name: 'CBE', account: '1000123456789', accountName: 'Bingo Ethiopia', enabled: true },
                                    abyssinia: { name: 'Abyssinia', account: '2000987654321', accountName: 'Bingo Ethiopia', enabled: false },
                                    awash: { name: 'Awash', account: '3000123456789', accountName: 'Bingo Ethiopia', enabled: true }
                                };

                                const methods = safeJsonParse(raw, defaultMethods);

                                // methods might be an array (old) or object (new)
                                const methodEntries: [string, any][] = Array.isArray(methods)
                                    ? (methods as any[]).map((m: any) => [m.key, m])
                                    : Object.entries(methods);

                                return methodEntries.filter(([_, m]) => m?.enabled).map(([key, method]) => {
                                    const instructionKey = `methods.${key}.instructions.am`;
                                    const value = localConfigs[instructionKey] || '';
                                    const isDirty = dirtyKeys.has(instructionKey);

                                    return (
                                        <div key={key} className={cn(
                                            "p-6 rounded-xl border transition-all",
                                            isDirty ? "bg-blue-500/5 border-blue-500/50" : "bg-white/5 border-white/10"
                                        )}>
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                                                    {method.name ? method.name.charAt(0) : key.charAt(0)}
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-lg">{method.name || key}</h3>
                                                    <p className="text-xs text-muted-foreground">Deposit instructions for {method.name || key}</p>
                                                </div>
                                                {isDirty && <Badge variant="outline" className="ml-auto">Modified</Badge>}
                                            </div>
                                            <Textarea
                                                value={value}
                                                onChange={(e) => handleChange(instructionKey, e.target.value)}
                                                placeholder={`የሚያጋጥማቹ የክፍያ ችግር:\n@onlineetbingosupport ላይ ፃፉልን።\n\n1. ከታች ባለው የ${method.name} አካውንት {amount} ብር ያስገቡ\n     Account: ${method.account}\n     Name: ${method.accountName}\n\n2. የከፈሉበትን አጭር የጹሁፍ መልዕክት(message) copy በማድረግ እዚ ላይ Past አድረገው ያስገቡና ይላኩት👇👇👇`}
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
                            {FLOW_DEFINITIONS.withdrawal.map((step, i) => renderFlowStep(step, i, 'withdrawal'))}
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
                                const parsed = safeJsonParse(raw, [336997351]);
                                const adminIds = Array.isArray(parsed) ? parsed : [parsed].filter(Boolean);

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
                            {FLOW_DEFINITIONS.game.map((step, i) => renderFlowStep(step, i, 'game'))}
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
