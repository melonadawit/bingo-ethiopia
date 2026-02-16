'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAdmin } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Shield, Ban, Hash, Smartphone, Clock, Loader2, ArrowLeft, TrendingUp, TrendingDown, History } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function UserProfilePage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { id } = params;

    const { data: user, isLoading, error } = useQuery({
        queryKey: ['admin-user', id],
        queryFn: () => fetchAdmin(`/users/${id}`),
        enabled: !!id && id !== 'demo'
    });

    const actionMutation = useMutation({
        mutationFn: async ({ id, isBlocked }: { id: string; isBlocked: boolean }) => {
            return fetchAdmin(`/users/${id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ is_blocked: isBlocked })
            });
        },
        onSuccess: (_, variables) => {
            toast.success(variables.isBlocked ? 'User banned successfully' : 'User unbanned successfully');
            queryClient.invalidateQueries({ queryKey: ['admin-user', id] });
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
        onError: () => toast.error('Failed to update user status')
    });

    if (id === 'demo') {
        return <div className="p-8 text-center text-white/30">Demo mode not available for specific IDs. Search and click a real user.</div>;
    }

    if (isLoading) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                <p className="text-white/50 font-mono">Accessing Player Database...</p>
            </div>
        );
    }

    if (error || !user) {
        return (
            <div className="p-8 text-center">
                <p className="text-red-500">Error loading user profile.</p>
                <Button onClick={() => router.back()} variant="link" className="text-white/50 mt-4">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Go Back
                </Button>
            </div>
        );
    }

    const activityData = user.transactions?.slice(0, 10).reverse().map((t: any) => ({
        date: format(new Date(t.created_at), 'HH:mm'),
        balance: t.balance_after
    })) || [];

    return (
        <div className="space-y-8 pb-20">
            {/* Back Button */}
            <Button onClick={() => router.back()} variant="ghost" className="text-white/50 hover:text-white -ml-4">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Users
            </Button>

            {/* Header / Identity Card */}
            <div className="relative overflow-hidden rounded-3xl bg-black border border-white/10 p-8 shadow-2xl">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <Avatar className="w-24 h-24 ring-4 ring-white/10 shadow-2xl">
                            <AvatarImage src={`https://api.dicebear.com/7.x/big-smile/svg?seed=${user.first_name}`} />
                            <AvatarFallback>{user.first_name?.[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-3xl font-black text-white">{user.first_name}</h1>
                                {user.is_registered ? (
                                    <Badge variant="outline" className="border-green-500 text-green-500 bg-green-500/10 uppercase tracking-widest text-[10px] font-bold">Verified</Badge>
                                ) : (
                                    <Badge variant="outline" className="border-yellow-500 text-yellow-500 bg-yellow-500/10 uppercase tracking-widest text-[10px] font-bold">Unregistered</Badge>
                                )}
                                {user.is_blocked && (
                                    <Badge variant="destructive" className="uppercase tracking-widest text-[10px] font-bold">Banned</Badge>
                                )}
                            </div>
                            <div className="text-muted-foreground flex flex-wrap items-center gap-4 mt-3 font-mono text-xs">
                                <span className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" /> ID: {user.telegram_id}</span>
                                <span className="flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5" /> {user.phone_number || 'No Phone'}</span>
                                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Joined {format(new Date(user.created_at), 'PPP')}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="text-right">
                            <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold mb-1">Risk Analysis</div>
                            <div className={user.stats?.totalProfit > 5000 ? "text-2xl font-black text-red-500 flex items-center justify-end gap-2" : "text-2xl font-black text-green-400 flex items-center justify-end gap-2"}>
                                <Shield className="w-5 h-5" /> {user.stats?.totalProfit > 5000 ? 'High' : 'Low'}
                            </div>
                        </div>
                        <Button
                            variant={user.is_blocked ? "outline" : "destructive"}
                            className="shadow-lg font-bold"
                            onClick={() => {
                                if (confirm(`Are you sure you want to ${user.is_blocked ? 'unban' : 'ban'} this account?`)) {
                                    actionMutation.mutate({ id: user.id, isBlocked: !user.is_blocked });
                                }
                            }}
                            disabled={actionMutation.isPending}
                        >
                            {actionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : (user.is_blocked ? "Unban Account" : "Ban Account")}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-white/5 border-white/10">
                    <CardHeader className="pb-2"><CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Active Balance</CardTitle></CardHeader>
                    <CardContent><div className="text-3xl font-black text-white">{Number(user.balance).toLocaleString()} <span className="text-sm font-normal text-white/30">ETB</span></div></CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10">
                    <CardHeader className="pb-2"><CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Net Outcome</CardTitle></CardHeader>
                    <CardContent>
                        <div className={`text-3xl font-black flex items-center gap-2 ${user.stats?.totalProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            {user.stats?.totalProfit >= 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                            {Math.abs(user.stats?.totalProfit).toLocaleString()} <span className="text-sm font-normal opacity-40">ETB</span>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10">
                    <CardHeader className="pb-2"><CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Total Turnover</CardTitle></CardHeader>
                    <CardContent><div className="text-3xl font-black text-white">{Number(user.stats?.totalBets).toLocaleString()} <span className="text-sm font-normal text-white/30">ETB</span></div></CardContent>
                </Card>
                <Card className="bg-white/5 border-white/10">
                    <CardHeader className="pb-2"><CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Games Played</CardTitle></CardHeader>
                    <CardContent><div className="text-3xl font-black text-white">{user.total_games_played} <span className="text-sm font-normal text-white/30">Plays</span></div></CardContent>
                </Card>
            </div>

            {/* Main Visuals Area */}
            <div className="grid md:grid-cols-3 gap-8">
                <Card className="md:col-span-2 bg-black/40 border-white/10 backdrop-blur-xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-blue-400" />
                            Recent Balance Volatility
                        </CardTitle>
                        <CardDescription>Live tracking of user liquidity shifts.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[350px] p-4">
                        {activityData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={activityData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                    <XAxis dataKey="date" stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#666" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#000', border: '1px solid #333', borderRadius: '12px' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Line type="monotone" dataKey="balance" stroke="#3b82f6" strokeWidth={4} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-white/20 font-mono">No recent transaction history found.</div>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-black/40 border-white/10 backdrop-blur-xl flex flex-col">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-white flex items-center gap-2">
                            <History className="w-5 h-5 text-purple-400" />
                            Global Ledger
                        </CardTitle>
                        <CardDescription>Latest financial events from this player.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto max-h-[400px] p-4 pt-0">
                        <div className="space-y-3">
                            {user.transactions?.length > 0 ? (
                                user.transactions.map((tx: any, i: number) => (
                                    <div key={tx.id || i} className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${tx.amount > 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                {tx.amount > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold text-white capitalize">{tx.type.replace('_', ' ')}</div>
                                                <div className="text-[10px] text-white/40 font-mono">{format(new Date(tx.created_at), 'MMM dd, HH:mm')}</div>
                                            </div>
                                        </div>
                                        <div className={`text-sm font-black font-mono ${tx.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                            {tx.amount > 0 ? '+' : ''}{tx.amount}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-10 text-white/20 font-mono text-sm">No transaction logs available.</div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
