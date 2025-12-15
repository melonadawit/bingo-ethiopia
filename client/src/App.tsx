import { useEffect, useState } from 'react';
import './index.css';
import AppRoutes from './AppRoutes';
import { useAuth } from './context/AuthContext';
import { DailyRewardModal } from './components/rewards/DailyRewardModal';
import api from './services/api';

function App() {
  const { login, user } = useAuth();
  const [showDailyReward, setShowDailyReward] = useState(false);

  useEffect(() => {
    // Check if running in Telegram Web App
    const telegram = (window as any).Telegram?.WebApp;

    if (telegram) {
      telegram.ready();
      telegram.expand();

      const initData = telegram.initData;
      console.log('Telegram initData:', initData ? 'Present' : 'Missing');

      if (initData && !user) {
        // Attempt auto-login via Context with real data
        console.log('Attempting Telegram login...');
        login().catch(err => {
          console.error('Login failed:', err);
        });
      } else if (!initData && !user) {
        // Create mock user for testing when initData is missing
        console.log('Creating mock user for Telegram WebApp testing');
        const mockUser = {
          id: 'telegram-user-' + Date.now(),
          username: telegram.initDataUnsafe?.user?.username || 'TelegramUser',
          firstName: telegram.initDataUnsafe?.user?.first_name || 'Player',
          balance: 1000
        };
        localStorage.setItem('user', JSON.stringify(mockUser));
        localStorage.setItem('token', 'mock-token-' + Date.now());
      }
    } else {
      console.log('Not running in Telegram WebApp');
    }
  }, []); // Empty dependency array to run only once

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
      <AppRoutes />
      {showDailyReward && (
        <DailyRewardModal
          onClose={() => setShowDailyReward(false)}
          onClaimed={() => {
            setShowDailyReward(false);
            // Optionally refresh user balance here
          }}
        />
      )}
    </>
  );
}

export default App;
