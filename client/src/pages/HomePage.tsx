import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Lobby from './Lobby';

const HomePage: React.FC = () => {
    const { user } = useAuth();

    // If user is authenticated, show Lobby directly
    // This works better in Telegram WebView than navigation
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
                    Authenticating...
                </p>
            </div>
        </div>
    );
};

export default HomePage;
