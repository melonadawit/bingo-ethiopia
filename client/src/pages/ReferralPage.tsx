import { useState, useEffect } from 'react';
import { Copy, Users, Gift, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { motion } from 'framer-motion';

export default function ReferralPage() {
    const { user, isLoading } = useAuth();
    const [copied, setCopied] = useState(false);
    const [referrals, setReferrals] = useState<any[]>([]);
    const [loadingReferrals, setLoadingReferrals] = useState(false);

    useEffect(() => {
        if (user?.telegram_id) {
            fetchReferrals();
        }
    }, [user?.telegram_id]);

    const fetchReferrals = async () => {
        setLoadingReferrals(true);
        try {
            const res = await api.get(`/api/stats/referrals?userId=${user?.telegram_id}`);
            setReferrals(res.data.referrals || []);
        } catch (error) {
            console.error('Failed to fetch referrals:', error);
        } finally {
            setLoadingReferrals(false);
        }
    };

    const copyReferralCode = () => {
        if (user?.referral_code) {
            const shareText = `🔗 Your Referral Link

https://t.me/bingoo_online_bot?start=${user.telegram_id}

💰 Earn 10 Birr for each friend who:
   • Registers using your link

🎁 Your friend gets 10 Birr welcome bonus!

Share this link with friends and earn rewards!`;

            navigator.clipboard.writeText(shareText);
            setCopied(true);
            toast.success('Referral link copied!');
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-xl text-white">Loading...</div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-xl text-white">Please register via Telegram bot first</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6 pb-24">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-4xl font-bold text-white mb-8 text-center">
                    🎁 Referral Program
                </h1>

                {/* Referral Code Card */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20">
                    <h2 className="text-xl font-bold text-white mb-4">Your Referral Code</h2>
                    <div className="bg-white/5 rounded-lg p-4 mb-4">
                        <div className="flex items-center justify-between">
                            <code className="text-2xl font-mono text-yellow-400">
                                {user.referral_code || 'N/A'}
                            </code>
                            <button
                                onClick={copyReferralCode}
                                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-all"
                            >
                                <Copy size={20} />
                                {copied ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                    </div>
                    <p className="text-white/70 text-sm">
                        Share this link with friends. Both you and your friend get 10 Birr when they register!
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 backdrop-blur-lg rounded-2xl p-6 border border-green-400/30">
                        <div className="flex items-center gap-3 mb-2">
                            <Users className="text-green-400" size={24} />
                            <h3 className="text-white font-semibold">Referrals</h3>
                        </div>
                        <div className="text-4xl font-bold text-white">
                            {user.referral_count || 0}
                        </div>
                        <p className="text-white/70 text-sm mt-1">Friends referred</p>
                    </div>

                    <div className="bg-gradient-to-br from-yellow-500/20 to-orange-600/20 backdrop-blur-lg rounded-2xl p-6 border border-yellow-400/30">
                        <div className="flex items-center gap-3 mb-2">
                            <Gift className="text-yellow-400" size={24} />
                            <h3 className="text-white font-semibold">Earnings</h3>
                        </div>
                        <div className="text-4xl font-bold text-white">
                            {user.referral_earnings || 0} Birr
                        </div>
                        <p className="text-white/70 text-sm mt-1">Total earned</p>
                    </div>
                </div>

                {/* Referred Users List */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <Users size={20} /> My Referrals
                    </h2>

                    {loadingReferrals ? (
                        <div className="text-center py-8">
                            <div className="animate-spin w-8 h-8 border-2 border-white/20 border-t-white rounded-full mx-auto" />
                        </div>
                    ) : referrals.length > 0 ? (
                        <div className="space-y-3">
                            {referrals.map((ref, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="bg-white/5 rounded-xl p-4 flex items-center justify-between border border-white/5"
                                >
                                    <div>
                                        <div className="text-white font-bold">@{ref.username}</div>
                                        <div className="text-xs text-white/50 flex items-center gap-1">
                                            <Calendar size={12} />
                                            {new Date(ref.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div className="text-green-400 font-bold">
                                        +{ref.reward_amount} Br
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-white/40 italic">
                            No referrals yet. Start sharing to earn!
                        </div>
                    )}
                </div>

                {/* How it Works */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                    <h2 className="text-xl font-bold text-white mb-4">How It Works</h2>
                    <ol className="space-y-3 text-white/90">
                        <li className="flex gap-3">
                            <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">1</span>
                            <span>Share your referral link with friends</span>
                        </li>
                        <li className="flex gap-3">
                            <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">2</span>
                            <span>They register using your link</span>
                        </li>
                        <li className="flex gap-3">
                            <span className="bg-blue-500 text-white w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">3</span>
                            <span>You both get 10 Birr instantly!</span>
                        </li>
                    </ol>
                </div>
            </div>
        </div>
    );
}
