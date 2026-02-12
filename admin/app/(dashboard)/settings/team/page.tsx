'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAdmin } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Shield, Trash2, Ban, CheckCircle2, Key, Globe, Lock, AlertTriangle, LogOut, Copy, Share2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table-impl';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

const ROLES = ['super_admin', 'ops', 'finance', 'marketing', 'readonly'];

// Mock Permission Matrix
const PERMISSIONS = [
    { feature: 'Overview', super_admin: true, ops: true, finance: true, marketing: true, readonly: true },
    { feature: 'Live Games', super_admin: true, ops: true, finance: false, marketing: false, readonly: true },
    { feature: 'Users Management', super_admin: true, ops: true, finance: true, marketing: true, readonly: false },
    { feature: 'Finance', super_admin: true, ops: false, finance: true, marketing: false, readonly: false },
    { feature: 'Marketing Suite', super_admin: true, ops: false, finance: false, marketing: true, readonly: false },
    { feature: 'Risk Console', super_admin: true, ops: true, finance: false, marketing: false, readonly: false },
    { feature: 'Tournaments', super_admin: true, ops: true, finance: false, marketing: true, readonly: false },
    { feature: 'Content Studio', super_admin: true, ops: false, finance: false, marketing: true, readonly: false },
    { feature: 'Bot Studio', super_admin: true, ops: true, finance: false, marketing: false, readonly: false },
    { feature: 'Role Manager', super_admin: true, ops: false, finance: false, marketing: false, readonly: false },
    { feature: 'Settings', super_admin: true, ops: true, finance: false, marketing: false, readonly: false },
];

