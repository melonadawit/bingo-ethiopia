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
      if (initData && !user) {
        // Attempt auto-login via Context
        login();
      }
    }
  }, [login, user]);

  return <AppRoutes />;
}

export default App;

