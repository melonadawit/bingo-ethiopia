
import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import Lobby from './pages/Lobby';
import Wallet from './pages/Wallet';
import History from './pages/History';
import Settings from './pages/Settings';
import GamePage from './pages/Game';
import DashboardLayout from './layouts/DashboardLayout';
import ReferralPage from './pages/ReferralPage'; // Added import for ReferralPage

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/" element={<DashboardLayout />}>
                <Route index element={<HomePage />} />
                <Route path="/lobby" element={<Lobby />} />
                <Route path="wallet" element={<Wallet />} />
                <Route path="history" element={<History />} />
                <Route path="settings" element={<Settings />} />
                <Route path="/game/:gameId" element={<GamePage />} />
                <Route path="/referrals" element={<ReferralPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
        </Routes>
    );
};

export default AppRoutes;
