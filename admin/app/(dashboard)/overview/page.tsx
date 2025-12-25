'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchAdmin, OverviewStats } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, Gamepad2, Coins, Activity, ShieldAlert, ArrowUpRight, ArrowDownRight, Server, Cpu, Wifi } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart } from 'recharts';
import { motion } from 'framer-motion';

const MOCK_AREA_DATA = [
    { time: '00:00', revenue: 4000, traffic: 240 },
    { time: '04:00', revenue: 3000, traffic: 139 },
    { time: '08:00', revenue: 2000, traffic: 980 },
    { time: '12:00', revenue: 2780, traffic: 390 },
    { time: '16:00', revenue: 1890, traffic: 480 },
    { time: '20:00', revenue: 2390, traffic: 380 },
    { time: '24:00', revenue: 3490, traffic: 430 },
];

const SERVER_NODES = [
    { id: 'SVR-01', location: 'Addis Ababa', status: 'online', load: 45, users: 1240 },
    { id: 'SVR-02', location: 'Adama', status: 'high_load', load: 88, users: 890 },
    { id: 'SVR-03', location: 'Hawassa', status: 'online', load: 32, users: 450 },
    { id: 'DB-01', location: 'Primary DB', status: 'online', load: 12, users: 0 },
];

export default function OverviewPage() {
    const { data, isLoading } = useQuery<OverviewStats>({
        queryKey: ['admin-overview'],
        queryFn: () => fetchAdmin('/stats/overview'), // Fallback to mock if fails
        refetchInterval: 10000,
    });

    return (
        <div className="space-y-8 pb-20">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-white/50">
                        MISSION CONTROL
                    </h1>
                    <p className="text-muted-foreground font-mono text-xs uppercase tracking-widest mt-1">
                        System Status: <span className="text-green-500 animate-pulse">OPTIMAL</span>
                    </p>
                </div>
                <div className="flex gap-2">
                    <div className="bg-black/40 border border-white/10 rounded-lg px-4 py-2 flex items-center gap-2">
                        <Wifi className="w-4 h-4 text-green-500" />
                        <span className="text-xs font-mono">Ping: 24ms</span>
                    </div>
                    <div className="bg-black/40 border border-white/10 rounded-lg px-4 py-2 flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-blue-500" />
                        <span className="text-xs font-mono">CPU: 12%</span>
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid gap-4 md:grid-cols-4">
                <MetricCard
                    title="Active Players"
                    value={data?.totalUsers || '2,543'}
                    trend="+12%"
                    trendUp={true}
                    icon={Users}
                    color="text-blue-500"
                    gradient="from-blue-500/20"
                />
                <MetricCard
                    title="Realtime Revenue"
                    value={`ETB ${data?.totalRevenue || '45.2k'}`}
                    trend="+8.4%"
                    trendUp={true}
                    icon={Coins}
                    color="text-green-500"
                    gradient="from-green-500/20"
                />
                <MetricCard
                    title="Games Running"
                    value={data?.totalGames || '142'}
                    trend="-2%"
                    trendUp={false}
                    icon={Gamepad2}
                    color="text-purple-500"
                    gradient="from-purple-500/20"
                />
                <MetricCard
                    title="Server Health"
                    value="98.2%"
                    trend="Stable"
                    icon={Activity}
                    color="text-indigo-500"
                    gradient="from-indigo-500/20"
                />
            </div>

            {/* Main Dashboard Grid */}
            <div className="grid gap-6 md:grid-cols-7">
                {/* Revenue Chart (Big) */}
                <Card className="col-span-4 bg-black/40 border-white/10 backdrop-blur-xl shadow-2xl">
                    <CardHeader>
                        <CardTitle className="flex justify-between items-center">
                            <span>Revenue Flow</span>
                            <div className="flex gap-2 text-xs">
                                <span className="px-2 py-1 bg-white/10 rounded cursor-pointer hover:bg-white/20">1H</span>
                                <span className="px-2 py-1 bg-white/10 rounded cursor-pointer hover:bg-white/20">24H</span>
                                <span className="px-2 py-1 bg-primary text-primary-foreground rounded cursor-pointer">7D</span>
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px] min-h-[300px]">
                        <div style={{ width: '100%', height: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={MOCK_AREA_DATA}>
                                    <defs>
                                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="time" stroke="#525252" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#525252" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `ETB ${value}`} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '8px' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRev)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Server Matrix (Right) */}
                <Card className="col-span-3 bg-black/40 border-white/10 backdrop-blur-xl shadow-2xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Server className="w-5 h-5 text-indigo-400" />
                            Infrastructure Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {SERVER_NODES.map((node) => (
                            <div key={node.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 hover:border-white/10 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={cn(
                                        "w-2 h-2 rounded-full shadow-[0_0_8px]",
                                        node.status === 'online' ? "bg-green-500 shadow-green-500/50" : "bg-red-500 shadow-red-500/50 animate-pulse"
                                    )} />
                                    <div>
                                        <div className="text-sm font-bold text-white">{node.location}</div>
                                        <div className="text-[10px] text-muted-foreground font-mono">{node.id}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs font-mono text-white/80">{node.load}% Load</div>
                                    <div className="w-24 h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
                                        <div
                                            className={cn("h-full rounded-full transition-all duration-1000", node.load > 80 ? 'bg-red-500' : 'bg-blue-500')}
                                            style={{ width: `${node.load}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function MetricCard({ title, value, trend, trendUp, icon: Icon, color, gradient }: any) {
    return (
        <Card className="relative overflow-hidden border-none bg-black/40 backdrop-blur-md shadow-lg group hover:-translate-y-1 transition-transform">
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
                <Icon className={cn("h-4 w-4", color)} />
            </CardHeader>
            <CardContent className="relative z-10">
                <div className="text-2xl font-bold text-white">{value}</div>
                <p className={cn("text-xs font-medium flex items-center mt-1", trendUp ? "text-green-500" : (trend === 'Stable' ? 'text-gray-500' : "text-red-500"))}>
                    {trend !== 'Stable' && (trendUp ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />)}
                    {trend} {trend !== 'Stable' && 'from last month'}
                </p>
            </CardContent>
        </Card>
    )
}
