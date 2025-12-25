import { useState, useEffect } from 'react';
import { Wallet as WalletIcon, ArrowUpCircle, ArrowDownCircle, History, TrendingUp } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

const Wallet = () => {
    const { user } = useAuth();
    const [showDepositModal, setShowDepositModal] = useState(false);
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userStats, setUserStats] = useState({
        gamesPlayed: 0,
        totalWon: 0,
        winRate: 0
    });

    // Fetch real transaction history
    useEffect(() => {
        const fetchTransactions = async () => {
            if (!user?.telegram_id) return;

            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/payments/history?user_id=${user.telegram_id}`);
                const data = await response.json();

                if (data.success) {
                    setTransactions(data.transactions || []);
                }

                // Fetch user stats
                const statsResponse = await fetch(`${import.meta.env.VITE_API_URL}/api/stats/user?user_id=${user.telegram_id}`);
                const statsData = await statsResponse.json();

                if (statsData.success) {
                    setUserStats({
                        gamesPlayed: statsData.gamesPlayed || 0,
                        totalWon: statsData.totalWon || 0,
                        winRate: statsData.winRate || 0
                    });
                }
            } catch (error) {
                console.error('Failed to fetch transactions:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTransactions();
    }, [user?.telegram_id]);

    return (
        <div className="min-h-screen bg-[#0B1120]">
            {/* Balance Card */}
            <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-6 mb-6 shadow-2xl shadow-purple-500/20"
            >
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <WalletIcon size={24} className="text-white" />
                        <span className="text-white/80 text-sm">Available Balance</span>
                    </div>
                    <TrendingUp size={20} className="text-green-400" />
                </div>

                <div className="text-5xl font-black text-white mb-6">
                    {user?.balance || 1000} <span className="text-2xl font-normal">Birr</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <Button
                        onClick={() => setShowDepositModal(true)}
                        className="bg-white/20 hover:bg-white/30 backdrop-blur-lg text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
                    >
                        <ArrowDownCircle size={20} />
                        Deposit
                    </Button>
                    <Button
                        onClick={() => setShowWithdrawModal(true)}
                        className="bg-white/20 hover:bg-white/30 backdrop-blur-lg text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
                    >
                        <ArrowUpCircle size={20} />
                        Withdraw
                    </Button>
                </div>
            </motion.div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                    { label: 'Games Played', value: userStats.gamesPlayed.toString(), color: 'from-blue-500 to-cyan-500' },
                    { label: 'Total Won', value: `${userStats.totalWon} Br`, color: 'from-green-500 to-emerald-500' },
                    { label: 'Win Rate', value: `${userStats.winRate}%`, color: 'from-orange-500 to-red-500' },
                ].map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className={`bg-gradient-to-br ${stat.color} rounded-xl p-3 text-center`}
                    >
                        <div className="text-2xl font-black text-white">{stat.value}</div>
                        <div className="text-xs text-white/80">{stat.label}</div>
                    </motion.div>
                ))}
            </div>

            {/* Transaction History */}
            <div className="bg-slate-900/50 rounded-2xl p-4 border border-slate-800">
                <div className="flex items-center gap-2 mb-4">
                    <History size={20} className="text-indigo-400" />
                    <h2 className="text-lg font-bold text-white">Recent Transactions</h2>
                </div>

                <div className="space-y-2">
                    {loading ? (
                        <div className="text-center py-8 text-slate-400">
                            Loading transactions...
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                            No transactions yet
                        </div>
                    ) : (
                        transactions.map((tx) => (
                            <motion.div
                                key={tx.id}
                                initial={{ x: -20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                className="bg-slate-800/50 rounded-xl p-3 flex items-center justify-between hover:bg-slate-800 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'deposit' ? 'bg-green-500/20 text-green-400' :
                                        tx.type === 'withdraw' ? 'bg-red-500/20 text-red-400' :
                                            'bg-blue-500/20 text-blue-400'
                                        }`}>
                                        {tx.type === 'deposit' ? <ArrowDownCircle size={20} /> :
                                            tx.type === 'withdraw' ? <ArrowUpCircle size={20} /> :
                                                <TrendingUp size={20} />}
                                    </div>
                                    <div>
                                        <div className="text-white font-medium text-sm capitalize">{tx.type}</div>
                                        <div className="text-slate-400 text-xs">{new Date(tx.created_at).toLocaleDateString()}</div>
                                    </div>
                                </div>
                                <div className={`font-bold text-lg ${tx.type === 'deposit' ? 'text-green-400' : 'text-red-400'}`}>
                                    {tx.type === 'deposit' ? '+' : '-'}{tx.amount} Birr
                                </div>
                            </motion.div>
                        ))
                    )}
                </div>
            </div>

            {/* Deposit Modal - Telegram Bot Instructions */}
            {showDepositModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-slate-900 rounded-2xl p-6 max-w-md w-full border border-slate-700"
                    >
                        <h3 className="text-2xl font-bold text-white mb-2">💰 Deposit Funds</h3>
                        <p className="text-slate-400 mb-4 text-sm">Use the Telegram bot to make deposits</p>

                        <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4 mb-6">
                            <p className="text-white text-sm mb-3">
                                To deposit funds:
                            </p>
                            <ol className="text-slate-300 text-sm space-y-2 list-decimal list-inside">
                                <li>Open the Telegram bot</li>
                                <li>Click "💳 Deposit" or use /deposit</li>
                                <li>Follow the instructions</li>
                                <li>Admin will approve your deposit</li>
                                <li>Balance will update automatically</li>
                            </ol>
                        </div>

                        <Button
                            onClick={() => setShowDepositModal(false)}
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 rounded-xl"
                        >
                            Got it
                        </Button>
                    </motion.div>
                </div>
            )}

            {/* Withdraw Modal - Telegram Bot Instructions */}
            {showWithdrawModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-slate-900 rounded-2xl p-6 max-w-md w-full border border-slate-700"
                    >
                        <h3 className="text-2xl font-bold text-white mb-4">💸 Withdraw Funds</h3>
                        <p className="text-slate-400 mb-4 text-sm">Use the Telegram bot to withdraw</p>

                        <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 mb-6">
                            <p className="text-white text-sm mb-3">
                                To withdraw funds:
                            </p>
                            <ol className="text-slate-300 text-sm space-y-2 list-decimal list-inside">
                                <li>Open the Telegram bot</li>
                                <li>Click "💸 Withdraw" or use /withdraw</li>
                                <li>Enter amount and bank details</li>
                                <li>Admin will process your request</li>
                                <li>Funds sent to your account</li>
                            </ol>
                        </div>

                        <Button
                            onClick={() => setShowWithdrawModal(false)}
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 rounded-xl"
                        >
                            Got it
                        </Button>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default Wallet;
