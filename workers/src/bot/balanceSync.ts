// Add this to bot/notifications.ts - Balance update notification

export async function notifyBalanceUpdate(userId: number, newBalance: number, change: number, reason: string, env: Env) {
    const message = `💰 <b>Balance Updated!</b>\n\n` +
        `${change > 0 ? '+' : ''}${change} Birr\n` +
        `Reason: ${reason}\n\n` +
        `New Balance: ${newBalance} Birr`;

    await sendTelegramMessage(userId.toString(), message, env);

    // Also broadcast to WebSocket if user is connected
    // This will be handled by the game server
}

// Add this to GameRoom.ts or create a new balance sync service

export async function broadcastBalanceUpdate(userId: string, newBalance: number) {
    // Send WebSocket message to all connected clients for this user
    const message = {
        type: 'balance_update',
        balance: newBalance,
        timestamp: Date.now()
    };

    // This will be sent through WebSocket connection
    return message;
}
