'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAdmin } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, FileJson, User, Shield, Calendar, Download, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface AuditLog {
    id: string;
    admin_email: string;
    action: string;
    target_resource: string;
    payload: any;
    created_at: string;
}

export default function AuditPage() {
    const [search, setSearch] = useState('');

    // Mock Data for now as API might not populate enough variety
    const MOCK_LOGS: AuditLog[] = [
        { id: '1', admin_email: 'dawit@bingo.et', action: 'UPDATE_CONFIG', target_resource: 'GameRules', payload: { changes: 'Timer: 30s -> 45s' }, created_at: new Date().toISOString() },
        { id: '2', admin_email: 'system', action: 'AUTO_BAN', target_resource: 'User:992', payload: { reason: 'Risk Score > 90' }, created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
        { id: '3', admin_email: 'helen@bingo.et', action: 'APPROVE_WITHDRAWAL', target_resource: 'TX:8873', payload: { amount: 5000 }, created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
        { id: '4', admin_email: 'dawit@bingo.et', action: 'USER_UNBAN', target_resource: 'User:443', payload: { reason: 'Appeal accepted' }, created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString() },
        { id: '5', admin_email: 'alex@bingo.et', action: 'CREATE_CAMPAIGN', target_resource: 'Mkt:WelcomeBonus', payload: { budget: 10000 }, created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
    ];

    const { data: logs, isLoading } = useQuery({
        queryKey: ['admin-audit', search],
        queryFn: () => MOCK_LOGS, // Replace with fetchAdmin(`/audit?q=${search}`) when ready
    });

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                        <FileJson className="w-8 h-8 text-purple-400" />
                        Audit Trail
                    </h1>
                    <p className="text-muted-foreground">Immutable record of all administrative actions.</p>
                </div>
                <Button variant="outline" className="border-white/10 hover:bg-white/10">
                    <Download className="w-4 h-4 mr-2" />
                    Export Logs
                </Button>
            </div>

            {/* Filter Bar */}
            <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
                <CardContent className="p-4 flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search logs by admin, action, or target..."
                            className="pl-9 bg-white/5 border-white/10 text-white"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <Button variant="secondary" className="bg-white/10 hover:bg-white/20 text-white">
                        <Filter className="w-4 h-4 mr-2" />
                        Filters
                    </Button>
                    <Button variant="secondary" className="bg-white/10 hover:bg-white/20 text-white">
                        <Calendar className="w-4 h-4 mr-2" />
                        Date Range
                    </Button>
                </CardContent>
            </Card>

            {/* Timeline Feed */}
            <div className="space-y-6 relative before:absolute before:inset-y-0 before:left-8 before:w-px before:bg-white/10">
                {isLoading ? (
                    <div className="pl-20 text-muted-foreground">Loading audit history...</div>
                ) : logs?.map((log, index) => (
                    <div key={log.id} className="relative flex items-start gap-6 group">
                        {/* Timeline Connector */}
                        <div className="absolute left-8 -translate-x-1/2 w-4 h-4 rounded-full bg-black border-2 border-white/20 group-hover:border-purple-500 transition-colors z-10 box-content">
                            <div className="w-2 h-2 rounded-full bg-white/50 m-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>

                        <div className="pl-16 w-full">
                            <Card className="bg-black/40 border-white/10 backdrop-blur-sm hover:bg-white/5 transition-colors">
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="w-8 h-8 ring-1 ring-white/10">
                                                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${log.admin_email}`} />
                                                <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-white text-sm">{log.admin_email}</span>
                                                    <Badge variant="outline" className="text-[10px] h-5 border-white/10 text-muted-foreground">
                                                        {log.action}
                                                    </Badge>
                                                </div>
                                                <div className="text-xs text-muted-foreground">{format(new Date(log.created_at), 'MMM d, yyyy • h:mm a')}</div>
                                            </div>
                                        </div>
                                        <Badge variant="secondary" className="font-mono text-xs bg-white/5 text-white/70">
                                            {log.target_resource}
                                        </Badge>
                                    </div>

                                    <div className="mt-3 p-3 rounded bg-black/50 border border-white/5 font-mono text-xs text-green-400 overflow-x-auto">
                                        {JSON.stringify(log.payload, null, 2)}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
