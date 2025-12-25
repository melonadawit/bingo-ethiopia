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
const MOCK_DATA = Array.from({ length: 30 }, (_, i) => ({
    date: format(new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000), 'MMM dd'),
    revenue: Math.floor(Math.random() * 5000) + 2000,
    payouts: Math.floor(Math.random() * 3000) + 1000,
    projected: Math.floor(Math.random() * 5000) + 2500 + (i * 100), // Slight upward trend
}));

const WHALE_TXS = [
    { id: 1, user: 'KingSolomon', type: 'deposit', amount: 50000, time: '2m ago' },
    { id: 2, user: 'LionOfJudah', type: 'withdrawal', amount: 25000, time: '15m ago' },
    { id: 3, user: 'CryptoWhale', type: 'deposit', amount: 120000, time: '1h ago' },
    { id: 4, user: 'BingoMaster', type: 'game_win', amount: 45000, time: '2h ago' },
];

export default function FinancePage() {
    const [range, setRange] = useState('30d');

    // Calculate totals
    const totalRev = MOCK_DATA.reduce((acc, curr) => acc + curr.revenue, 0);
    const totalPayout = MOCK_DATA.reduce((acc, curr) => acc + curr.payouts, 0);
    const profit = totalRev - totalPayout;
    const margin = ((profit / totalRev) * 100).toFixed(1);

    return (
        <div className="space-y-6 pb-20">
            {/* Ticker Tape */}
            <div className="bg-black/40 border border-white/5 rounded-lg overflow-hidden whitespace-nowrap p-2 flex gap-8 text-xs font-mono text-muted-foreground backdrop-blur-md">
                <span className="flex items-center gap-1 text-green-400"><TrendingUp className="w-3 h-3" /> BTC/ETB: 5,200,342</span>
                <span className="flex items-center gap-1 text-red-400"><TrendingDown className="w-3 h-3" /> USD/ETB: 121.5</span>
                <span className="flex items-center gap-1 text-green-400"><TrendingUp className="w-3 h-3" /> USDT/ETB: 124.2</span>
                <span className="flex items-center gap-1 text-blue-400"><Activity className="w-3 h-3" /> 24h Vol: 4.2M ETB</span>
            </div>

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
                    value="250k"
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
                    <CardContent className="h-[400px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={MOCK_DATA}>
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
                                {WHALE_TXS.map((tx) => (
                                    <div key={tx.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5 hover:border-white/20 transition-all group">
                                        <div className={cn(
                                            "p-2 rounded-full shrink-0",
                                            tx.type === 'deposit' ? "bg-green-500/10 text-green-500" :
                                                tx.type === 'withdrawal' ? "bg-red-500/10 text-red-500" :
                                                    "bg-yellow-500/10 text-yellow-500"
                                        )}>
                                            {tx.type === 'deposit' ? <ArrowDownLeft className="w-4 h-4" /> :
                                                tx.type === 'withdrawal' ? <ArrowUpRight className="w-4 h-4" /> :
                                                    <Trophy className="w-4 h-4" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="font-bold text-sm truncate text-white">{tx.user}</span>
                                                <span className="text-[10px] text-muted-foreground whitespace-nowrap">{tx.time}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <Badge variant="outline" className="text-[10px] h-5 px-1 uppercase border-white/10 text-white/50">{tx.type.replace('_', ' ')}</Badge>
                                                <span className={cn(
                                                    "font-mono font-bold text-sm",
                                                    tx.type === 'withdrawal' ? "text-red-400" : "text-green-400"
                                                )}>
                                                    {tx.amount.toLocaleString()} ETB
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
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
