import React, { useEffect, useState } from 'react';

interface NoWinnerAnnouncementProps {
    onNextGame: () => void;
}

export const NoWinnerAnnouncement: React.FC<NoWinnerAnnouncementProps> = ({ onNextGame }) => {
    const [countdown, setCountdown] = useState(10);

    useEffect(() => {
        // Countdown timer
        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            clearInterval(timer);
        };
    }, [onNextGame]);

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
        }}>
            <div style={{
                maxWidth: '600px',
                width: '100%',
                textAlign: 'center' as const,
                animation: 'scale-in 0.5s ease-out'
            }}>
                {/* Sad Icon */}
                <div style={{ fontSize: '80px', marginBottom: '20px' }}>😔</div>

                {/* No Winner Text */}
                <h1 style={{
                    fontSize: '64px',
                    fontWeight: 900,
                    background: 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    margin: '0 0 20px 0',
                    letterSpacing: '4px'
                }}>No Winner!</h1>

                {/* Message */}
                <div style={{
                    fontSize: '20px',
                    color: '#cbd5e1',
                    marginBottom: '20px',
                    lineHeight: 1.6
                }}>
                    All 75 numbers were called, but nobody claimed BINGO this round.
                </div>

                {/* Better luck message */}
                <div style={{
                    fontSize: '24px',
                    color: '#f3f4f6',
                    marginBottom: '30px',
                    fontWeight: 600
                }}>
                    Better luck next time! 🍀
                </div>

                {/* Countdown */}
                <div style={{
                    color: '#9ca3af',
                    fontSize: '16px',
                    marginTop: '20px'
                }}>
                    🔄 Starting next game in {countdown}s
                </div>
            </div>
        </div>
    );
};
