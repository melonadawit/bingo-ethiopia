import axios from 'axios';

// Remove /api suffix if present in env variable
// FALLBACK to production worker if env not set (critical for CF Pages)
let API_URL = import.meta.env.VITE_API_URL || 'https://bingo-api.melonadawit71.workers.dev';
if (API_URL.endsWith('/api')) {
    API_URL = API_URL.slice(0, -4);
}

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
        'Bypass-Tunnel-Reminder': 'true',
    },
});

// Request interceptor for adding auth token and Telegram initData
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Add Telegram WebApp initData for server-side auth
        const tg = (window as any).Telegram?.WebApp;
        if (tg?.initData) {
            config.headers['x-telegram-init-data'] = tg.initData;
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
