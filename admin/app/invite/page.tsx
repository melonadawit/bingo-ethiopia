'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@supabase/supabase-js';

// Init client for auth
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function InvitePage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token');

    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<'validating' | 'valid' | 'invalid' | 'success'>('validating');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('');

    // Validate Token on Load
    useEffect(() => {
        if (!token) {
            setStatus('invalid');
            return;
        }

        // Check token validity via API
        fetch(`/api/admin/invite/check?token=${token}`)
            .then(res => res.json())
            .then(data => {
                if (data.valid) {
                    setStatus('valid');
                    if (data.email) setEmail(data.email);
                    setRole(data.role);
                } else {
                    setStatus('invalid');
                }
            })
            .catch(() => setStatus('invalid'));
    }, [token]);

    const handleAccept = async () => {
        setLoading(true);
        try {
            // 1. Sign Up User
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error('No user created');

            // 2. Claim Invite & Assign Role (Call API)
            const res = await fetch('/api/admin/invite/claim', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token,
                    userId: authData.user.id,
                    email
                })
            });

            const claimData = await res.json();
            if (!claimData.success) throw new Error(claimData.error);

            setStatus('success');
            toast.success('Account created! Redirecting...');

            setTimeout(() => router.push('/overview'), 2000);

        } catch (e: any) {
            toast.error(e.message || 'Failed to accept invite');
        } finally {
            setLoading(false);
        }
    };

    if (status === 'invalid') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <Card className="w-full max-w-md bg-red-950/20 border-red-500/20">
                    <CardHeader className="text-center">
                        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                        <CardTitle className="text-red-500">Invalid or Expired Link</CardTitle>
                        <CardDescription>This invite is no longer valid. Please ask for a new one.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    if (status === 'success') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <Card className="w-full max-w-md bg-green-950/20 border-green-500/20 animate-in zoom-in">
                    <CardHeader className="text-center">
                        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <CardTitle className="text-green-500">Welcome to the Team!</CardTitle>
                        <CardDescription>Your account has been set up successfully.</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] relative overflow-hidden">
            {/* Background FX */}
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
            <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px]" />

            <Card className="w-full max-w-md bg-card/60 backdrop-blur-xl border-white/10 relative z-10 shadow-2xl">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4 border border-blue-500/20">
                        <Shield className="w-6 h-6 text-blue-500" />
                    </div>
                    <CardTitle className="text-2xl font-bold">Join Admin Console</CardTitle>
                    <CardDescription>
                        You have been invited to join as <strong className="text-blue-400 capitalize">{role || 'Admin'}</strong>.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-semibold">Email</label>
                        <Input
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@company.com"
                            className="bg-black/20"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-semibold">Set Password</label>
                        <Input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="bg-black/20"
                        />
                    </div>
                    <Button
                        className="w-full bg-blue-600 hover:bg-blue-700 font-bold h-11"
                        onClick={handleAccept}
                        disabled={loading || !email || !password || status === 'validating'}
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Create Account
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
