import { Flame, Gift, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function DailyBonusPage() {
    const { user, isLoading } = useAuth();

    // Note: Daily bonus claiming is done via Telegram bot or could be implemented here
    // Currently this page just displays the current status

    const getDailyReward = (day: number) => {
        const rewards: Record<number, number> = {
            1: 10, 2: 15, 3: 20, 4: 25, 5: 30, 6: 40, 7: 50
        };
        return rewards[day] || 50;
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
                <div className="text-xl text-white">Please log in to see daily bonuses</div>
            </div>
        );
    }

    const currentStreak = user.daily_streak || 0;
    const nextReward = getDailyReward(currentStreak + 1);

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-900 via-red-900 to-pink-900 p-6">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-4xl font-bold text-white mb-8 text-center">
                    🎁 Daily Bonus
                </h1>

                {/* Current Streak */}
                <div className="bg-gradient-to-br from-orange-500/20 to-red-600/20 backdrop-blur-lg rounded-2xl p-8 mb-6 border-2 border-orange-400/30 text-center">
                    <Flame className="text-orange-400 mx-auto mb-4" size={64} />
                    <div className="text-6xl font-bold text-white mb-2">
                        {currentStreak}
                    </div>
                    <div className="text-xl text-white/90">Day Streak</div>
                    <div className="mt-4 text-white/70">
                        Next reward: <span className="text-yellow-400 font-bold">{nextReward} Birr</span>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                        <div className="flex items-center gap-3 mb-2">
                            <Gift className="text-yellow-400" size={24} />
                            <h3 className="text-white font-semibold">Total Earned</h3>
                        </div>
                        <div className="text-3xl font-bold text-white">
                            {user.total_daily_earned || 0} Birr
                        </div>
                    </div>

                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                        <div className="flex items-center gap-3 mb-2">
                            <Calendar className="text-blue-400" size={24} />
                            <h3 className="text-white font-semibold">Best Streak</h3>
                        </div>
                        <div className="text-3xl font-bold text-white">
                            {user.daily_streak || 0} Days
                        </div>
                    </div>
                </div>

                {/* Reward Calendar */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20">
                    <h2 className="text-xl font-bold text-white mb-4">Reward Calendar</h2>
                    <div className="flex flex-col gap-3">
                        {/* Row 1: Days 1-4 */}
                        <div className="grid grid-cols-4 gap-2">
                            {[1, 2, 3, 4].map((day) => {
                                const reward = getDailyReward(day);
                                const isClaimed = day <= currentStreak;
                                const isNext = day === currentStreak + 1;

                                return (
                                    <div
                                        key={day}
                                        className={`
                                            rounded-xl p-3 text-center transition-all bg-white/5 border border-white/10
                                            ${isClaimed ? 'bg-green-500/20 border-green-500/50' : ''}
                                            ${isNext ? 'bg-yellow-500/20 border-yellow-500/50 ring-2 ring-yellow-500/50 scale-105 shadow-lg shadow-yellow-500/20' : ''}
                                        `}
                                    >
                                        <div className="text-[10px] text-white/50 mb-1 font-medium uppercase tracking-wider">Day {day}</div>
                                        <div className="text-xl font-black text-white">{reward}</div>
                                        <div className="text-[10px] text-white/50">Birr</div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Row 2: Days 5-7 (Centered) */}
                        <div className="grid grid-cols-3 gap-2 w-3/4 mx-auto">
                            {[5, 6, 7].map((day) => {
                                const reward = getDailyReward(day);
                                const isClaimed = day <= currentStreak;
                                const isNext = day === currentStreak + 1;

                                return (
                                    <div
                                        key={day}
                                        className={`
                                            rounded-xl p-3 text-center transition-all bg-white/5 border border-white/10
                                            ${isClaimed ? 'bg-green-500/20 border-green-500/50' : ''}
                                            ${isNext ? 'bg-yellow-500/20 border-yellow-500/50 ring-2 ring-yellow-500/50 scale-105 shadow-lg shadow-yellow-500/20' : ''}
                                        `}
                                    >
                                        <div className="text-[10px] text-white/50 mb-1 font-medium uppercase tracking-wider">Day {day}</div>
                                        <div className="text-xl font-black text-white">{reward}</div>
                                        <div className="text-[10px] text-white/50">Birr</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Claim Button Info */}
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 text-center">
                    <p className="text-white/90 mb-4">
                        Claim your daily bonus in the main menu!
                    </p>
                </div>
            </div>
        </div>
    );
}
