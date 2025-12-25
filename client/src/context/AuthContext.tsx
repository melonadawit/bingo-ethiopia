import React, { createContext, useContext, useEffect, useState } from 'react';
import { loginWithTelegram } from '../services/auth';

interface User {
    id: string;
    telegram_id: number;
    username?: string;
    firstName?: string;
    phone_number?: string;
    balance: number;
    referral_code?: string;
    referred_by?: string;
    is_registered?: boolean;
    created_at?: string;
    referral_count?: number;
    referral_earnings?: number;
    daily_streak?: number;
    total_daily_earned?: number;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: () => Promise<void>;
    logout: () => void;
    authError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [authError, setAuthError] = useState<string | null>(null);

    const checkAuth = async () => {
        try {
            // DO NOT clear localStorage blindly. We need it for persistence if initData fails.
            // localStorage.removeItem('user');
            // localStorage.removeItem('token');

            const token = localStorage.getItem('token');
            const storedUser = localStorage.getItem('user');

            // 1. Initialize Telegram WebApp with retry
            const tg = (window as any).Telegram?.WebApp;
            if (tg) {
                await new Promise(resolve => setTimeout(resolve, 500));
                tg.ready();
                tg.expand();
            }

            // 2. PRIORITY 1: Secure Telegram Auth (initData)
            // If present, this is the gold standard. We always prefer fresh auth.
            if (tg?.initData) {
                console.log('🔒 Attempting secure Telegram authentication...');
                try {
                    const user = await loginWithTelegram();
                    console.log('✅ Secure auth successful:', user);
                    setUser(user);
                    setIsLoading(false);
                    return;
                } catch (error: any) {
                    const msg = error?.response?.data?.error || error?.message || 'Unknown error';
                    setAuthError(`Secure Auth Failed: ${msg}`);
                    console.warn('⚠️ Secure auth failed:', error);
                    // Don't return yet, fall through to token check
                }
            } else {
                setAuthError('No initData found');
                console.log('⚠️ No initData found, skipping secure auth');
            }

            // 3. PRIORITY 2: Persistent Session (Token)
            // If secure auth failed or was skipped, try to use existing token
            if (token && storedUser) {
                console.log('🔄 Attempting to use existing session token...');
                try {
                    // Verify token against /auth/me or similar (optional but strict)
                    // For now, if we have a token, we assume it's valid until a 401 happens elsewhere.
                    // But strictly we should probably validate it.
                    const parsedUser = JSON.parse(storedUser);
                    if (parsedUser && parsedUser.id) {
                        console.log('✅ Session restored from localStorage:', parsedUser);
                        setUser(parsedUser);
                        setIsLoading(false);
                        return;
                    }
                } catch (e) {
                    console.warn('❌ Failed to parse stored user:', e);
                    localStorage.removeItem('user');
                    localStorage.removeItem('token');
                }
            }

            // 4. PRIORITY 3: URL Param Fallback (Least Secure)
            // Only if we have NO session and NO initData
            const urlParams = new URLSearchParams(window.location.search);
            const tgid = urlParams.get('tgid');

            console.log('🔍 Fallback URL Check:', tgid);

            if (tgid) {
                console.log('🔄 Attempting URL parameter fallback...');
                try {
                    const API_URL = import.meta.env.VITE_API_URL || 'https://bingo-api.melonadawit71.workers.dev';
                    const response = await fetch(`${API_URL}/auth/user/${tgid}`);
                    const data = await response.json();

                    if (data.user) {
                        console.log('✅ Fallback auth successful:', data.user);
                        setUser(data.user);
                        // Do NOT set token here unless backend returns it, otherwise they are read-only
                        setIsLoading(false);
                        return;
                    }
                } catch (error) {
                    console.error('❌ Fallback auth failed:', error);
                }
            }

            // FINAL STATE: No Auth
            console.warn('⚠️ All auth methods failed - User is GUEST/LOGGED OUT');
            setUser(null);

        } catch (error) {
            console.error('Auth check failed:', error);
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    const login = async () => {
        setIsLoading(true);
        try {
            const user = await loginWithTelegram();
            setUser(user);
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    useEffect(() => {
        checkAuth();
    }, []);

    // Polling for real-time balance updates
    useEffect(() => {
        if (!user || !user.telegram_id) return;

        const pollBalance = async () => {
            try {
                // Using the specific user endpoint we identified
                const API_URL = import.meta.env.VITE_API_URL || 'https://bingo-api.melonadawit71.workers.dev';
                const response = await fetch(`${API_URL}/auth/user/${user.telegram_id}`);
                if (!response.ok) return;

                const data = await response.json();
                if (data.user && data.user.balance !== user.balance) {
                    console.log(`💰 Balance updated: ${user.balance} -> ${data.user.balance}`);
                    setUser(prev => prev ? { ...prev, ...data.user } : data.user);
                }
            } catch (error) {
                console.error('Silent balance sync failed:', error);
            }
        };

        // Poll every 5 seconds
        const intervalId = setInterval(pollBalance, 5000);
        return () => clearInterval(intervalId);
    }, [user?.telegram_id, user?.balance]); // Depend on ID and Balance to reset interval if changed

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout, authError }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
