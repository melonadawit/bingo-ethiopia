import React, { createContext, useContext, useEffect, useState } from 'react';
import { getCurrentUser, loginWithTelegram } from '../services/auth';

interface User {
    id: string;
    username?: string;
    firstName?: string;
    balance: number;
}

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: () => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const checkAuth = async () => {
        try {
            // First check localStorage for immediate load
            const cachedUser = getCurrentUser();
            if (cachedUser) {
                setUser(cachedUser);
                setIsLoading(false); // Stop loading immediately if we have cached user
            }

            // Then verify with backend in background (optional)
            // This can be removed if you want instant load
        } catch (error) {
            console.error('Auth check failed:', error);
            setUser(null);
        } finally {
            if (!getCurrentUser()) {
                setIsLoading(false);
            }
        }
    };

    const login = async () => {
        setIsLoading(true);
        try {
            const user = await loginWithTelegram();
            setUser(user);
        } catch (error) {
            console.error('Login failed:', error);
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

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout }}>
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
