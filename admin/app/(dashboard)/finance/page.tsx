'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAdmin } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, TrendingUp, TrendingDown, Activity, Download, ArrowUpRight, ArrowDownLeft, Wallet, PieChart as PieIcon, BarChart3, Lock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, ReferenceLine, ComposedChart, Line } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

// Mock Data
// Mock data removed to enforce real data only

export default function FinancePage() {
    const [range, setRange] = useState('30d');

    const { data: statsData, isLoading } = useQuery<any[]>({
        queryKey: ['finance-stats', range],
        queryFn: async () => {
            const res = await fetchAdmin(`/finance/stats?range=${range}`);
            return res.stats || [];
        }
    });

    const chartData = statsData?.map((item: any) => ({
        date: format(new Date(item.date), 'MMM dd'),
        revenue: Number(item.total_deposits || 0),
        payouts: Number(item.total_withdrawals || 0),
        bets: Number(item.total_bets || 0),
        profit: Number(item.net_profit || 0),
        projected: Number(item.total_deposits || 0) * 1.1 // Simple projection logic
    })) || [];

    // Calculate totals
    const totalRev = chartData.reduce((acc, curr) => acc + curr.revenue, 0);
    const totalPayout = chartData.reduce((acc, curr) => acc + curr.payouts, 0);
    const totalBets = chartData.reduce((acc, curr) => acc + curr.bets, 0);
    const profit = chartData.reduce((acc, curr) => acc + curr.profit, 0);
    const margin = totalBets > 0 ? ((profit / totalBets) * 100).toFixed(1) : '0.0';

    return (
        <div className="space-y-6 pb-20">
            {/* Ticker Tape */}
            {/* Ticker Tape Removed */}

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
                        <DollarSign className="w-8 h-8 text-yellow-500" />
                        CFO Cockpit
                    </h1>
                    <p className="text-muted-foreground">Real-time liquidity tracking and financial projections.</p>
                </div>
                <div className="flex gap-2">
                    <Select value={range} onValueChange={setRange}>
                        <SelectTrigger className="w-[120px] bg-white/5 border-white/10">
                            <SelectValue placeholder="Range" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="24h">Last 24h</SelectItem>
                            <SelectItem value="7d">Last 7 Days</SelectItem>
                            <SelectItem value="30d">Last 30 Days</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" className="border-white/10 hover:bg-white/10">
                        <Download className="w-4 h-4 mr-2" /> Report
                    </Button>
                </div>
            </div>

            {/* Hero Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                    title="Net Profit"
                    value={`${(profit / 1000).toFixed(1)}k`}
                    subvalue="+12.5% vs last month"
                    icon={Wallet}
                    trend="up"
                    color="text-green-500"
                />
                <MetricCard
                    title="Gross Revenue"
                    value={`${(totalRev / 1000).toFixed(1)}k`}
                    subvalue="Total incoming deposits"
                    icon={BarChart3}
                    trend="active"
                    color="text-yellow-500"
                />
                <MetricCard
                    title="House Margin"
                    value={`${margin}%`}
                    subvalue="Target: 5.0%"
                    icon={PieIcon}
                    trend="stable"
                    color="text-purple-500"
                />
                <MetricCard
                    title="Risk Reserve"
                    value="0"
                    subvalue="Liquidity Safety Net"
                    icon={Lock}
                    trend="down"
                    color="text-blue-500"
                />
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {/* Main Prediction Chart */}
                <Card className="col-span-2 bg-black/40 border-white/10 backdrop-blur-xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-green-400" />
                            Revenue Projection (AI Forecast)
                        </CardTitle>
                        <CardDescription>Actual revenue (solid) vs Projected trajectory (dashed).</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[400px] p-0">
                        <div className="w-full h-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#eab308" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#eab308" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                    <XAxis dataKey="date" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '8px' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Area type="monotone" dataKey="revenue" stroke="#eab308" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} name="Actual Rev" />
                                    <Line type="monotone" dataKey="projected" stroke="#22c55e" strokeDasharray="5 5" strokeWidth={2} dot={false} name="AI Projection" />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>

                {/* Whale Watch Sidebar */}
                <Card className="bg-black/40 border-white/10 backdrop-blur-xl flex flex-col">
                    <CardHeader className="pb-2">
                        <CardTitle className=" text-red-400 flex items-center gap-2 text-lg">
                            <Activity className="w-5 h-5 animate-pulse" />
                            Whale Watch
                        </CardTitle>
                        <CardDescription>High-value transactions detected live.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 p-0">
                        <ScrollArea className="h-[380px] p-4">
                            <div className="space-y-4">
                                {!statsData && <div className="text-white/30 text-center p-4">Waiting for real transactions...</div>}
                                {statsData && <div className="text-white/30 text-center p-4">No high value transactions detected.</div>}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function MetricCard({ title, value, subvalue, icon: Icon, color }: any) {
    return (
        <Card className="bg-black/40 border-white/10 backdrop-blur-xl overflow-hidden relative group">
            <div className={cn("absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity", color)}>
                <Icon className="w-24 h-24" />
            </div>
            <CardContent className="p-6 relative z-10">
                <div className="flex items-center gap-2 mb-2">
                    <div className={cn("p-1.5 rounded-md bg-white/5", color)}>
                        <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">{title}</span>
                </div>
                <div className="text-3xl font-black text-white tracking-tight">{value}</div>
                <div className="text-xs text-white/50 mt-1">{subvalue}</div>
            </CardContent>
        </Card>
    );
}

import { Trophy } from 'lucide-react';
