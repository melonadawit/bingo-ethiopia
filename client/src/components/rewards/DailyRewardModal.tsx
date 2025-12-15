import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, X, Flame } from 'lucide-react';
import { Button } from '../ui/Button';
import api from '../../services/api';
import confetti from 'canvas-confetti';

interface RewardStatus {
    available: boolean;
    day?: number;
    amount?: number;
    streak?: number;
    nextReward?: number;
    alreadyClaimed?: boolean;
}

interface DailyRewardModalProps {
    onClose: () => void;
    onClaimed?: () => void;
}

export const DailyRewardModal: React.FC<DailyRewardModalProps> = ({ onClose, onClaimed }) => {
    const [reward, setReward] = useState<RewardStatus | null>(null);
    const [claiming, setClaiming] = useState(false);
    const [claimed, setClaimed] = useState(false);

    useEffect(() => {
        checkReward();
    }, []);

    const checkReward = async () => {
        try {
            const res = await api.get('/api/rewards/daily/check');
            setReward(res.data);
        } catch (error) {
            console.error('Failed to check reward:', error);
        }
    };

    const claimReward = async () => {
        setClaiming(true);
        try {
            await api.post('/api/rewards/daily/claim');
            setClaimed(true);

            // Trigger confetti
            confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
            });

            setTimeout(() => {
                onClaimed?.();
                onClose();
            }, 2000);
        } catch (error) {
            console.error('Failed to claim reward:', error);
        } finally {
            setClaiming(false);
        }
    };

    if (!reward?.available) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0, y: 50 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 rounded-2xl p-8 max-w-md w-full relative shadow-2xl border border-purple-500/30"
                >
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/60 hover:text-white transition"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    <div className="text-center">
                        {/* Icon */}
                        <motion.div
                            animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.1, 1] }}
                            transition={{ duration: 0.5, repeat: claimed ? 0 : Infinity, repeatDelay: 1 }}
                        >
                            <Gift className="w-24 h-24 mx-auto text-yellow-400 mb-4" />
                        </motion.div>

                        {/* Title */}
                        <h2 className="text-4xl font-black text-white mb-2">
                            {claimed ? '🎉 Claimed!' : '🎁 Daily Reward!'}
                        </h2>
                        <p className="text-gray-300 mb-6">Day {reward.day} of 7</p>

                        {/* Reward amount */}
                        <div className="bg-white/10 backdrop-blur rounded-xl p-6 mb-6 border border-white/20">
                            <p className="text-yellow-400 text-6xl font-black mb-2">
                                {reward.amount}
                            </p>
                            <p className="text-white text-xl">Birr</p>
                        </div>

                        {/* Streak indicators */}
                        <div className="flex justify-center gap-2 mb-6">
                            {[1, 2, 3, 4, 5, 6, 7].map(day => (
                                <motion.div
                                    key={day}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: day * 0.05 }}
                                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${day <= (reward.day || 0)
                                            ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-black shadow-lg'
                                            : 'bg-gray-700 text-gray-400'
                                        }`}
                                >
                                    {day}
                                </motion.div>
                            ))}
                        </div>

                        {/* Streak info */}
                        {reward.streak && reward.streak > 1 && (
                            <div className="flex items-center justify-center gap-2 mb-6 text-orange-400">
                                <Flame className="w-5 h-5" />
                                <span className="font-bold">{reward.streak} day streak!</span>
                            </div>
                        )}

                        {/* Claim button */}
                        {!claimed && (
                            <Button
                                onClick={claimReward}
                                disabled={claiming}
                                className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-black font-bold py-4 text-lg rounded-xl shadow-lg transition-all transform hover:scale-105"
                            >
                                {claiming ? 'Claiming...' : 'Claim Reward'}
                            </Button>
                        )}

                        {claimed && (
                            <div className="text-green-400 font-bold text-lg">
                                ✅ Added to your wallet!
                            </div>
                        )}

                        {/* Next reward hint */}
                        {!claimed && reward.nextReward && reward.day !== 7 && (
                            <p className="text-gray-400 text-sm mt-4">
                                Tomorrow: {reward.nextReward} Birr
                            </p>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
