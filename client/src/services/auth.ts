import api from './api';

interface AuthResponse {
    token: string;
    user: any;
}

// Named exports for AuthContext
export const loginWithTelegram = async (): Promise<any> => {
    const initData = (window as any).Telegram?.WebApp?.initData || '';
    const response = await api.post<AuthResponse>('/auth/telegram', { initData });
    if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data.user;
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
