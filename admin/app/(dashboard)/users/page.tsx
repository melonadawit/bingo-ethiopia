'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAdmin } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, MoreHorizontal, ShieldAlert, CheckCircle, User, Crown, Activity, Filter, Ban, Download } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface User {
    id: string; // UUID
    telegram_id: number;
    first_name: string;
    username?: string;
    balance: number;
    total_games_played: number;
    created_at: string;
    is_blocked?: boolean;
    last_active?: string; // Mocked
    vip_level?: string; // Mocked
    win_rate?: number; // Mocked
}

export default function UsersPage() {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const queryClient = useQueryClient();

    const actionMutation = useMutation({
        mutationFn: async ({ id, isBlocked }: { id: string, isBlocked: boolean }) => {
            return fetchAdmin(`/users/${id}/status`, {
                method: 'POST',
                body: JSON.stringify({ is_blocked: isBlocked })
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            toast.success("User status updated");
        }
    });

    const { data: users, isLoading } = useQuery<User[]>({
        queryKey: ['admin-users', search],
        queryFn: async () => {
            const res = await fetchAdmin(`/users?q=${search}`);
            // If API returns { users: [] } wrapper, handle it. currently returns array directly.
            return Array.isArray(res) ? res : (res.users || []);
        },
    });

    // Mock Segmentation (Client-side for demo)
    const activeCount = users?.length || 0;
    const whalesCount = users?.filter(u => u.balance > 1000).length || 0;
    const bannedCount = users?.filter(u => u.is_blocked).length || 0;
    const newCount = 12; // Mock

    // Filter Logic
    const filteredUsers = users?.filter(u => {
        if (statusFilter === 'active' && u.is_blocked) return false;
        if (statusFilter === 'banned' && !u.is_blocked) return false;
        if (statusFilter === 'vip' && u.balance < 1000) return false;
        return true;
    });

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-white">Users 360°</h1>
                    <p className="text-muted-foreground">Detailed player insights and audience segmentation.</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="border-white/10 bg-black/20 text-white/70">
                        <Download className="w-4 h-4 mr-2" />
                        Export CSV
                    </Button>
                </div>
            </div>

            {/* Segmentation Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <SegmentCard
                    title="Total Players"
                    value={activeCount}
                    icon={User}
                    color="text-blue-400"
                    bg="bg-blue-500/10"
                    desc="+12% this week"
                />
                <SegmentCard
                    title="Active (24h)"
                    value={Math.floor(activeCount * 0.6)}
                    icon={Activity}
                    color="text-green-400"
                    bg="bg-green-500/10"
                    desc="High engagement"
                />
                <SegmentCard
                    title="Whales (>1k ETB)"
                    value={whalesCount}
                    icon={Crown}
                    color="text-yellow-400"
                    bg="bg-yellow-500/10"
                    desc="Top spenders"
                />
                <SegmentCard
                    title="Restricted"
                    value={bannedCount}
                    icon={Ban}
                    color="text-red-400"
                    bg="bg-red-500/10"
                    desc="Fraud / Risk"
                />
            </div>

            {/* Filters Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center bg-black/40 border border-white/10 p-4 rounded-xl backdrop-blur-md">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                    <Input
                        placeholder="Search by ID, Username, Phone..."
                        className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-blue-500"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
                    <FilterButton active={statusFilter === 'all'} label="All Users" onClick={() => setStatusFilter('all')} />
                    <FilterButton active={statusFilter === 'active'} label="Active" onClick={() => setStatusFilter('active')} />
                    <FilterButton active={statusFilter === 'banned'} label="Banned" onClick={() => setStatusFilter('banned')} />
                    <FilterButton active={statusFilter === 'vip'} label="VIP Whales" onClick={() => setStatusFilter('vip')} icon={Crown} />
                </div>
            </div>

            {/* User Grid / Table */}
            <Card className="bg-black/40 border-white/10 backdrop-blur-xl overflow-hidden">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-white/5 text-white/50 text-xs uppercase tracking-wider font-semibold border-b border-white/5">
                                <tr>
                                    <th className="px-6 py-4">Player Identity</th>
                                    <th className="px-6 py-4">Wealth & Activity</th>
                                    <th className="px-6 py-4">Risk Profile</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {isLoading ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-white/30">Loading database...</td></tr>
                                ) : filteredUsers?.length === 0 ? (
                                    <tr><td colSpan={5} className="p-8 text-center text-white/30">No users found.</td></tr>
                                ) : filteredUsers?.map((user) => (
                                    <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="w-10 h-10 ring-2 ring-white/10">
                                                    <AvatarImage src={`https://api.dicebear.com/7.x/big-smile/svg?seed=${user.first_name}`} />
                                                    <AvatarFallback>{user.first_name[0]}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="font-bold text-white flex items-center gap-2">
                                                        {user.first_name}
                                                        {user.balance > 1000 && <Crown className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                                                    </div>
                                                    <div className="text-xs text-secondary-foreground font-mono">@{user.username || 'anon'} • ID: {user.telegram_id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-white font-mono font-medium">{user.balance.toFixed(2)} ETB</div>
                                            <div className="text-xs text-white/40">{user.total_games_played} Games Played</div>
                                            <div className="mt-1 w-24 h-1 bg-white/10 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-blue-500"
                                                    style={{ width: `${Math.min((user.total_games_played / 50) * 100, 100)}%` }}
                                                />
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {/* Mock Win Rate */}
                                            {(!user.win_rate || user.win_rate < 0.6) ? (
                                                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">Low Risk</Badge>
                                            ) : (
                                                <Badge variant="outline" className="bg-red-500/10 text-red-500 border-red-500/20">High Winner</Badge>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={cn(
                                                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
                                                user.is_blocked
                                                    ? "bg-red-950/30 text-red-500 border-red-500/30"
                                                    : "bg-green-950/30 text-green-500 border-green-500/30"
                                            )}>
                                                {user.is_blocked ? "BANNED" : "ACTIVE"}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-white/50 hover:text-white">
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="bg-black border-white/10">
                                                    <DropdownMenuItem onClick={() => actionMutation.mutate({ id: user.id, isBlocked: !user.is_blocked })}>
                                                        {user.is_blocked ? (
                                                            <><CheckCircle className="w-4 h-4 mr-2 text-green-500" /> Unban User</>
                                                        ) : (
                                                            <><Ban className="w-4 h-4 mr-2 text-red-500" /> Ban User</>
                                                        )}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem>
                                                        <Search className="w-4 h-4 mr-2" /> View Full Profile
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function SegmentCard({ title, value, icon: Icon, color, bg, desc }: any) {
    return (
        <Card className="bg-black/40 border-white/10 backdrop-blur-xl relative overflow-hidden group">
            <div className={cn("absolute right-0 top-0 p-3 rounded-bl-xl opacity-50 group-hover:opacity-100 transition-opacity", bg)}>
                <Icon className={cn("w-5 h-5", color)} />
            </div>
            <CardHeader className="pb-2">
                <CardTitle className="text-muted-foreground text-xs uppercase tracking-wider font-medium">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-black text-white">{value}</div>
                <div className="text-[10px] text-white/40 mt-1">{desc}</div>
            </CardContent>
        </Card>
    );
}

function FilterButton({ active, label, onClick, icon: Icon }: any) {
    return (
        <button
            onClick={onClick}
            className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap",
                active
                    ? "bg-white text-black shadow-lg shadow-white/10"
                    : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
            )}
        >
            {Icon && <Icon className="w-3 h-3" />}
            {label}
        </button>
    );
}
