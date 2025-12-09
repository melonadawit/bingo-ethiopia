import { io, Socket } from 'socket.io-client';

// Use the API URL from env, but strip the /api suffix if present
const URL = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3002';

export const socket: Socket = io(URL, {
    autoConnect: false,
    transports: ['websocket', 'polling']
});
