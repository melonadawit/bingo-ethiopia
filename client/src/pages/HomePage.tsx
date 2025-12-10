import React from 'react';
import { useAuth } from '../context/AuthContext';
import Lobby from './Lobby';

const HomePage: React.FC = () => {
    const { user, isLoading } = useAuth();

    // Always show Lobby - authentication happens in background
    // This gives instant load experience
    return <Lobby />;
};

export default HomePage;
