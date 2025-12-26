'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Shield, ShieldAlert, Ban, Hash, Smartphone, Clock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Mock Data for "God Mode"
const USER_DATA = {
    id: 'user-29384',
    username: 'cryptoking_et',
    phone: '+251911223344',
    joined: '2024-11-15',
    status: 'active',
    riskScore: 12, // Low risk
    balance: 4500.50,
    totalDeposited: 12000,
    totalWithdrawn: 8000,
    gamesPlayed: 142,
    winRate: '42%'
};

const ACTIVITY_DATA = [
    { date: 'Mon', balance: 4000 },
    { date: 'Tue', balance: 3500 },
    { date: 'Wed', balance: 5200 },
    { date: 'Thu', balance: 4800 },
    { date: 'Fri', balance: 6000 },
    { date: 'Sat', balance: 4500 },
    { date: 'Sun', balance: 4500.50 },
];

export default function UserProfilePage({ params }: { params: { id: string } }) {
    return (
        <div className="space-y-8 pb-20">
            {/* Header / Identity Card */}
            <div className="relative overflow-hidden rounded-3xl bg-black border border-white/10 p-8">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <Avatar className="w-24 h-24 ring-4 ring-white/10 shadow-2xl">
                            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${USER_DATA.username}`} />
                            <AvatarFallback>CK</AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl font-bold text-white">{USER_DATA.username}</h1>
                                <Badge variant="outline" className="border-green-500 text-green-500 bg-green-500/10">VERIFIED</Badge>
                            </div>
                            <div className="text-muted-foreground flex items-center gap-4 mt-2 font-mono text-sm">
                                <span className="flex items-center gap-1"><Hash className="w-3 h-3" /> {USER_DATA.id}</span>
                                <span className="flex items-center gap-1"><Smartphone className="w-3 h-3" /> {USER_DATA.phone}</span>
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Joined {USER_DATA.joined}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <div className="text-right mr-4">
                            <div className="text-xs text-muted-foreground uppercase tracking-wider">Risk Score</div>
                            <div className="text-2xl font-black text-green-400 flex items-center justify-end gap-2">
                                <Shield className="w-5 h-5" /> {USER_DATA.riskScore}/100
                            </div>
                        </div>
                        <Button variant="destructive" className="shadow-lg shadow-red-500/10">
                            <Ban className="w-4 h-4 mr-2" /> Ban User
                        </Button>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-card/50 backdrop-blur">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Wallet Balance</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{USER_DATA.balance.toLocaleString()} ETB</div></CardContent>
                </Card>
                <Card className="bg-card/50 backdrop-blur">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total P/L</CardTitle></CardHeader>
                    <CardContent className={USER_DATA.totalWithdrawn > USER_DATA.totalDeposited ? 'text-green-500' : 'text-red-500'}>
                        <div className="text-2xl font-bold">{(USER_DATA.totalWithdrawn - USER_DATA.totalDeposited).toLocaleString()} ETB</div>
                    </CardContent>
                </Card>
                <Card className="bg-card/50 backdrop-blur">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Win Rate</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{USER_DATA.winRate}</div></CardContent>
                </Card>
                <Card className="bg-card/50 backdrop-blur">
                    <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Games Played</CardTitle></CardHeader>
                    <CardContent><div className="text-2xl font-bold">{USER_DATA.gamesPlayed}</div></CardContent>
                </Card>
            </div>

            {/* Deep Dive Tabs */}
            <div className="grid md:grid-cols-3 gap-8">
                <Card className="md:col-span-2 shadow-xl border-none ring-1 ring-white/5 bg-card/40">
                    <CardHeader>
                        <CardTitle>Balance History</CardTitle>
                        <CardDescription>7-day financial tracking</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={ACTIVITY_DATA}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1f2937', borderColor: 'rgba(255,255,255,0.1)' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Line type="monotone" dataKey="balance" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="shadow-xl border-none ring-1 ring-white/5 bg-card/40">
                    <CardHeader>
                        <CardTitle>Security Logs</CardTitle>
                        <CardDescription>Recent IP and Device activity</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {[1, 2, 3].map((_, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5">
                                <div className="flex items-center gap-3">
                                    <ShieldAlert className="w-4 h-4 text-orange-500" />
                                    <div className="text-sm">
                                        <div className="font-medium text-white">Login Attempt</div>
                                        <div className="text-xs text-muted-foreground">IP: 192.168.1.{10 + i} from Addis Ababa</div>
                                    </div>
                                </div>
                                <div className="text-xs font-mono text-muted-foreground">2m ago</div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
