import { useEffect, useState } from 'react';
import './index.css';
import AppRoutes from './AppRoutes';
import { useAuth } from './context/AuthContext';
import { DailyRewardModal } from './components/rewards/DailyRewardModal';
import EventBanner from './components/EventBanner';
import api from './services/api';
import { Toaster } from 'react-hot-toast';
import { ConfigProvider, useConfig } from './context/ConfigContext';
import { AlertCircle, Lock } from 'lucide-react';
import { AnnouncementModal } from './components/AnnouncementModal';

function AppContent() {
  const { user } = useAuth();
  const { config, isLoading } = useConfig();
  const [showDailyReward, setShowDailyReward] = useState(false);

  useEffect(() => {
    // Check if running in Telegram Web App
    const telegram = (window as any).Telegram?.WebApp;
    if (telegram) {
      telegram.ready();
      telegram.expand();
    }
  }, []);

  // Check for daily reward when user logs in
  useEffect(() => {
    if (user && config.is_active) {
      checkDailyReward();
    }
  }, [user, config.is_active]);

  const checkDailyReward = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await api.get('/api/rewards/daily/check');
      if (res.data.available && !res.data.alreadyClaimed) {
        setShowDailyReward(true);
      }
    } catch (error) {
      console.error('Failed to check daily reward:', error);
    }
  };

  if (isLoading) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>;

  if (!config.is_active) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center space-y-6">
        <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center animate-pulse">
          <Lock className="w-10 h-10 text-red-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white tracking-tight">Maintenance Mode</h1>
          <p className="text-gray-400 max-w-md">
            We are currently upgrading our servers to improve your gaming experience. Please check back shortly.
          </p>
        </div>
        <div className="text-xs text-gray-600 font-mono">
          System v{config.version} • Status: Locked
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: { zIndex: 99999 },
        }}
      />

      <AnnouncementModal />


      {/* Global Announcement Banner */}
      {config.features.global_announcement && (
        <div className="bg-indigo-600 px-4 py-2 text-white text-xs font-medium flex items-center justify-center gap-2 animate-in slide-in-from-top">
          <AlertCircle className="w-3 h-3" />
          {config.features.global_announcement}
        </div>
      )}

      <EventBanner />
      <AppRoutes />
      {showDailyReward && (
        <DailyRewardModal
          onClose={() => setShowDailyReward(false)}
          onClaimed={() => { setShowDailyReward(false); }}
        />
      )}
    </>
  );
}

function App() {
  return (
    <ConfigProvider>
      <AppContent />
    </ConfigProvider>
  );
}

export default App;
