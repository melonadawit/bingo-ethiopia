import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { initSocket } from './socket';
import { db, rtdb } from './firebase';
import { initializeBot } from './bot/index'; // New bot system with Firebase integration

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server and attach Socket.io
const httpServer = createServer(app);
const io = initSocket(httpServer);

app.use(cors({ origin: '*' }));
app.use(express.json());

import authRoutes from './routes/authRoutes';
import gameRoutes from './routes/gameRoutes';
import walletRoutes from './routes/walletRoutes';
import rewardsRoutes from './routes/rewards';
import leaderboardRoutes from './routes/leaderboard';
// import paymentRoutes from './routes/payment'; // Temporarily disabled

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/rewards', rewardsRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
// app.use('/api/payment', paymentRoutes); // Temporarily disabled

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

httpServer.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);

    // Initialize new bot system with Firebase integration
    try {
        if (process.env.BOT_TOKEN) {
            await initializeBot();
            console.log('✅ Telegram bot initialized successfully');
        } else {
            console.log('⚠️  BOT_TOKEN not set - bot disabled');
        }
    } catch (error) {
        console.error('❌ Failed to initialize bot:', error);
    }

    // Initialize leaderboard cron jobs
    try {
        const { initializeLeaderboardJobs } = await import('./jobs/leaderboardJobs');
        initializeLeaderboardJobs();
    } catch (error) {
        console.error('❌ Failed to initialize leaderboard jobs:', error);
    }
});

// Process monitoring for free tier stability
process.on('uncaughtException', (error) => {
    console.error('🚨 UNCAUGHT EXCEPTION:', error);
    console.error('Stack:', error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

// Log memory usage every 30 seconds
setInterval(() => {
    const used = process.memoryUsage();
    console.log(`💾 Memory: ${Math.round(used.heapUsed / 1024 / 1024)}MB / ${Math.round(used.heapTotal / 1024 / 1024)}MB`);
}, 30000);

