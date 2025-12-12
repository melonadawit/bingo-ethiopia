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
            // Play celebration sound
            // Play celebration sound
            await voiceCaller.announceWinner(winners[0]?.cartelaNumber || 0);

            // Wait a bit
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Announce each winner's cartela number
            for (const winner of winners) {
                await voiceCaller.callNumber(winner.cartelaNumber);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
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
                    <div key={winner.userId} className="winning-cartela-container">
                        <div className="cartela-header">
                            🏆 Winning Cartela: {winner.cartelaNumber}
                        </div>

                        <div className="bingo-card">
                            {/* Column Headers */}
                            <div className="card-header">
                                {COLUMN_LETTERS.map((letter, i) => (
                                    <div
                                        key={letter}
                                        className="column-letter"
                                        style={{ backgroundColor: COLUMN_COLORS[i] }}
                                    >
                                        {letter}
                                    </div>
                                ))}
                            </div>

                            {/* Card Grid */}
                            <div className="card-grid">
                                {winner.card.map((row, rowIndex) => (
                                    <React.Fragment key={rowIndex}>
                                        {row.map((num, colIndex) => {
                                            const isCalled = isNumberCalled(num);
                                            const isWinning = winner.winningPattern[rowIndex][colIndex];
                                            const isFree = rowIndex === 2 && colIndex === 2;

                                            return (
                                                <div
                                                    key={`${rowIndex}-${colIndex}`}
                                                    className={`card-cell ${isFree ? 'free' :
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
