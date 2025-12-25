import { useEffect, useState } from 'react';
import './index.css';
import AppRoutes from './AppRoutes';
import { useAuth } from './context/AuthContext';
import { DailyRewardModal } from './components/rewards/DailyRewardModal';
import EventBanner from './components/EventBanner';
import api from './services/api';
import { Toaster } from 'react-hot-toast';






function App() {
  const { user } = useAuth();
  const [showDailyReward, setShowDailyReward] = useState(false);

  useEffect(() => {
    // Check if running in Telegram Web App
    const telegram = (window as any).Telegram?.WebApp;

    if (telegram) {
      telegram.ready();
      telegram.expand();
      // ... rest of init logic remains same but logs are visible in console
    }
  }, []);

  // Check for daily reward when user logs in
  useEffect(() => {
    if (user) {
      checkDailyReward();
    }
  }, [user]);

  const checkDailyReward = async () => {
    try {
      // Only check if user has a token
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found, skipping daily reward check');
        return;
      }

      const res = await api.get('/api/rewards/daily/check');
      if (res.data.available && !res.data.alreadyClaimed) {
        setShowDailyReward(true);
      }
    } catch (error) {
      console.error('Failed to check daily reward:', error);
      // Don't show error to user, just log it
    }
  };

  return (
    <>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            zIndex: 99999,
          },
        }}
      />

      <EventBanner />
      <AppRoutes />
      {showDailyReward && (
        <DailyRewardModal
          onClose={() => setShowDailyReward(false)}
          onClaimed={() => {
            setShowDailyReward(false);
          }}
        />
      )}
    </>
  );
}

export default App;
