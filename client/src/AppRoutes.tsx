
import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import Lobby from './pages/Lobby';
import Wallet from './pages/Wallet';
import GamePage from './pages/Game';
import DashboardLayout from './layouts/DashboardLayout';

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/" element={<DashboardLayout />}>
                <Route index element={<HomePage />} />
                <Route path="lobby" element={<Lobby />} />
                <Route path="wallet" element={<Wallet />} />
                <Route path="game/:gameId" element={<GamePage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
        </Routes>
    );
};

export default AppRoutes;
