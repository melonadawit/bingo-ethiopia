import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { initSocket } from './socket';
import { db, rtdb } from './firebase';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Create HTTP server and attach Socket.io
const httpServer = createServer(app);
const io = initSocket(httpServer);

app.use(cors({ origin: '*' }));
app.use(express.json());

import authRoutes from './routes/authRoutes';
import gameRoutes from './routes/gameRoutes';
import walletRoutes from './routes/walletRoutes';
import paymentRoutes from './routes/payment';

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/payment', paymentRoutes);

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Telegram Webhook
if (bot) {
    app.use(bot.webhookCallback('/telegram-webhook'));
}

import { setupWebhook, bot } from './bot';

httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    setupWebhook().catch(err => console.error('Failed to setup webhook:', err));
});
