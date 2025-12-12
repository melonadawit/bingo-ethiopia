import React, { useEffect, useState } from 'react';
import { voiceCaller } from '../services/voiceCaller';

interface Winner {
    userId: string;
    name: string;
    cartelaNumber: number;
    card: number[][];
    winningPattern: boolean[][];
}

interface WinnerAnnouncementProps {
    winners: Winner[];
    calledNumbers: number[];
    onNextGame: () => void;
}

const COLUMN_COLORS = ['#3B82F6', '#6366F1', '#A855F7', '#10B981', '#F97316'];
const COLUMN_LETTERS = ['B', 'I', 'N', 'G', 'O'];

export const WinnerAnnouncement: React.FC<WinnerAnnouncementProps> = ({
    winners,
    calledNumbers,
    onNextGame
}) => {
    const [countdown, setCountdown] = useState(10);
    const [showConfetti, setShowConfetti] = useState(true);

    useEffect(() => {
        // Announce winners
        const announceWinners = async () => {
            // Wait a brief moment for the visual reveal
            await new Promise(resolve => setTimeout(resolve, 500));

            const winner = winners[0];
            // Play strictly the BINGO shout or generic winner sound
            // We removed the individual cartela calls to ensure stability with missing files
            await voiceCaller.announceWinner(winner.cartelaNumber);
        };

        announceWinners();

        // Countdown timer
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    onNextGame();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        // Hide confetti after 5 seconds
        const confettiTimer = setTimeout(() => setShowConfetti(false), 5000);

        return () => {
            clearInterval(timer);
            clearTimeout(confettiTimer);
            voiceCaller.stop(); // Stop any announcement audio if skipped/exited
        };
    }, [winners, onNextGame]);

    const isNumberCalled = (num: number) => calledNumbers.includes(num);

    return (
        <div className="winner-announcement">
            {showConfetti && <div className="confetti-container">
                {[...Array(50)].map((_, i) => (
                    <div
                        key={i}
                        className="confetti"
                        style={{
                            left: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 3}s`,
                            backgroundColor: COLUMN_COLORS[Math.floor(Math.random() * 5)]
                        }}
                    />
                ))}
            </div>}

            <div className="winner-content">
                {/* Crown Icon */}
                <div className="crown-container">
                    <div className="crown-glow" />
                    <div className="crown">👑</div>
                </div>

                {/* BINGO Text */}
                <h1 className="bingo-text">BINGO!</h1>

                {/* Winner Count */}
                <div className="winner-count">
                    🎉 {winners.length} player{winners.length > 1 ? 's' : ''} won!
                </div>

                {/* Winner List */}
                <div className="winner-list">
                    {winners.map((winner) => (
                        <div key={winner.userId} className="winner-pill">
                            <div className="winner-avatar">
                                {winner.name.charAt(0).toUpperCase()}
                            </div>
                            <span className="winner-name">{winner.name}</span>
                            <span className="winner-cartela">#{winner.cartelaNumber}</span>
                        </div>
                    ))}
                </div>

                {/* Display first winner's cartela (or all if space permits) */}
                {winners.slice(0, 1).map((winner) => (
                    <div key={winner.userId} className="winning-cartela-container scale-90 origin-top">
                        <div className="cartela-header text-sm py-1">
                            🏆 Winning Cartela: {winner.cartelaNumber}
                        </div>

                        <div className="bingo-card transform scale-90">
                            {/* Column Headers */}
                            <div className="card-header h-8">
                                {COLUMN_LETTERS.map((letter, i) => (
                                    <div
                                        key={letter}
                                        className="column-letter text-xs"
                                        style={{ backgroundColor: COLUMN_COLORS[i] }}
                                    >
                                        {letter}
                                    </div>
                                ))}
                            </div>

                            {/* Card Grid */}
                            <div className="card-grid gap-0.5 p-0.5">
                                {winner.card.map((row, rowIndex) => (
                                    <React.Fragment key={rowIndex}>
                                        {row.map((num, colIndex) => {
                                            const isCalled = isNumberCalled(num);
                                            const isWinning = winner.winningPattern[rowIndex][colIndex];
                                            const isFree = rowIndex === 2 && colIndex === 2;

                                            return (
                                                <div
                                                    key={`${rowIndex}-${colIndex}`}
                                                    className={`card-cell text-sm h-8 w-8 ${isFree ? 'free' :
                                                        isWinning ? 'winning' :
                                                            isCalled ? 'called' : ''
                                                        }`}
                                                >
                                                    {isFree ? '⭐' : num}
                                                </div>
                                            );
                                        })}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}

                {/* Countdown */}
                <div className="countdown">
                    🔄 Auto-starting next game in {countdown}s
                </div>
            </div>
        </div>
    );
};
