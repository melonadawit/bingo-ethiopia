import React from 'react';
import { useAuth } from '../context/AuthContext';
import Lobby from './Lobby';
import { Loader2 } from 'lucide-react';

const HomePage: React.FC = () => {
    const { user, isLoading } = useAuth();

    // Show loading while authenticating
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
                <Loader2 className="w-12 h-12 text-purple-400 animate-spin mb-4" />
                <p className="text-white/60">Loading...</p>
            </div>
        );
    }

    // If user is authenticated, show Lobby directly
    if (user) {
        return <Lobby />;
    }

    // For non-authenticated users (shouldn't happen via Telegram)
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
            <div className="text-center max-w-md">
                <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    Bingo Ethiopia
                </h1>
                <p className="text-xl mb-8 text-white/80">
                    Please open this app through the Telegram bot
                </p>
                <p className="text-sm text-white/50">
                    Send /start to the bot and click "Play Bingo"
                </p>
            </div>
        </div>
    );
};

export default HomePage;
