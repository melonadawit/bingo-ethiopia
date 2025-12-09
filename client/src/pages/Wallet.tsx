import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet as WalletIcon, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import api from '../services/api';

const Wallet = () => {
    const [balance, setBalance] = useState(0);
    const [loading, setLoading] = useState(true);

    const fetchBalance = async () => {
        try {
            const res = await api.get('/wallet/balance');
            setBalance(res.data.balance);
        } catch (error) {
            console.error('Failed to fetch balance', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTransaction = async (type: 'deposit' | 'withdraw') => {
        const amount = prompt(`Enter amount to ${type}:`);
        if (!amount) return;

        try {
            const res = await api.post(`/wallet/${type}`, { amount: Number(amount) });
            alert(res.data.message);
            setBalance(res.data.newBalance);
        } catch (error) {
            alert('Transaction failed');
        }
    };

    useEffect(() => {
        fetchBalance();
    }, []);

    if (loading) return <div className="text-center p-10">Loading Wallet...</div>;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
                My Wallet
            </h1>

            {/* Balance Card */}
            <Card className="p-8 text-center bg-gradient-to-br from-gray-800 to-gray-900 border-yellow-500/30">
                <div className="flex justify-center mb-4 text-yellow-400">
                    <WalletIcon size={48} />
                </div>
                <h2 className="text-gray-400 mb-2">Total Balance</h2>
                <div className="text-5xl font-mono font-bold text-white mb-6">
                    {balance.toFixed(2)} <span className="text-xl text-yellow-500">ETB</span>
                </div>

                <div className="flex gap-4 justify-center">
                    <Button
                        onClick={() => handleTransaction('deposit')}
                        className="bg-green-600 hover:bg-green-700 flex gap-2 items-center"
                    >
                        <ArrowDownCircle size={20} /> Deposit
                    </Button>
                    <Button
                        onClick={() => handleTransaction('withdraw')}
                        className="bg-red-600 hover:bg-red-700 flex gap-2 items-center"
                    >
                        <ArrowUpCircle size={20} /> Withdraw
                    </Button>
                </div>
            </Card>

            {/* Recent Transactions (Placeholder) */}
            <Card className="p-6">
                <h3 className="text-xl font-semibold mb-4 border-b border-gray-700 pb-2">Recent Transactions</h3>
                <div className="text-center text-gray-500 py-8">
                    No recent transactions found.
                </div>
            </Card>
        </div>
    );
};

export default Wallet;
