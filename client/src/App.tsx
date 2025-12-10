import { useEffect } from 'react';
import './index.css';
import AppRoutes from './AppRoutes';
import { useAuth } from './context/AuthContext';

function App() {
  const { login, user } = useAuth();

  useEffect(() => {
    // Check if running in Telegram Web App
    const telegram = (window as any).Telegram?.WebApp;

    if (telegram) {
      telegram.ready();
      telegram.expand();

      const initData = telegram.initData;
      console.log('Telegram initData:', initData ? 'Present' : 'Missing');

      if (initData && !user) {
        // Attempt auto-login via Context
        console.log('Attempting Telegram login...');
        login().catch(err => {
          console.error('Login failed:', err);
          // Even if login fails, show the app
        });
      }
    } else {
      console.log('Not running in Telegram WebApp');
    }
  }, [login, user]);

  return <AppRoutes />;
}

export default App;
