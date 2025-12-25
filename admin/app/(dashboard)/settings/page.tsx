'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAdmin } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Save, AlertCircle, Power, Lock, MessageSquare, Timer, DollarSign, Database, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

export default function SettingsPage() {
    const queryClient = useQueryClient();
    const [configJson, setConfigJson] = useState('');
    const [version, setVersion] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Visual State
    const [maintenanceMode, setMaintenanceMode] = useState(false);
    const [chatEnabled, setChatEnabled] = useState(false);
    const [signupEnabled, setSignupEnabled] = useState(true);
    const [gameTimer, setGameTimer] = useState(30);

    const { data: currentConfig, isLoading } = useQuery({
        queryKey: ['admin-config'],
        queryFn: () => fetchAdmin('/config/latest'),
    });

    useEffect(() => {
        if (currentConfig) {
            const { rules, features, version } = currentConfig;
            setConfigJson(JSON.stringify({ rules, features }, null, 2));
            setVersion(version);

            // Sync Visuals
            setMaintenanceMode(features?.maintenance_mode || false);
            setChatEnabled(features?.chat_enabled || false);
            setSignupEnabled(features?.signup_enabled !== false);
            setGameTimer(rules?.ande_zig?.timer || 30);
        }
    }, [currentConfig]);

    const saveMutation = useMutation({
        mutationFn: async (jsonOverride?: string) => {
            try {
                // If overriding (Advanced JSON), use that. Else build from visual state.
                let rules, features;

                if (jsonOverride) {
                    const parsed = JSON.parse(jsonOverride);
                    rules = parsed.rules;
                    features = parsed.features;
                } else {
                    // Update from Visuals
                    const current = JSON.parse(configJson);
                    features = { ...current.features, maintenance_mode: maintenanceMode, chat_enabled: chatEnabled, signup_enabled: signupEnabled };
                    rules = { ...current.rules, ande_zig: { ...current.rules?.ande_zig, timer: gameTimer } };
                }

                const newVersion = generateNextVersion(version);

                return fetchAdmin('/config/update', {
                    method: 'POST',
                    body: JSON.stringify({
                        version: newVersion,
                        rules,
                        features
                    }),
                });
            } catch (e) {
                throw new Error('Invalid Configuration');
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-config'] });
            toast.success("System configuration updated successfully");
        },
        onError: (err) => {
            toast.error((err as Error).message);
        }
    });

    const generateNextVersion = (v: string) => {
        if (!v) return 'v1.0.1';
        const parts = v.replace('v', '').split('.');
        if (parts.length < 3) return v + '.1';
        parts[2] = (parseInt(parts[2]) + 1).toString();
        return 'v' + parts.join('.');
    };

    if (isLoading) return <div className="p-8">Loading control panel...</div>;

    return (
        <div className="space-y-6 pb-20">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
                        <Database className="w-8 h-8 text-blue-500" />
                        System Control
                    </h1>
                    <p className="text-muted-foreground">Manage global game rules, safety switches, and infrastructure.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono bg-blue-500/10 text-blue-400 border-blue-500/20 px-3 py-1">
                        ver: {version || 'v1.0.0'}
                    </Badge>
                    <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/20">
                        <Save className="h-4 w-4 mr-2" />
                        Deploy Changes
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="visual" className="space-y-6">
                <TabsList className="bg-black/40 border border-white/10 p-1 rounded-xl">
                    <TabsTrigger value="visual" className="data-[state=active]:bg-white/10 text-xs">Visual Editor</TabsTrigger>
                    <TabsTrigger value="json" className="data-[state=active]:bg-white/10 text-xs font-mono">JSON Source</TabsTrigger>
                </TabsList>

                <TabsContent value="visual" className="space-y-6">
                    {/* Critical Switches */}
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
                            <CardHeader className="pb-3"><CardTitle className="text-sm">Maintenance</CardTitle></CardHeader>
                            <CardContent className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <Label className="text-base font-medium text-white">System Lock</Label>
                                    <p className="text-xs text-muted-foreground">Stop all new games</p>
                                </div>
                                <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} className="data-[state=checked]:bg-red-500" />
                            </CardContent>
                        </Card>
                        <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
                            <CardHeader className="pb-3"><CardTitle className="text-sm">Access</CardTitle></CardHeader>
                            <CardContent className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <Label className="text-base font-medium text-white">Public Signup</Label>
                                    <p className="text-xs text-muted-foreground">Allow new registrations</p>
                                </div>
                                <Switch checked={signupEnabled} onCheckedChange={setSignupEnabled} className="data-[state=checked]:bg-green-500" />
                            </CardContent>
                        </Card>
                        <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
                            <CardHeader className="pb-3"><CardTitle className="text-sm">Engagement</CardTitle></CardHeader>
                            <CardContent className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <Label className="text-base font-medium text-white">Global Chat</Label>
                                    <p className="text-xs text-muted-foreground">Lobby chat system</p>
                                </div>
                                <Switch checked={chatEnabled} onCheckedChange={setChatEnabled} className="data-[state=checked]:bg-blue-500" />
                            </CardContent>
                        </Card>
                    </div>

                    {/* Game Rules */}
                    <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Timer className="w-5 h-5 text-yellow-500" />
                                Game Parameters (Ande Zig)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-6 md:grid-cols-2">
                                <div className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/5">
                                    <div className="flex justify-between">
                                        <Label>Turn Timer</Label>
                                        <span className="font-mono font-bold text-yellow-400">{gameTimer}s</span>
                                    </div>
                                    <Input
                                        type="range" min="15" max="90" step="5"
                                        value={gameTimer}
                                        onChange={(e) => setGameTimer(parseInt(e.target.value))}
                                        className="h-2 bg-white/10 accent-yellow-500"
                                    />
                                    <p className="text-xs text-muted-foreground">Seconds allowed per number call.</p>
                                </div>
                                <div className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/5 opacity-50 pointer-events-none">
                                    <div className="flex justify-between">
                                        <Label>Entry Fee (Coming Soon)</Label>
                                        <span className="font-mono font-bold text-green-400">10 ETB</span>
                                    </div>
                                    <Input type="range" disabled className="h-2 bg-white/10" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Danger Zone */}
                    <Card className="border-red-900/50 bg-red-950/10 backdrop-blur-xl">
                        <CardHeader>
                            <CardTitle className="text-red-500 flex items-center gap-2">
                                <AlertCircle className="w-5 h-5" />
                                Danger Zone
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-wrap gap-4">
                            <Button variant="destructive" size="sm" onClick={() => toast.error("Feature disabled in production")} className="bg-red-900/50 hover:bg-red-900 text-red-200 border border-red-500/30">
                                <Power className="w-4 h-4 mr-2" />
                                Restart Game Workers
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => toast.error("Super Admin authorization required")} className="bg-red-900/50 hover:bg-red-900 text-red-200 border border-red-500/30">
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Flush Redis Cache
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="json">
                    <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
                        <CardHeader>
                            <CardTitle className="font-mono text-sm">config.json</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <textarea
                                className="w-full h-[500px] font-mono text-xs p-4 rounded-xl bg-black border border-white/10 text-green-400 focus:outline-none focus:ring-2 focus:ring-green-500/50"
                                value={configJson}
                                onChange={(e) => setConfigJson(e.target.value)}
                            />
                            <div className="mt-4 flex justify-end">
                                <Button onClick={() => saveMutation.mutate(configJson)} className="bg-white/10 hover:bg-white/20">
                                    Save Raw JSON
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