export default function TeamPage() {
    const queryClient = useQueryClient();
    const [inviteRole, setInviteRole] = useState('readonly');
    const [inviteEmail, setInviteEmail] = useState('');
    const [generatedLink, setGeneratedLink] = useState('');

    const { data: team, isLoading } = useQuery({
        queryKey: ['admin-team'],
        queryFn: () => fetchAdmin('/team/members'),
    });

    const { data: user } = useQuery({ queryKey: ['admin-user'], queryFn: () => fetchAdmin('/me') });

    const inviteMutation = useMutation({
        mutationFn: async () => {
            // Direct Client-Side Insert (Allowed by RLS for super_admin/ops)
            const { data, error } = await supabase
                .from('admin_invites')
                .insert({
                    role: inviteRole,
                    email: inviteEmail || null,
                    created_by: user?.id
                })
                .select()
                .single();

            if (error) throw new Error(error.message);

            // Construct Link Client-Side
            const origin = window.location.origin;
            return { link: `${origin}/invite?token=${data.token}`, token: data.token };
        },
        onSuccess: (data: any) => {
            setGeneratedLink(data.link);
            toast.success('Invite link generated!');
        },
        onError: (err: any) => toast.error(err.message)
    });



    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                    <Shield className="w-8 h-8 text-blue-500" />
                    Security Center
                </h1>
                <p className="text-muted-foreground mt-1">Manage admin access, roles, and global permissions.</p>
            </div>

            <Tabs defaultValue="members" className="w-full">
                <TabsList className="bg-black/20 border border-white/10">
                    <TabsTrigger value="members">Team Members</TabsTrigger>
                    <TabsTrigger value="matrix">Access Matrix</TabsTrigger>

                    <TabsTrigger value="invites">Invite Codes</TabsTrigger>
                </TabsList>

                {/* Team Members List */}
                <TabsContent value="members" className="mt-6">
                    <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Active Admins</CardTitle>
                                <CardDescription>Users with dashboard access.</CardDescription>
                            </div>
                            <Button variant="destructive" size="sm" className="bg-red-950/50 hover:bg-red-900 border border-red-500/30">
                                <LogOut className="w-4 h-4 mr-2" /> Revoke All Sessions
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? <div>Loading...</div> : (
                                <div className="space-y-4">
                                    {team?.members?.map((admin: any) => (
                                        <div key={admin.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <Avatar className="h-10 w-10 ring-2 ring-white/10">
                                                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${admin.email}`} />
                                                    <AvatarFallback>{admin.email[0]}</AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <div className="font-bold">{admin.email}</div>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <Badge variant="secondary" className="uppercase text-[10px]">{admin.role}</Badge>
                                                        <span>Last active: {new Date(admin.last_sign_in_at || Date.now()).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="icon" variant="ghost" className="text-yellow-500 hover:bg-yellow-500/10">
                                                    <Ban className="w-4 h-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="text-red-500 hover:bg-red-500/10">
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Access Matrix */}
                <TabsContent value="matrix" className="mt-6">
                    <Card className="bg-black/40 border-white/10 backdrop-blur-xl overflow-hidden">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Lock className="w-5 h-5 text-purple-400" /> Permission Matrix</CardTitle>
                            <CardDescription>Visual breakdown of capabilities per role. (Read-only view)</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-white/5">
                                    <TableRow className="border-white/10">
                                        <TableHead className="text-white">Feature Access</TableHead>
                                        {ROLES.map(r => (
                                            <TableHead key={r} className="text-center uppercase text-xs font-bold text-muted-foreground">{r.replace('_', ' ')}</TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {PERMISSIONS.map((perm) => (
                                        <TableRow key={perm.feature} className="border-white/5 hover:bg-white/5">
                                            <TableCell className="font-medium text-white/80">{perm.feature}</TableCell>
                                            {ROLES.map(role => (
                                                <TableCell key={role} className="text-center">
                                                    {(perm as any)[role] ? (
                                                        <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
                                                    ) : (
                                                        <div className="w-1.5 h-1.5 rounded-full bg-white/10 mx-auto" />
                                                    )}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>



                {/* Invite Generator */}
                <TabsContent value="invites" className="mt-6">
                    <Card className="bg-black/40 border-white/10 backdrop-blur-xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Key className="w-5 h-5 text-orange-400" /> Key Generator</CardTitle>
                            <CardDescription>Create one-time use invite links for new staff.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex gap-4 items-end">
                                <div className="space-y-2 flex-1">
                                    <label className="text-sm font-bold">Assign Role</label>
                                    <Select value={inviteRole} onValueChange={setInviteRole}>
                                        <SelectTrigger className="bg-white/5 border-white/10">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ROLES.map(r => <SelectItem key={r} value={r}>{r.replace('_', ' ').toUpperCase()}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2 flex-1">
                                    <label className="text-sm font-bold">Email (Optional Restriction)</label>
                                    <Input placeholder="user@company.com" className="bg-white/5 border-white/10" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
                                </div>
                                <Button onClick={() => inviteMutation.mutate()} disabled={inviteMutation.isPending} className="bg-orange-500 hover:bg-orange-600 font-bold">
                                    {inviteMutation.isPending ? "Generating..." : "Generate Link"}
                                </Button>
                            </div>

                            {generatedLink && (
                                <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 flex flex-col items-center text-center animate-in fade-in slide-in-from-top-2">
                                    <Globe className="w-8 h-8 text-orange-500 mb-2" />
                                    <h3 className="text-lg font-bold text-orange-500">Invite Link Ready</h3>
                                    <code className="mt-2 block bg-black/50 p-3 rounded text-xs text-white/70 break-all border border-orange-500/30">
                                        {generatedLink}
                                    </code>
                                    <p className="text-xs text-muted-foreground mt-2">This link expires in 24 hours.</p>

                                    <div className="flex gap-2 mt-4 w-full">
                                        <Button variant="outline" className="flex-1 border-white/10 hover:bg-white/10" onClick={() => {
                                            navigator.clipboard.writeText(generatedLink);
                                            toast.success('Link copied to clipboard!');
                                        }}>
                                            <Copy className="w-4 h-4 mr-2" /> Copy
                                        </Button>
                                        <Button variant="secondary" className="flex-1 bg-white/10 hover:bg-white/20 text-white" onClick={async () => {
                                            if (navigator.share) {
                                                try { await navigator.share({ title: 'Bingo Admin Invite', text: 'Here is your admin invite link:', url: generatedLink }); } catch { }
                                            } else {
                                                navigator.clipboard.writeText(generatedLink);
                                                toast.success('Copied to clipboard');
                                            }
                                        }}>
                                            <Share2 className="w-4 h-4 mr-2" /> Share
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
