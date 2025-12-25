import api from './api';

interface AuthResponse {
    token: string;
    user: any;
}

// Named exports for AuthContext
export const loginWithTelegram = async (): Promise<any> => {
    try {
        // Get Telegram WebApp data
        const tg = (window as any).Telegram?.WebApp;

        if (!tg) {
            console.error('Telegram WebApp not available');
            throw new Error('Telegram WebApp not available');
        }

        const initData = tg.initData || '';
        const user = tg.initDataUnsafe?.user;

        console.log('Telegram WebApp found:', {
            hasInitData: !!initData,
            initDataLength: initData.length,
            user,
            rawInitData: initData.substring(0, 100) + '...' // Log first 100 chars
        });

        // QUICK FIX: Always try to call API, even with empty initData
        // Let the backend handle validation and errors
        console.log('Calling /auth/telegram API...');
        console.log('Sending initData:', initData || '(empty)');

        const response = await api.post<AuthResponse>('/auth/telegram', { initData });

        console.log('Auth API response:', response.data);

        if (response.data.user) {
            // Save to localStorage
            if (response.data.token) {
                localStorage.setItem('token', response.data.token);
            }
            localStorage.setItem('user', JSON.stringify(response.data.user));
            console.log('✅ User saved to localStorage:', response.data.user);
            return response.data.user;
        }

        throw new Error('No user data in response');
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
};

export const getCurrentUser = () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
};

export const getToken = () => localStorage.getItem('token');

export const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
};

// Legacy authService object for backward compatibility
export const authService = {
    loginWithTelegram,
    getToken,
    logout,
    getCurrentUser
};
