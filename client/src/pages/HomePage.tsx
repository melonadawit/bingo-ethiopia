import React from 'react';
import { useAuth } from '../context/AuthContext';
import Lobby from './Lobby';
import { Loader2 } from 'lucide-react';

const HomePage: React.FC = () => {
    const { user, isLoading } = useAuth();

    // Show minimal loading while authenticating
    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
                <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
            </div>
        );
    }

    // If user is authenticated, show Lobby directly
    if (user) {
        return <Lobby />;
    }

    // For non-authenticated users - minimal message
    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
        </div>
    );
};

export default HomePage;
