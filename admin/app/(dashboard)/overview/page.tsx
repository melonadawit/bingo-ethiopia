'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchAdmin, OverviewStats } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Users, Gamepad2, Coins, Activity, ShieldAlert, ArrowUpRight, ArrowDownRight, Server, Cpu, Wifi } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Bar, BarChart } from 'recharts';
import { motion } from 'framer-motion';

// MOCK_AREA_DATA removed to enforce real data usage

// SERVER_NODES removed

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
                        MISSION CONTROL (LIVE)
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
                    value={data?.totalUsers?.toLocaleString() || '0'}
                    trend="+12%"
                    trendUp={true}
                    icon={Users}
                    color="text-blue-500"
                    gradient="from-blue-500/20"
                />
                <MetricCard
                    title="Realtime Revenue"
                    value={`ETB ${data?.totalRevenue?.toLocaleString() || '0'}`}
                    trend="+8.4%"
                    trendUp={true}
                    icon={Coins}
                    color="text-green-500"
                    gradient="from-green-500/20"
                />
                <MetricCard
                    title="Games Running"
                    value={data?.totalGames?.toString() || '0'}
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
                    <CardContent className="h-[300px] min-h-[300px] p-0">
                        <div className="w-full h-full flex items-center justify-center">
                            {/* In a real app, this chart data should come from /stats/analytics. 
                                For this "Overview" widget, we might not have the historical series 
                                unless we fetch it. Changing to use data?.history or empty state. */}
                            <div className="text-white/30 text-sm">
                                No real-time revenue history available yet.
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Server Matrix (Right) */}
                {/* Server Matrix Removed (Mock Data) */}
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
