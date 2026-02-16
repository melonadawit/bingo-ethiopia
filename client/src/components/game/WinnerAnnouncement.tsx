import React, { useEffect, useState } from 'react';
import { voiceCaller } from '../../services/voiceCaller';
import { Crown, Trophy, Sparkles } from 'lucide-react';

interface Winner {
    userId: string;
    name?: string;
    cardId?: number;
    cartelaNumber?: number;
    card: {
        id: number;
        numbers: number[][];
    };
    winningPattern?: boolean[][];
}

interface WinnerAnnouncementProps {
    winners: Winner[];
    calledNumbers: number[];
    onNextGame: () => void;
    externalCountdown?: number;
}

export const WinnerAnnouncement: React.FC<WinnerAnnouncementProps> = ({
    winners,
    calledNumbers,
    onNextGame,
    externalCountdown
}) => {
    const [countdown, setCountdown] = useState(externalCountdown || 10);
    const [showConfetti, setShowConfetti] = useState(true);

    // Sync with external countdown if provided
    useEffect(() => {
        if (externalCountdown !== undefined) {
            setCountdown(externalCountdown);
            if (externalCountdown <= 0) {
                onNextGame();
            }
        }
    }, [externalCountdown, onNextGame]);

    useEffect(() => {
        const announceWinners = async () => {
            await new Promise(resolve => setTimeout(resolve, 500));
            await voiceCaller.announceWinner();
        };

        announceWinners();

        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    onNextGame(); // Trigger next game immediately when countdown ends
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        const confettiTimer = setTimeout(() => setShowConfetti(false), 5000);

        return () => {
            clearInterval(timer);
            clearTimeout(confettiTimer);
            voiceCaller.stop();
        };
    }, [winners, onNextGame]);

    const COLUMN_LETTERS = ['B', 'I', 'N', 'G', 'O'];
    const COLUMN_COLORS = ['#3B82F6', '#6366F1', '#A855F7', '#22C55E', '#F97316'];
    const calledNumbersSet = new Set(calledNumbers);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/95 backdrop-blur-md animate-in fade-in duration-300 overflow-y-auto">
            {showConfetti && <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(50)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-3 h-3 rounded-sm animate-confetti-fall"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: '-5%',
                            animationDuration: `${2 + Math.random() * 3}s`,
                            animationDelay: `${Math.random() * 2}s`,
                            backgroundColor: COLUMN_COLORS[Math.floor(Math.random() * 5)]
                        }}
                    />
                ))}
            </div>}

            <div className="relative z-10 flex flex-col items-center w-full max-w-lg px-4 py-8">

                {/* Crown Icon with Glow */}
                <div className="relative mb-4">
                    <div className="absolute inset-0 bg-yellow-500 blur-2xl opacity-40 rounded-full animate-pulse"></div>
                    <div className="relative w-20 h-20 bg-amber-500 rounded-full flex items-center justify-center border-4 border-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.5)]">
                        <Crown className="text-white w-10 h-10 drop-shadow-md stroke-[2.5]" />
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-4xl font-black text-amber-400 tracking-wider mb-2 drop-shadow-[0_2px_10px_rgba(251,191,36,0.5)]">
                    BINGO!
                </h1>

                {/* Subtitle */}
                <div className="flex flex-col items-center gap-1 text-white font-bold text-xl mb-6 text-center">
                    <div>🎉 {winners.length > 1 ? `${winners.length} WINNERS!` : `${winners[0].name || winners[0].userId} WON!`} 🎉</div>
                    {winners.length > 1 && (
                        <div className="text-sm text-amber-300 bg-amber-900/40 px-3 py-1 rounded-full border border-amber-500/30">
                            Prize Pot Split Equally
                        </div>
                    )}
                </div>

                {/* Cards Container - Grid for multiple, or Centered for single */}
                <div className={`w-full grid gap-8 ${winners.length > 1 ? 'grid-cols-1 max-w-sm mx-auto' : 'grid-cols-1 max-w-sm'}`}>
                    {winners.map((winner, idx) => (
                        <div key={`${winner.userId}-${winner.cardId}-${idx}`} className="bg-slate-800 rounded-[1.5rem] p-3 shadow-2xl border border-slate-700/50 relative overflow-hidden transform transition-all hover:scale-[1.02]">
                            {/* Player Name Tag (only if multiple) */}
                            {winners.length > 1 && (
                                <div className="absolute top-2 right-2 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm z-10">
                                    {winner.name?.split(' ')[0] || `P-${winner.userId}`}
                                </div>
                            )}

                            {/* Header */}
                            <div className="text-center mb-2">
                                <div className="inline-flex items-center gap-1 text-slate-300 font-bold text-sm">
                                    <Trophy className="text-amber-400 w-3 h-3" />
                                    <span>#{winner.cartelaNumber || winner.cardId || '??'}</span>
                                </div>
                            </div>

                            {/* Grid */}
                            <div className="bg-slate-900 rounded-xl p-1.5 border border-slate-700/50">
                                {/* Headers */}
                                <div className="grid grid-cols-5 gap-1 mb-1">
                                    {COLUMN_LETTERS.map((letter, i) => (
                                        <div
                                            key={letter}
                                            className="h-6 rounded-md flex items-center justify-center text-white font-bold text-xs shadow-sm"
                                            style={{ backgroundColor: COLUMN_COLORS[i] }}
                                        >
                                            {letter}
                                        </div>
                                    ))}
                                </div>

                                {/* Numbers */}
                                <div className="grid grid-cols-5 gap-1">
                                    {winner.card?.numbers?.map((row, rowIndex) => (
                                        <React.Fragment key={rowIndex}>
                                            {row.map((num, colIndex) => {
                                                const isCalled = calledNumbersSet.has(num);
                                                const isWinningCell = winner.winningPattern?.[rowIndex]?.[colIndex];
                                                const isFree = rowIndex === 2 && colIndex === 2;

                                                return (
                                                    <div
                                                        key={`${rowIndex}-${colIndex}`}
                                                        className={`
                                                            h-7 rounded-md flex items-center justify-center text-sm font-bold shadow-sm transition-all
                                                            ${isFree
                                                                ? 'bg-[#1656AD] text-white border-[#0d3d7a] shadow-[0_0_15px_#1656AD]' // Free star -> BLUE (matches winning pattern)
                                                                : isWinningCell
                                                                    ? 'bg-[#1656AD] text-white border-[#0d3d7a] shadow-[0_0_20px_#1656AD] font-black' // Winning cells -> BLUE (removed scale-110)
                                                                    : isCalled
                                                                        ? 'bg-[#F4A460] text-white border-[#d4844a]' // Called numbers -> SANDY BROWN
                                                                        : 'bg-white text-slate-900 border-white/10' // Unmatched White
                                                            }
                                                        `}
                                                    >
                                                        {isFree ? <Sparkles size={14} className="text-white" /> : num}
                                                    </div>
                                                );
                                            })}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer Timer */}
                <div className="mt-8 bg-slate-800/80 backdrop-blur border border-slate-700/50 text-slate-300 px-6 py-3 rounded-full text-sm font-medium flex items-center gap-2 shadow-lg mb-8">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    Auto-starting next game in {countdown}s
                </div>

            </div>
        </div>
    );
};
