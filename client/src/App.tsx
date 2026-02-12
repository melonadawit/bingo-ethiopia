import { useEffect } from 'react';
import './index.css';
import AppRoutes from './AppRoutes';
import { useAuth } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import { ConfigProvider, useConfig } from './context/ConfigContext';
import { Lock } from 'lucide-react';

function AppContent() {
  const { user } = useAuth();
  const { config, isLoading } = useConfig();

  useEffect(() => {
    // Check if running in Telegram Web App
    const telegram = (window as any).Telegram?.WebApp;
    if (telegram) {
      telegram.ready();
      telegram.expand();
    }
  }, []);

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
          System v{config.version || '3.8.1'} • Status: Locked
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


      <AppRoutes />
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
