import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const HomePage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    useEffect(() => {
        // If user is authenticated, redirect to lobby
        if (user) {
            navigate('/lobby');
        }
    }, [user, navigate]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
            <div className="text-center max-w-md">
                <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Bingo Ethiopia
                </h1>
                <p className="text-xl mb-8 text-white/80">
                    Play Real-Money Bingo in Ethiopia!
                </p>

                <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20">
                    <p className="text-white/90 mb-4">
                        🎮 To play Bingo Ethiopia:
                    </p>
                    <ol className="text-left text-white/70 space-y-2 mb-6">
                        <li>1. Open the Telegram bot</li>
                        <li>2. Send <code className="bg-black/30 px-2 py-1 rounded">/start</code></li>
                        <li>3. Register by sharing your contact</li>
                        <li>4. Click "Play Bingo" to start!</li>
                    </ol>

                    <p className="text-sm text-white/50">
                        This app works exclusively through Telegram.
                        <br />
                        Please access it via the Telegram bot.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default HomePage;
