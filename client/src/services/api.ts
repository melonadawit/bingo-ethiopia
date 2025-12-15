import axios from 'axios';

// Remove /api suffix if present in env variable
let API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3002';
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

// Request interceptor for adding auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
