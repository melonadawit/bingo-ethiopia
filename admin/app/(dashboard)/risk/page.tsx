'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAdmin } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldAlert, Fingerprint, Map, Users, AlertTriangle, Eye, Lock, Globe } from 'lucide-react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Mock Data for "Risk Radar"
const MOCK_RADAR_DATA = [
    { subject: 'IP Collisions', A: 120, B: 110, fullMark: 150 },
    { subject: 'Win Anomalies', A: 98, B: 130, fullMark: 150 },
    { subject: 'Fast Deposits', A: 86, B: 130, fullMark: 150 },
    { subject: 'Withdrawal Speed', A: 99, B: 100, fullMark: 150 },
    { subject: 'Device Spoofing', A: 85, B: 90, fullMark: 150 },
    { subject: 'Location Jumps', A: 65, B: 85, fullMark: 150 },
];

export default function RiskPage() {
    const { data: riskData, isLoading } = useQuery({
        queryKey: ['admin-risk-scan'],
        queryFn: () => {
            // Mock backend response for now
            return {
                alerts: [
                    { id: 1, type: 'critical', user: 'DawitAB', message: 'Shared IP with Banned User (ID: 992)', time: '2m ago' },
                    { id: 2, type: 'warning', user: 'FunnyGuy22', message: 'Win rate > 95% in last 10 games', time: '15m ago' },
                    { id: 3, type: 'info', user: 'NewPlayer_X', message: 'Login detected from new device (iphone 15)', time: '1h ago' },
                ],
                blacklisted_ips: 142,
                flagged_users: 15,
            };
        },
        refetchInterval: 5000
    });

    const alerts = riskData?.alerts || [];

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 bg-red-950/20 p-6 rounded-2xl border border-red-900/50 relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-3xl font-black tracking-tight text-red-500 flex items-center gap-3">
                        <ShieldAlert className="w-8 h-8" />
                        RISK HQ
                    </h1>
                    <p className="text-red-400/60 font-medium">Fraud Detection & Security Response</p>
                </div>
                <div className="flex items-center gap-3 relative z-10">
                    <div className="bg-red-900/40 backdrop-blur px-4 py-2 rounded-xl border border-red-500/20 text-center">
                        <div className="text-[10px] text-red-300 uppercase tracking-wider">Threat Level</div>
                        <div className="text-lg font-bold text-red-500 animate-pulse">ELEVATED</div>
                    </div>
                </div>
            </div>

            {/* Dashboard Grid */}
            <div className="grid gap-6 md:grid-cols-7">

                {/* Visual Radar */}
                <Card className="col-span-3 bg-[#0e1621]/40 border-white/10 backdrop-blur-xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-white">
                            <Fingerprint className="w-5 h-5 text-blue-400" />
                            Security Radar
                        </CardTitle>
                        <CardDescription>Real-time anomaly detection vectors.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px] relative">
                        <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={MOCK_RADAR_DATA}>
                                <PolarGrid stroke="#ffffff10" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }} />
                                <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                                <Radar
                                    name="Risk Level"
                                    dataKey="A"
                                    stroke="#ec4899"
                                    strokeWidth={2}
                                    fill="#ec4899"
                                    fillOpacity={0.3}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Threat Feed */}
                <Card className="col-span-4 bg-[#0e1621]/40 border-white/10 backdrop-blur-xl flex flex-col">
                    <CardHeader className="flex-none">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-white">
                                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                                Live Threat Feed
                            </CardTitle>
                            <Badge variant="outline" className="text-red-400 border-red-500/30 bg-red-950/20 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                MONITORING
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                        {alerts.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50">
                                <ShieldAlert className="w-12 h-12 mb-3" />
                                <p>No active threats detected.</p>
                            </div>
                        ) : (
                            alerts.map((alert: any) => (
                                <div key={alert.id} className="group relative overflow-hidden bg-black/20 hover:bg-white/5 border border-white/5 hover:border-white/10 p-4 rounded-xl transition-all duration-300">
                                    <div className="flex gap-4">
                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/5 shadow-inner",
                                            alert.type === 'critical' ? "bg-red-500/10 text-red-500" :
                                                alert.type === 'warning' ? "bg-orange-500/10 text-orange-500" :
                                                    "bg-blue-500/10 text-blue-500"
                                        )}>
                                            {alert.type === 'critical' ? <ShieldAlert className="w-5 h-5" /> :
                                                alert.type === 'warning' ? <AlertTriangle className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className="font-bold text-white text-sm truncate pr-2 group-hover:text-blue-400 transition-colors">{alert.user}</h4>
                                                <span className="text-[10px] font-mono text-white/30 whitespace-nowrap">{alert.time}</span>
                                            </div>
                                            <p className="text-xs text-white/60 leading-relaxed">{alert.message}</p>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                                        <Button size="sm" variant="outline" className="h-7 text-[10px] border-white/10 hover:bg-white/10">Analyze</Button>
                                        <Button size="sm" variant="destructive" className="h-7 text-[10px] bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/20">Action</Button>
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Global Metrics */}
            <div className="grid gap-4 md:grid-cols-4">
                <MetricCard title="Blacklisted IPs" value="142" icon={Globe} desc="+12 today" color="text-red-500" />
                <MetricCard title="Account Flags" value="15" icon={Users} desc="Pending Review" color="text-orange-500" />
                <MetricCard title="Bot Detection" value="98%" icon={Fingerprint} desc="Filtering Rate" color="text-blue-500" />
                <MetricCard title="System Integrity" value="Secure" icon={Lock} desc="No Breach Detected" color="text-green-500" />
            </div>
        </div>
    );
}

function MetricCard({ title, value, icon: Icon, desc, color }: any) {
    return (
        <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
            <CardContent className="p-6 flex items-center gap-4">
                <div className={cn("p-3 rounded-xl bg-white/5 border border-white/5", color)}>
                    <Icon className="w-6 h-6" />
                </div>
                <div>
                    <div className="text-2xl font-black text-white">{value}</div>
                    <div className="text-xs font-medium text-white/50">{title}</div>
                    <div className="text-[10px] text-white/30 mt-1">{desc}</div>
                </div>
            </CardContent>
        </Card>
    );
}
