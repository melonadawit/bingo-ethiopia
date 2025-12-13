import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Copy, Users, Trophy, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import toast from 'react-hot-toast';

export const ReferralSystem = () => {
    const { user } = useAuth();
    const [stats, setStats] = useState<{ count: number; earnings: number; referralCode: string } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const fetchStats = async () => {
            try {
                // In production, use axios/fetch with auth header. 
                // Here passing userId as query param as per controller.
                // Direct connection to local backend to avoid proxy issues
                // FORCE localhost:5000 for debugging
                const baseUrl = 'http://localhost:5000';

                console.group('ReferralSystem Debug');
                console.log('Fetching from:', `${baseUrl}/api/auth/referrals/stats`);
                console.log('Window location:', window.location.href);
                console.groupEnd();

                const res = await fetch(`${baseUrl}/api/auth/referrals/stats?userId=${user.id}`);
                const data = await res.json();
                if (data.error) throw new Error(data.error);
                setStats(data);
            } catch (error) {
                console.error('Failed to load referral stats', error);

            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [user]);

    const copyLink = () => {
        if (!stats?.referralCode) return;
        const link = `https://t.me/BingoEthiopiaBot?start=${stats.referralCode}`;
        navigator.clipboard.writeText(link);
        toast.success('Referral link copied!');
    };

    const inviteViaTelegram = () => {
        if (!stats?.referralCode) return;
        const link = `https://t.me/BingoEthiopiaBot?start=${stats.referralCode}`;
        const text = `Join me on Bingo Ethiopia and get a 100 Birr welcome bonus! 🎮💸\n\nClick here: ${link}`;
        const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`;
        window.open(shareUrl, '_blank');
    }

    if (loading) return <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500" /></div>;

    return (
        <div className="bg-[#1a1b2e] rounded-xl p-6 border border-white/10 shadow-xl max-w-md mx-auto">
            <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg shadow-orange-500/30">
                    <Trophy className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Invite & Earn (Debug v2)</h2>
                <p className="text-slate-400 text-sm">
                    Invite friends and earn <span className="text-yellow-400 font-bold">50 Birr</span> for every friend who joins!
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-800/50 p-4 rounded-lg border border-white/5 text-center">
                    <div className="text-slate-400 text-xs uppercase mb-1 flex items-center justify-center gap-1">
                        <Users size={12} /> Friends
                    </div>
                    <div className="text-2xl font-black text-white">{stats?.count || 0}</div>
                </div>
                <div className="bg-slate-800/50 p-4 rounded-lg border border-white/5 text-center">
                    <div className="text-slate-400 text-xs uppercase mb-1 flex items-center justify-center gap-1">
                        <Trophy size={12} /> Earnings
                    </div>
                    <div className="text-2xl font-black text-yellow-500">{stats?.earnings || 0} ETB</div>
                </div>
            </div>

            {/* Link Section */}
            <div className="bg-slate-900/50 p-3 rounded-lg border border-white/10 flex items-center justify-between gap-3 mb-6">
                <code className="text-indigo-300 font-mono text-sm truncate flex-1">
                    {stats?.referralCode ? `https://t.me/BingoEthiopiaBot?start=${stats.referralCode}` : 'Wait a moment...'}
                </code>
                <button
                    onClick={copyLink}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
                >
                    <Copy size={18} />
                </button>
            </div>

            <Button
                onClick={inviteViaTelegram}
                className="w-full bg-[#0088cc] hover:bg-[#0077b5] text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
            >
                <ExternalLink size={18} />
                Invite on Telegram
            </Button>
        </div>
    );
};
