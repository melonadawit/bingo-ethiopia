
import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import Lobby from './pages/Lobby';
import Wallet from './pages/Wallet';
import History from './pages/History';
import Settings from './pages/Settings';
import GamePage from './pages/Game';
import Leaderboard from './pages/Leaderboard';
import DashboardLayout from './layouts/DashboardLayout';

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/" element={<DashboardLayout />}>
                <Route index element={<HomePage />} />
                <Route path="/lobby" element={<Lobby />} />
                <Route path="wallet" element={<Wallet />} />
                <Route path="history" element={<History />} />
                <Route path="leaderboard" element={<Leaderboard />} />
                <Route path="settings" element={<Settings />} />
                <Route path="/game/:gameId" element={<GamePage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
        </Routes>
    );
};

export default AppRoutes;
