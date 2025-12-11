import { useState } from 'react';
import { Wallet as WalletIcon, ArrowUpCircle, ArrowDownCircle, History, TrendingUp } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

const Wallet = () => {
    const { user } = useAuth();
    const [showDepositModal, setShowDepositModal] = useState(false);
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [depositAmount, setDepositAmount] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const handleDeposit = async () => {
        if (!depositAmount || parseFloat(depositAmount) < 10) {
            alert('Minimum deposit is 10 Birr');
            return;
        }

        setIsProcessing(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/payment/deposit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                },
                body: JSON.stringify({ amount: parseFloat(depositAmount) }),
            });

            const data = await response.json();

            if (data.success && data.checkout_url) {
                // Redirect to Chapa checkout
                window.location.href = data.checkout_url;
            } else {
                alert(data.error || 'Failed to initialize payment');
                setIsProcessing(false);
            }
        } catch (error) {
            console.error('Deposit error:', error);
            alert('Failed to process deposit. Please try again.');
            setIsProcessing(false);
        }
    };

    // Mock transaction history
    const transactions = [
        { id: 1, type: 'win', amount: 500, game: 'Speed Bingo', date: '2 hours ago' },
        { id: 2, type: 'bet', amount: -50, game: 'Classic Bingo', date: '3 hours ago' },
        { id: 3, type: 'deposit', amount: 1000, game: 'Deposit', date: '1 day ago' },
        { id: 4, type: 'win', amount: 250, game: 'Speed Bingo', date: '2 days ago' },
    ];

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
                    { label: 'Games Played', value: '24', color: 'from-blue-500 to-cyan-500' },
                    { label: 'Total Won', value: '2.5K', color: 'from-green-500 to-emerald-500' },
                    { label: 'Win Rate', value: '68%', color: 'from-orange-500 to-red-500' },
                ].map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className={`bg-gradient-to-br ${stat.color} rounded-xl p-4 text-center`}
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
                    {transactions.map((tx) => (
                        <motion.div
                            key={tx.id}
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            className="bg-slate-800/50 rounded-xl p-3 flex items-center justify-between hover:bg-slate-800 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'win' ? 'bg-green-500/20 text-green-400' :
                                    tx.type === 'deposit' ? 'bg-blue-500/20 text-blue-400' :
                                        'bg-red-500/20 text-red-400'
                                    }`}>
                                    {tx.type === 'win' ? <TrendingUp size={20} /> :
                                        tx.type === 'deposit' ? <ArrowDownCircle size={20} /> :
                                            <ArrowUpCircle size={20} />}
                                </div>
                                <div>
                                    <div className="text-white font-medium text-sm">{tx.game}</div>
                                    <div className="text-slate-400 text-xs">{tx.date}</div>
                                </div>
                            </div>
                            <div className={`font-bold text-lg ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'
                                }`}>
                                {tx.amount > 0 ? '+' : ''}{tx.amount} Birr
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Deposit Modal - Chapa Integration */}
            {showDepositModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-slate-900 rounded-2xl p-6 max-w-md w-full border border-slate-700"
                    >
                        <h3 className="text-2xl font-bold text-white mb-2">Deposit via Chapa</h3>
                        <p className="text-slate-400 mb-4 text-sm">Supports Telebirr, CBE Birr, M-Pesa & more</p>

                        <div className="mb-6">
                            <label className="text-slate-400 text-sm mb-2 block">Amount (Birr)</label>
                            <input
                                type="number"
                                value={depositAmount}
                                onChange={(e) => setDepositAmount(e.target.value)}
                                placeholder="Enter amount (min 10 Birr)"
                                disabled={isProcessing}
                                className="w-full bg-slate-800 text-white px-4 py-3 rounded-xl border border-slate-700 focus:border-indigo-500 outline-none disabled:opacity-50"
                            />
                            <p className="text-slate-500 text-xs mt-2">Minimum deposit: 10 Birr</p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                onClick={() => {
                                    setShowDepositModal(false);
                                    setDepositAmount('');
                                }}
                                disabled={isProcessing}
                                className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl disabled:opacity-50"
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleDeposit}
                                disabled={isProcessing || !depositAmount || parseFloat(depositAmount) < 10}
                                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold py-3 rounded-xl disabled:opacity-50"
                            >
                                {isProcessing ? 'Processing...' : 'Pay Now'}
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Withdraw Modal */}
            {showWithdrawModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-slate-900 rounded-2xl p-6 max-w-md w-full border border-slate-700"
                    >
                        <h3 className="text-2xl font-bold text-white mb-4">Withdraw Funds</h3>

                        <div className="mb-4">
                            <label className="text-slate-400 text-sm mb-2 block">Amount (Birr)</label>
                            <input
                                type="number"
                                placeholder="Enter amount"
                                className="w-full bg-slate-800 text-white px-4 py-3 rounded-xl border border-slate-700 focus:border-indigo-500 outline-none"
                            />
                        </div>

                        <div className="mb-6">
                            <label className="text-slate-400 text-sm mb-2 block">Withdraw to</label>
                            <select className="w-full bg-slate-800 text-white px-4 py-3 rounded-xl border border-slate-700 focus:border-indigo-500 outline-none">
                                <option>Telebirr</option>
                                <option>CBE Birr</option>
                                <option>M-Pesa</option>
                                <option>Bank Account</option>
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                onClick={() => setShowWithdrawModal(false)}
                                className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl"
                            >
                                Cancel
                            </Button>
                            <Button
                                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 rounded-xl"
                            >
                                Confirm
                            </Button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default Wallet;
