'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAdmin } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BotIdentityEditor } from "@/components/bot-identity-editor";
import {
    Users,
    Settings,
    MessageSquare,
    CreditCard,
    ShieldAlert,
    Terminal,
    Bot,
    Save,
    Menu, Plus, Trash2, LayoutGrid, Check, Coins, Banknote, Phone, User, Wifi, Battery, Database,
    DollarSign, Timer, AlertCircle
} from "lucide-react";
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export default function BotStudioPage() {
    const queryClient = useQueryClient();

    const { data: cmsData, isLoading } = useQuery({
        queryKey: ['bot-cms'],
        queryFn: async () => {
            const data = await fetchAdmin('/bot/cms');
            return data.success ? data.data : null;
        }
    });

    const updateConfig = useMutation({
        mutationFn: async ({ key, value }: { key: string, value: any }) => {
            return fetchAdmin('/bot/cms', {
                method: 'POST',
                body: JSON.stringify({ key, value })
            });
        },
        onSuccess: () => {
            toast.success('Configuration Saved');
            queryClient.invalidateQueries({ queryKey: ['bot-cms'] });
        },
        onError: () => toast.error('Failed to save changes')
    });

    // Bot Admins Logic
    const [newBotAdminId, setNewBotAdminId] = useState('');
    const { data: botAdmins, refetch: refetchBotAdmins } = useQuery({
        queryKey: ['bot-admins'],
        queryFn: async () => {
            const data = await fetchAdmin('/bot/admins');
            return data.admins || [];
        }
    });

    const addBotAdminMutation = useMutation({
        mutationFn: async (id: string) => {
            return fetchAdmin('/bot/admins', {
                method: 'POST',
                body: JSON.stringify({ userId: id })
            });
        },
        onSuccess: () => {
            toast.success('Bot Admin Added');
            setNewBotAdminId('');
            refetchBotAdmins();
        },
        onError: () => toast.error('Failed to add ID')
    });

    const removeBotAdminMutation = useMutation({
        mutationFn: async (id: number) => {
            await fetch(`/api/admin/bot/admins?id=${id}`, { method: 'DELETE' });
        },
        onSuccess: () => {
            toast.success('Bot Admin Removed');
            refetchBotAdmins();
        }
    });

    if (isLoading) return <div>Loading...</div>;

    const { bot_settings, bot_commands, bot_menu_buttons, bot_financials, bot_payment_methods } = cmsData || {};

    return (
        <div className="space-y-8 pb-20">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    <Bot className="w-8 h-8 text-purple-500" />
                    Bot Studio
                </h1>
                <p className="text-muted-foreground mt-1">Customize your Telegram Bot's behavior, financials, and content.</p>
            </div>

            <Tabs defaultValue="ui" className="w-full">
                <TabsList className="bg-black/20 border border-white/10 flex-wrap gap-1 h-auto">
                    <TabsTrigger value="identity" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">Bot Identity</TabsTrigger>
                    <TabsTrigger value="ui">Interface</TabsTrigger>
                    <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
                    <TabsTrigger value="financials">Financials</TabsTrigger>
                    <TabsTrigger value="commands">Commands</TabsTrigger>
                    <TabsTrigger value="admins">Admins</TabsTrigger>
                    <TabsTrigger value="flows">Flows</TabsTrigger>
                </TabsList>

                {/* IDENTITY TAB */}
                <TabsContent value="identity" className="mt-6 space-y-6">
                    <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Bot className="w-5 h-5 text-purple-400" /> Public Profile</CardTitle>
                            <CardDescription>
                                This info appears in Telegram when users view your bot.
                                <br />
                                <span className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded mt-2 inline-block">
                                    Note: Changes here update the actual Telegram Bot settings immediately.
                                </span>
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <BotIdentityEditor onSave={(data) => {
                                updateConfig.mutate({ key: 'bot_identity_call', value: data }); // Trick to trigger simple mutate, but we need custom API call...
                                // Actually, let's create a specialized mutation for this
                            }} />
                        </CardContent>
                    </Card>

                    <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm">Global Status</CardTitle>
                        </CardHeader>
                        <CardContent className="flex items-center justify-between">
                            <div className="space-y-1">
                                <Label className="text-base font-medium text-white">Bot Maintenance</Label>
                                <p className="text-xs text-muted-foreground">Locks bot for regular users</p>
                            </div>
                            <Switch
                                checked={bot_settings?.maintenance_mode || false}
                                onCheckedChange={(checked) => updateConfig.mutate({
                                    key: 'bot_settings',
                                    value: { ...bot_settings, maintenance_mode: checked }
                                })}
                                className="data-[state=checked]:bg-red-500"
                            />
                        </CardContent>
                    </Card>

                    <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-red-400"><Terminal className="w-5 h-5" /> Technical Config (Danger Zone)</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 text-sm text-gray-300">
                            <p>To change the <strong>Bot Username</strong> (e.g. @MyBot) or the <strong>Token</strong>, you cannot use this dashboard.</p>
                            <ol className="list-decimal list-inside space-y-2">
                                <li>Use <a href="https://t.me/BotFather" target="_blank" className="text-blue-400 underline">@BotFather</a> on Telegram to create a new bot/token.</li>
                                <li>Update the <code>BOT_TOKEN</code> secret in your Cloudflare Worker environment.</li>
                                <li>Re-deploy the worker.</li>
                            </ol>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* UI & MENUS TAB */}
                <TabsContent value="ui" className="mt-6 space-y-6">
                    <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Menu className="w-5 h-5 text-blue-400" /> Menu Button Settings</CardTitle>
                            <CardDescription>Configure the persistent menu button (bottom-left) and web app texts.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold">Menu Button Text (Emoji)</label>
                                    <Input
                                        defaultValue={bot_settings?.menu_button_text || '🎮'}
                                        className="bg-white/5 border-white/10 font-mono text-xl w-24 text-center"
                                        maxLength={4}
                                        onBlur={(e) => updateConfig.mutate({
                                            key: 'bot_settings',
                                            value: { ...bot_settings, menu_button_text: e.target.value }
                                        })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold">"Open Now" Button Text</label>
                                    <Input
                                        defaultValue={bot_settings?.open_now_text || '🎮 Play Now'}
                                        className="bg-white/5 border-white/10"
                                        onBlur={(e) => updateConfig.mutate({
                                            key: 'bot_settings',
                                            value: { ...bot_settings, open_now_text: e.target.value }
                                        })}
                                    />
                                </div>
                            </div>
                            <div className="pt-2">
                                <label className="text-xs font-bold uppercase text-muted-foreground">Mini App / Web App URL</label>
                                <div className="flex gap-2">
                                    <Input
                                        defaultValue={bot_settings?.web_app_url || 'https://main.bingo-ethiopia.pages.dev'}
                                        className="bg-white/5 border-white/10 font-mono text-xs flex-1"
                                        onBlur={(e) => updateConfig.mutate({
                                            key: 'bot_settings',
                                            value: { ...bot_settings, web_app_url: e.target.value }
                                        })}
                                    />
                                    <Button variant="ghost" size="icon" onClick={() => window.open(bot_settings?.web_app_url, '_blank')} className="text-blue-400">
                                        <Database className="w-4 h-4" />
                                    </Button>
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-1 italic">Used for all 'Play Now' and 🎮 buttons in the bot.</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2"><LayoutGrid className="w-5 h-5 text-orange-400" /> Main Keyboard Layout</CardTitle>
                                <CardDescription>Define the buttons shown to users.</CardDescription>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => {
                                const newMenu = [...(bot_menu_buttons || []), [{ text: 'New Button' }]];
                                updateConfig.mutate({ key: 'bot_menu_buttons', value: newMenu });
                            }}><Plus className="w-4 h-4 mr-2" /> Add Row</Button>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {bot_menu_buttons?.map((row: any[], rowIndex: number) => (
                                    <div key={rowIndex} className="flex gap-2 p-4 bg-white/5 rounded-xl border border-white/5 items-center">
                                        <div className="grid grid-cols-2 gap-2 flex-1">
                                            {row.map((btn, btnIndex) => (
                                                <Input
                                                    key={btnIndex}
                                                    defaultValue={btn.text}
                                                    className="bg-black/30 border-white/10 text-center"
                                                    onBlur={(e) => {
                                                        const newMenu = [...bot_menu_buttons];
                                                        newMenu[rowIndex][btnIndex].text = e.target.value;
                                                        updateConfig.mutate({ key: 'bot_menu_buttons', value: newMenu });
                                                    }}
                                                />
                                            ))}
                                            {row.length < 2 && (
                                                <Button variant="ghost" className="border border-dashed border-white/20 text-muted-foreground w-full" onClick={() => {
                                                    const newMenu = [...bot_menu_buttons];
                                                    newMenu[rowIndex].push({ text: 'New Button' });
                                                    updateConfig.mutate({ key: 'bot_menu_buttons', value: newMenu });
                                                }}><Plus className="w-4 h-4" /></Button>
                                            )}
                                        </div>
                                        <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-500/10" onClick={() => {
                                            const newMenu = bot_menu_buttons.filter((_: any, i: number) => i !== rowIndex);
                                            updateConfig.mutate({ key: 'bot_menu_buttons', value: newMenu });
                                        }}><Trash2 className="w-4 h-4" /></Button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* FINANCIALS TAB */}
                <TabsContent value="financials" className="mt-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Limits Card */}
                        <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Coins className="w-5 h-5 text-yellow-400" /> Transaction Limits</CardTitle>
                                <CardDescription>Set global limits for deposits and withdrawals.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase text-muted-foreground">Min Deposit (ETB)</label>
                                        <Input type="number" defaultValue={bot_financials?.minDeposit || 10}
                                            className="bg-white/5 border-white/10"
                                            onBlur={e => updateConfig.mutate({ key: 'bot_financials', value: { ...bot_financials, minDeposit: e.target.value } })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase text-muted-foreground">Min Withdrawal (ETB)</label>
                                        <Input type="number" defaultValue={bot_financials?.minWithdrawal || 100}
                                            className="bg-white/5 border-white/10"
                                            onBlur={e => updateConfig.mutate({ key: 'bot_financials', value: { ...bot_financials, minWithdrawal: e.target.value } })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase text-muted-foreground">Max Withdrawal (ETB)</label>
                                        <Input type="number" defaultValue={bot_financials?.maxWithdrawal || 10000}
                                            className="bg-white/5 border-white/10"
                                            onBlur={e => updateConfig.mutate({ key: 'bot_financials', value: { ...bot_financials, maxWithdrawal: e.target.value } })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold uppercase text-muted-foreground">Withdrawal Fee (%)</label>
                                        <Input type="number" defaultValue={bot_financials?.withdrawalFee || 0}
                                            className="bg-white/5 border-white/10"
                                            onBlur={e => updateConfig.mutate({ key: 'bot_financials', value: { ...bot_financials, withdrawalFee: e.target.value } })}
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-white/10">
                                    <h4 className="text-sm font-bold text-green-400 mb-4">Referral Rewards</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase text-muted-foreground">Referrer Gets (ETB)</label>
                                            <Input type="number" defaultValue={bot_financials?.referrerReward || 10}
                                                className="bg-white/5 border-white/10"
                                                onBlur={e => updateConfig.mutate({ key: 'bot_financials', value: { ...bot_financials, referrerReward: e.target.value } })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold uppercase text-muted-foreground">New User Gets (ETB)</label>
                                            <Input type="number" defaultValue={bot_financials?.referredReward || 10}
                                                className="bg-white/5 border-white/10"
                                                onBlur={e => updateConfig.mutate({ key: 'bot_financials', value: { ...bot_financials, referredReward: e.target.value } })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Payment Methods */}
                        <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-blue-400" /> Payment Methods</CardTitle>
                                    <CardDescription>Manage active bank accounts.</CardDescription>
                                </div>
                                <BankEditor methods={bot_payment_methods} onSave={(m) => updateConfig.mutate({ key: 'bot_payment_methods', value: m })} />
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {Object.entries(bot_payment_methods || {}).map(([key, method]: any) => (
                                    <div key={key} className="p-4 bg-white/5 rounded-xl border border-white/5 flex justify-between items-start">
                                        <div>
                                            <div className="font-bold flex items-center gap-2">
                                                <Banknote className="w-4 h-4 text-green-400" />
                                                {method.name}
                                            </div>
                                            <div className="text-xs font-mono text-muted-foreground mt-1">
                                                ID: {key}
                                            </div>
                                            {/* Preview Instructions */}
                                            <div className="text-xs text-white/50 mt-2 bg-black/30 p-2 rounded">
                                                {method.instructions?.am}
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-500/10" onClick={() => {
                                            const newM = { ...bot_payment_methods };
                                            delete newM[key];
                                            updateConfig.mutate({ key: 'bot_payment_methods', value: newM });
                                        }}><Trash2 className="w-4 h-4" /></Button>
                                    </div>
                                ))}
                                {Object.keys(bot_payment_methods || {}).length === 0 && <p className="text-muted-foreground text-sm">No payment methods configured.</p>}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* COMMANDS TAB */}
                <TabsContent value="commands" className="mt-6">
                    <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div className="relative">
                                <CardTitle className="flex items-center gap-2"><Terminal className="w-5 h-5 text-green-400" /> Custom Commands</CardTitle>
                                <CardDescription>Add trigger words and their text responses.</CardDescription>
                            </div>

                            <CommandEditor
                                commands={bot_commands}
                                onSave={(newCmds) => updateConfig.mutate({ key: 'bot_commands', value: newCmds })}
                            />
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {Object.entries(bot_commands || {}).map(([trigger, response]) => (
                                    <div key={trigger} className="flex gap-4 items-center p-3 bg-white/5 rounded-lg border border-white/5">
                                        <div className="text-sm font-bold font-mono text-green-400 min-w-[100px]">{trigger}</div>
                                        <div className="text-sm text-gray-300 flex-1 truncate">{response as string}</div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-500 hover:bg-red-500/10"
                                            onClick={() => {
                                                const newCmds = { ...bot_commands };
                                                delete newCmds[trigger];
                                                updateConfig.mutate({ key: 'bot_commands', value: newCmds });
                                            }}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ONBOARDING TAB */}
                <TabsContent value="onboarding" className="mt-6 space-y-6">
                    <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-blue-400">
                                <Plus className="w-5 h-5" />
                                New User Welcome
                            </CardTitle>
                            <CardDescription>Configure the first interaction for new players.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-sm font-bold">Welcome Message (Amharic/English)</Label>
                                <Textarea
                                    defaultValue={bot_settings?.welcome_message || ''}
                                    className="bg-white/5 border-white/10 h-32 font-mono text-sm"
                                    placeholder="👋 ሰላም! እንኳን ወደ ቢንጎ ኢትዮጵያ በሰላም መጡ..."
                                    onBlur={(e) => updateConfig.mutate({
                                        key: 'bot_settings',
                                        value: { ...bot_settings, welcome_message: e.target.value }
                                    })}
                                />
                                <p className="text-[10px] text-muted-foreground italic">Sent when a user clicks /start for the first time.</p>
                            </div>

                            <div className="pt-4 border-t border-white/5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-bold text-green-400">Initial Welcome Bonus (ETB)</Label>
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                defaultValue={bot_financials?.referredReward || 10}
                                                className="bg-white/5 border-white/10 pl-8 font-mono text-lg font-bold text-green-400"
                                                onBlur={(e) => updateConfig.mutate({
                                                    key: 'bot_financials',
                                                    value: { ...bot_financials, referredReward: parseInt(e.target.value) || 0 }
                                                })}
                                            />
                                            <DollarSign className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                        </div>
                                        <p className="text-[10px] text-muted-foreground italic">Free balance given to every new user upon registration.</p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-bold text-blue-400">Registration Success Message</Label>
                                        <Textarea
                                            defaultValue={cmsData?.bot_flows?.onboarding?.registration_success || ''}
                                            className="bg-white/5 border-white/10 h-20 text-xs"
                                            onBlur={(e) => updateConfig.mutate({
                                                key: 'bot_flows',
                                                value: {
                                                    ...cmsData?.bot_flows,
                                                    onboarding: { ...cmsData?.bot_flows?.onboarding, registration_success: e.target.value }
                                                }
                                            })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
                        <CardHeader>
                            <CardTitle className="text-sm">Preview</CardTitle>
                        </CardHeader>
                        <CardContent className="flex justify-center p-6 bg-black/60 rounded-xl border border-white/5">
                            <BotPreview text={bot_settings?.welcome_message || ''} hasButton buttonText="Register Now" />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ADMINS TAB */}
                <TabsContent value="admins" className="mt-6">
                    <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Bot className="w-5 h-5 text-blue-400" /> Telegram Bot Admins</CardTitle>
                            <CardDescription>Users authorized to approve transactions directly on Telegram.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex gap-4">
                                <Input
                                    placeholder="Enter Telegram ID (e.g. 123456789)"
                                    value={newBotAdminId}
                                    onChange={(e) => setNewBotAdminId(e.target.value)}
                                    className="bg-white/5 border-white/10"
                                />
                                <Button
                                    onClick={() => addBotAdminMutation.mutate(newBotAdminId)}
                                    className="bg-blue-600 hover:bg-blue-700 font-bold"
                                    disabled={!newBotAdminId}
                                >
                                    <Plus className="w-4 h-4 mr-2" /> Add Admin
                                </Button>
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-sm font-bold text-muted-foreground uppercase">Authorized IDs</h3>
                                {botAdmins?.map((id: number) => (
                                    <div key={id} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                                                <Bot className="w-4 h-4" />
                                            </div>
                                            <span className="font-mono text-lg">{id}</span>
                                        </div>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="text-red-500 hover:bg-red-500/10 hover:text-red-400"
                                            onClick={() => removeBotAdminMutation.mutate(id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                                {botAdmins?.length === 0 && <p className="text-muted-foreground text-sm">No bot admins configured.</p>}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* FLOWS TAB */}
                <TabsContent value="flows" className="mt-6">
                    <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><MessageSquare className="w-5 h-5 text-orange-400" /> Message Flows</CardTitle>
                            <CardDescription>Edit all automated bot responses and prompts.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <FlowsEditor
                                flows={cmsData?.bot_flows}
                                onSave={(flows) => updateConfig.mutate({ key: 'bot_flows', value: flows })}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function CommandEditor({ commands, onSave }: { commands: any, onSave: (c: any) => void }) {
    const [open, setOpen] = useState(false);
    const [trigger, setTrigger] = useState('');
    const [response, setResponse] = useState('');

    const handleAdd = () => {
        if (!trigger || !response) return;
        onSave({ ...commands, [trigger]: response });
        setTrigger('');
        setResponse('');
        setOpen(false);
    };

    if (!open) return <Button onClick={() => setOpen(true)} className="bg-green-600 hover:bg-green-700 font-bold"><Plus className="w-4 h-4 mr-2" /> Add Command</Button>;

    return (
        <div className="flex flex-col gap-2 p-4 bg-black/50 rounded-xl border border-green-500/30 absolute right-0 z-10 w-80 shadow-2xl backdrop-blur-3xl top-0 mt-12 transform translate-x-4">
            <h4 className="font-bold text-sm text-green-400">New Command</h4>
            <Input placeholder="Trigger (e.g. /promo)" value={trigger} onChange={e => setTrigger(e.target.value)} className="bg-white/10 border-white/10" />
            <Textarea placeholder="Response Text" value={response} onChange={e => setResponse(e.target.value)} className="bg-white/10 border-white/10" />
            <div className="flex gap-2">
                <Button onClick={handleAdd} className="flex-1 bg-green-600">Save</Button>
                <Button variant="ghost" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
            </div>
        </div>
    );
}

function BankEditor({ methods, onSave }: { methods: any, onSave: (m: any) => void }) {
    const [open, setOpen] = useState(false);
    const [id, setId] = useState('');
    const [name, setName] = useState('');
    const [instructions, setInstructions] = useState('');

    const handleAdd = () => {
        if (!id || !name || !instructions) return;
        onSave({
            ...methods,
            [id]: {
                name,
                instructions: { am: instructions } // Structuring to match existing schema
            }
        });
        setId('');
        setName('');
        setInstructions('');
        setOpen(false);
    };

    if (!open) return <Button size="sm" onClick={() => setOpen(true)} className="bg-blue-600 hover:bg-blue-700 font-bold"><Plus className="w-4 h-4 mr-2" /> Add Bank</Button>;

    return (
        <div className="flex flex-col gap-2 p-4 bg-black/50 rounded-xl border border-blue-500/30 absolute right-0 z-10 w-96 shadow-2xl backdrop-blur-3xl top-0 mt-12 transform translate-x-4">
            <h4 className="font-bold text-sm text-blue-400">New Payment Method</h4>
            <Input placeholder="ID (e.g. cbe, telebirr)" value={id} onChange={e => setId(e.target.value)} className="bg-white/10 border-white/10" />
            <Input placeholder="Display Name (e.g. Commercial Bank)" value={name} onChange={e => setName(e.target.value)} className="bg-white/10 border-white/10" />
            <Textarea placeholder="Instructions (Use {amount} for dynamic price). E.g: Transfer {amount} to 1000123456" value={instructions} onChange={e => setInstructions(e.target.value)} className="bg-white/10 border-white/10 h-24" />
            <div className="flex gap-2">
                <Button onClick={handleAdd} className="flex-1 bg-blue-600">Save</Button>
                <Button variant="ghost" onClick={() => setOpen(false)} className="flex-1">Cancel</Button>
            </div>
        </div>
    );
}

// Helper for variable insertion
function VariableChip({ label, value, onInsert }: { label: string, value: string, onInsert: (v: string) => void }) {
    return (
        <span
            className="cursor-pointer hover:bg-white/10 text-[10px] text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full transition-colors"
            onClick={() => onInsert(value)}
        >
            {label}
        </span>
    );
}

// Live Telegram Preview Component
function BotPreview({ text, hasButton, buttonText, type = 'bot' }: { text: string, hasButton?: boolean, buttonText?: string, type?: 'bot' | 'user' }) {
    return (
        <div className="bg-[#0e1621] rounded-lg p-3 max-w-[85%] text-sm shadow-sm relative group animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Avatar placeholder */}
            <div className={`absolute -left-10 top-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ring-2 ring-[#0e1621]
                ${type === 'bot' ? 'bg-blue-500 text-white' : 'bg-green-600 text-white'}
            `}>
                {type === 'bot' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
            </div>

            {/* Name */}
            <div className="text-xs font-bold text-[#64b5ef] mb-1">
                {type === 'bot' ? 'BingoBot' : 'User'}
            </div>

            {/* Message Body - rendering newlines */}
            <div className="whitespace-pre-wrap text-white/90 leading-relaxed">
                {text || <span className="text-white/20 italic">Empty message...</span>}
            </div>

            {/* Timestamp */}
            <div className="text-[10px] text-white/40 text-right mt-1 flex items-center justify-end gap-1">
                {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>

            {/* Simulated Inline Button */}
            {hasButton && (
                <div className="mt-2 -mx-3 -mb-3 bg-[#17212b] rounded-b-lg overflow-hidden border-t border-[#0e1621]">
                    <div className="p-2.5 text-center text-[#64b5ef] font-bold text-xs hover:bg-[#202b36] transition-colors cursor-pointer bg-opacity-50">
                        {buttonText || 'Action Button'}
                    </div>
                </div>
            )}
        </div>
    );
}

function FlowsEditor({
    flows,
    gameRules,
    flowSequences,
    onSave,
    onSaveRules,
    onSaveSequences
}: {
    flows: any,
    gameRules?: any,
    flowSequences?: any,
    onSave: (f: any) => void,
    onSaveRules?: (r: any) => void,
    onSaveSequences?: (s: any) => void
}) {
    // [Previous defaults logic omitted for brevity as it is preserved in state]
    const defaults = {
        onboarding: {
            welcome: '👋 Welcome to Bingo Ethiopia!\n\nPlease register first by clicking the button below:',
            welcome_back: '👋 Welcome back! We missed you.',
            registration_success: '✅ Registration successful! You can now deposit and play.'
        },
        deposit: {
            prompt_amount: '💰 ማስገባት የሚፈልጉትን መጠን ከ10 ብር ጀምሮ ያስገቡ።',
            prompt_bank: 'እባክዎት ማስገባት የሚፈልጉበትን ባንክ ይምረጡ።',
            pending_message: '✅ Your deposit Request have been sent to admins please wait 1 min.',
            success_message: '✅ Your deposit of {amount} ETB is confirmed.\n🧾 Ref: {ref}',
            declined_message: '❌ Your deposit of {amount} ETB is Declined.',
            invalid_amount: '❌ Invalid Amount. Minimum deposit is {min} ETB.'
        },
        withdrawal: {
            prompt_amount: '💰 ማውጣት የሚፈልጉትን የገንዘብ መጠን ያስገቡ ?',
            prompt_bank: 'እባክዎን የሚያወጡበትን ባንክ ይምረጡ',
            prompt_phone: 'እባክዎን ስልክ ቁጥርን ያስገቡ',
            prompt_account: 'እባክዎን አካውንት ቁጥርን ያስገቡ',
            pending_message: '✅ Your withdrawal Request have been sent to admins please wait 1 min.',
            success_message: '✅ Your withdrawal of {amount} ETB is confirmed.\n🧾 Ref: {ref}',
            declined_message: '❌ Withdrawal Declined\n\nYour withdrawal of {amount} Birr was declined and refunded.\n\n💳 Current Balance: {balance} Birr\n\nPlease contact support if you believe this was an error.',
            min_error: 'ዝቅተኛው ማውጣት የምትችሉት መጠን {min} ብር ነው።',
            max_error: 'ከፍተኛው ማውጣት የምትችሉት መጠን {max}ብር ነው።',
            balance_error: '❌ በቂ ባላንስ የለዎትም!\n\n💳 የእርስዎ ባላንስ: {balance} ብር\n💰 የጠየቁት መጠን: {amount} ብር'
        },
        errors: {
            unknown_command: '❓ Unknown command. Try /start for help.',
            invalid_input: '❌ Invalid input. Please try again.',
            process_error: '❌ An error occurred. Please try again later.'
        },
        referral: {
            share_message: '🎁 Use my code to join Bingo Ethiopia!',
            referrer_bonus: '🎉 Someone used your code! You earned {amount} ETB!',
            referred_bonus: '✅ Referral applied! You earned {amount} ETB bonus.'
        },
        support: {
            contact_message: '📞 Contact Support\n\n📱 Phone: +251-931-50-35-59\n📧 Email: support@onlinebingo.et\n💬 Telegram: @online_bingo_support\n\n⏰ Support Hours:\n   Monday - Sunday: 9 AM - 9 PM\n\nWe\'re here to help!',
            instructions: '📘 የቢንጎ ጨዋታ ህጎች\n\n🃏 መጫወቻ ካርድ\n\n1. ጨዋታውን ለመጀመር ከሚመጣልን ከ1-300 የመጫወቻ ካርድ ውስጥ አንዱን እንመርጣለን።\n\n2. የመጫወቻ ካርዱ ላይ በቀይ ቀለም የተመረጡ ቁጥሮች የሚያሳዩት መጫወቻ ካርድ በሌላ ተጫዋች መመረጡን ነው።\n\n3. የመጫወቻ ካርድ ስንነካው ከታች በኩል ካርድ ቁጥሩ የሚይዘዉን መጫወቻ ካርድ ያሳየናል።\n\n4. ወደ ጨዋታው ለመግባት የምንፈልገዉን ካርድ ከመረጥን ለምዝገባ የተሰጠው ሰኮንድ ዜሮ ሲሆን ቀጥታ ወደ ጨዋታ ያስገባናል።\n\n🎮 ጨዋታ\n\n1. ወደ ጨዋታው ስንገባ በመረጥነው የካርድ ቁጥር መሰረት የመጫወቻ ካርድ እናገኛለን።\n\n2. ጨዋታው ሲጀምር የተለያዪ ቁጥሮች ከ1 እስከ 75 መጥራት ይጀምራል።\n\n3. የሚጠራው ቁጥር የኛ መጫወቻ ካርድ ውስጥ ካለ የተጠራውን ቁጥር ክሊክ በማረግ መምረጥ እንችላለን።\n\n4. የመረጥነውን ቁጥር ማጥፋት ከፈለግን መልሰን እራሱን ቁጥር ክሊክ በማረግ ማጥፋት እንችላለን።\n\n🏆 አሸናፊ\n\n1. ቁጥሮቹ ሲጠሩ ከመጫወቻ ካርዳችን ላይ እየመረጥን ወደጎን ወይም ወደታች ወይም ወደሁለቱም አግዳሚ ወይም አራቱን ማእዘናት ከመረጥን ወዲያውኑ ከታች በኩል bingo የሚለውን በመንካት ማሸነፍ እንችላለን።\n\n2. ወደጎን ወይም ወደታች ወይም ወደሁለቱም አግዳሚ ወይም አራቱን ማእዘናት ሳይጠሩ bingo የሚለውን ክሊክ ካደረግን ከጨዋታው እንታገዳለን።\n\n3. ሁለት ወይም ከዚያ በላይ ተጫዋቾች እኩል ቢያሸንፉ ደራሹ ለቁጥራቸው ይካፈላል።'
        }
    };

    const [data, setData] = useState(flows || defaults);
    const [rules, setRules] = useState(gameRules || { commissionPct: 15 });
    const [sequences, setSequences] = useState(flowSequences || { deposit: ['amount', 'bank'], withdrawal: ['amount', 'bank', 'account'] });

    // Track active field for preview
    const [previewText, setPreviewText] = useState(defaults.onboarding.welcome);
    const [activeSection, setActiveSection] = useState('onboarding');

    // Merge defaults
    const merged = { ...defaults, ...data };

    const handleChange = (section: string, key: string, val: string) => {
        const newData = { ...merged, [section]: { ...merged[section as keyof typeof merged], [key]: val } };
        setData(newData);
        setPreviewText(val); // dynamic preview
    };

    const handleFocus = (text: string) => {
        setPreviewText(text);
    };

    const insertVariable = (section: string, key: string, variable: string, currentVal: string) => {
        const newVal = currentVal + ' ' + variable;
        handleChange(section, key, newVal);
    };

    // Sequence Helper (Drag and Drop)
    const [draggedItem, setDraggedItem] = useState<{ type: string, index: number } | null>(null);

    const onDragStart = (e: React.DragEvent, type: string, index: number) => {
        setDraggedItem({ type, index });
        // Ghost image usually automatic, but effectAllowed can be set
        e.dataTransfer.effectAllowed = "move";
    };

    const onDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault(); // Necessary to allow dropping
        // Optional: Add visual indicator logic here if overly complex, 
        // but simplest is just allow drop.
    };

    const onDrop = (e: React.DragEvent, targetType: string, targetIndex: number) => {
        e.preventDefault();

        if (!draggedItem || draggedItem.type !== targetType) return;

        const list = [...(sequences[targetType] || [])];
        const itemToMove = list[draggedItem.index];

        // Remove from old index
        list.splice(draggedItem.index, 1);
        // Insert at new index
        list.splice(targetIndex, 0, itemToMove);

        setSequences({ ...sequences, [targetType]: list });
        setDraggedItem(null);
    };

    // Common variables
    const commonVars = [
        { label: 'Amount', value: '{amount}' },
        { label: 'Min', value: '{min}' },
        { label: 'Max', value: '{max}' },
        { label: 'User Balance', value: '{balance}' },
        { label: 'Ref Code', value: '{ref}' },
    ];

    return (
        <div className="flex gap-6 h-[calc(100vh-200px)]">
            {/* Editor Area */}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                <Tabs defaultValue="onboarding" className="w-full" onValueChange={setActiveSection}>
                    <TabsList className="w-full justify-start bg-black/20 border-b border-white/10 p-0 h-auto flex-wrap">
                        {['onboarding', 'deposit', 'withdrawal', 'rules', 'referral', 'support', 'errors'].map(tab => (
                            <TabsTrigger
                                key={tab}
                                value={tab}
                                className="px-4 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-blue-500/10 transition-all capitalize"
                            >
                                {tab === 'rules' ? '⚙️ Rules & Flows' : tab}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    {/* NEW RULES TAB */}
                    <TabsContent value="rules" className="mt-6 space-y-6">
                        <Card className="bg-[#0e1621]/50 border-blue-500/20">
                            <CardHeader>
                                <CardTitle className="text-lg text-blue-400">Game Rules</CardTitle>
                                <CardDescription>Configure core game mechanics.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <label className="text-xs text-blue-300 font-bold mb-2 block">Commission Percentage (Derash)</label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            value={rules.commissionPct}
                                            onChange={(e) => setRules({ ...rules, commissionPct: parseFloat(e.target.value) })}
                                            className="bg-black/40 border-white/10 w-24"
                                        />
                                        <span className="text-white/50">%</span>
                                    </div>
                                    <p className="text-[10px] text-white/30 mt-1">Percentage deducted from the Total Pot. Remaining is distributed to winners.</p>
                                </div>
                                <Button onClick={() => onSaveRules?.(rules)} size="sm" className="bg-blue-600">Save Rules</Button>
                            </CardContent>
                        </Card>

                        <div className="grid grid-cols-2 gap-4">
                            {['deposit', 'withdrawal'].map((type) => (
                                <Card key={type} className="bg-[#0e1621]/50 border-blue-500/20">
                                    <CardHeader>
                                        <CardTitle className="text-lg text-blue-400 capitalize">{type} Sequence</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        <div className="flex flex-col gap-2">
                                            {(sequences[type as 'deposit' | 'withdrawal'] || []).map((step: string, idx: number) => (
                                                <div
                                                    key={idx}
                                                    draggable
                                                    onDragStart={(e) => onDragStart(e, type, idx)}
                                                    onDragOver={(e) => onDragOver(e, idx)}
                                                    onDrop={(e) => onDrop(e, type, idx)}
                                                    className={`flex items-center justify-between bg-black/40 p-3 rounded border border-white/5 cursor-grab active:cursor-grabbing hover:bg-white/5 transition-colors ${draggedItem?.index === idx && draggedItem.type === type ? 'opacity-50 border-blue-500 border-dashed' : ''}`}
                                                >
                                                    <span className="text-sm font-mono text-white/80 flex items-center gap-2">
                                                        <span className="text-white/20 select-none cursor-grab">☰</span>
                                                        {idx + 1}. <span className="text-yellow-400 font-bold">{step}</span>
                                                    </span>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-white/20 hover:text-red-400"
                                                        onClick={(e) => {
                                                            e.stopPropagation(); // Prevent drag start if clicked
                                                            const newSeq = [...(sequences[type as 'deposit' | 'withdrawal'] || [])];
                                                            newSeq.splice(idx, 1);
                                                            setSequences({ ...sequences, [type]: newSeq });
                                                        }}
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="pt-4 flex gap-2">
                                            <Button onClick={() => {
                                                const id = window.prompt(`Enter ID for new ${type} step (e.g., 'photo', 'location'):`);
                                                if (id) {
                                                    const cleanId = id.trim().toLowerCase().replace(/\s+/g, '_');
                                                    if (!sequences[type]?.includes(cleanId)) {
                                                        const newSeq = [...(sequences[type as 'deposit' | 'withdrawal'] || []), cleanId];
                                                        setSequences({ ...sequences, [type]: newSeq });

                                                        // Auto-add prompt field if missing
                                                        if (!merged[type as 'deposit' | 'withdrawal'][`prompt_${cleanId}`]) {
                                                            handleChange(type, `prompt_${cleanId}`, `Please enter ${cleanId}...`);
                                                        }
                                                        // Auto-save sequence not needed, user clicks save
                                                    } else {
                                                        alert('Step already exists!');
                                                    }
                                                }
                                            }} size="sm" variant="outline" className="flex-1 border-dashed border-white/20 hover:bg-white/5">+ Add Step</Button>
                                            <Button onClick={() => onSaveSequences?.(sequences)} size="sm" className="flex-1 bg-green-600 hover:bg-green-700">Save {type} Flow</Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>

                    {/* Editor Content Wrapper */}
                    {Object.entries(merged).map(([sectionKey, sectionData]: [string, any]) => {
                        if (sectionKey === 'rules' || sectionKey === 'financials') return null;
                        return (
                            <TabsContent key={sectionKey} value={sectionKey} className="mt-4 space-y-6 animate-in fade-in slide-in-from-bottom-2">
                                {Object.entries(sectionData).map(([key, val]: [string, any]) => (
                                    <div key={key} className="space-y-2 group">
                                        <div className="flex justify-between items-center">
                                            <label className="text-xs uppercase font-bold text-muted-foreground group-hover:text-blue-400 transition-colors">
                                                {key.replace(/_/g, ' ')}
                                            </label>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {commonVars.map(v => (
                                                    <VariableChip
                                                        key={v.value}
                                                        label={v.label}
                                                        value={v.value}
                                                        onInsert={(va) => insertVariable(sectionKey, key, va, val)}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                        <Textarea
                                            value={val}
                                            onChange={e => handleChange(sectionKey, key, e.target.value)}
                                            onFocus={() => handleFocus(val)}
                                            className="bg-black/30 border-white/10 min-h-[80px] focus:border-blue-500/50 transition-colors font-mono text-sm leading-relaxed"
                                        />
                                    </div>
                                ))}
                            </TabsContent>
                        );
                    })}
                </Tabs>
            </div >

            {/* Live Preview Area (Sticky) */}
            < div className="w-full lg:w-[380px] shrink-0" >
                <div className="sticky top-0 border-[10px] border-[#1c1c1e] rounded-[3rem] bg-[#17212b] h-[700px] shadow-2xl overflow-hidden relative">
                    {/* Phone Bezel Details */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-[#1c1c1e] rounded-b-xl z-20"></div>
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-1 bg-black/50 rounded-full z-30"></div>

                    {/* Status Bar */}
                    <div className="h-8 bg-[#17212b] w-full flex justify-between items-center px-6 text-white text-[10px] font-medium pt-2 z-10">
                        <span>9:41</span>
                        <div className="flex gap-1">
                            <Wifi className="w-3 h-3" />
                            <Battery className="w-3 h-3" />
                        </div>
                    </div>

                    {/* Chat Header */}
                    <div className="bg-[#17212b] border-b border-[#0e1621] p-3 flex items-center gap-3 z-10 shadow-sm relative">
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                            <Bot className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="font-bold text-sm text-white">Bingo Ethiopia</div>
                            <div className="text-[10px] text-blue-400">bot</div>
                        </div>
                    </div>

                    {/* Chat Area (Background Pattern) */}
                    <div className="h-full overflow-y-auto p-4 flex flex-col gap-4 pb-20 bg-[#0e1621] relative"
                        style={{
                            backgroundImage: 'radial-gradient(circle at center, #131b26 0%, #0e1621 100%)'
                        }}
                    >
                        <div className="text-center text-[10px] text-white/30 my-4 bg-black/20 py-1 rounded-full w-fit mx-auto px-3">
                            Today
                        </div>

                        {/* Sample User Message context */}
                        <div className="flex justify-end animate-in slide-in-from-right-4 fade-in duration-500 delay-100">
                            <div className="bg-[#2b5278] text-white p-3 rounded-lg rounded-tr-none text-sm max-w-[80%] shadow-sm">
                                /start or Button Click
                                <div className="text-[10px] text-white/40 text-right mt-1">9:40 AM</div>
                            </div>
                        </div>

                        {/* The Bot Replay (LIVE PREVIEW) */}
                        <div className="animate-in slide-in-from-left-4 fade-in duration-500">
                            <BotPreview text={previewText} hasButton={true} buttonText="Sample Action" />
                        </div>
                    </div>
                </div>

                <div className="mt-4 flex justify-end">
                    <Button onClick={() => onSave(data)} className="w-full bg-green-600 hover:bg-green-700 font-bold shadow-xl border border-green-400/20 py-6 text-lg">
                        <Save className="w-5 h-5 mr-2" /> Save Configuration
                    </Button>
                </div>
            </div >
        </div >
    );
}
