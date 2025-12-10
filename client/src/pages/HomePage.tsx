import React from 'react';
import Lobby from './Lobby';

const HomePage: React.FC = () => {
    // Always show Lobby - authentication happens in background
    // This gives instant load experience
    return <Lobby />;
};

export default HomePage;
