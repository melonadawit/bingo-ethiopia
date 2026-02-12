// Script to update Telegram bot commands
// Run this to register all bot commands with BotFather

const BOT_TOKEN = process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN';

const commands = [
    { command: 'start', description: 'Start the bot and register' },
    { command: 'tournament', description: 'View active tournaments' },
    { command: 'events', description: 'View special events' },
    { command: 'admin', description: 'Admin panel (admin only)' },
    { command: 'pending', description: 'View pending payments (admin only)' }
];

async function setCommands() {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/setMyCommands`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commands })
    });

    const result = await response.json();
    console.log('Commands updated:', result);
}

setCommands();
