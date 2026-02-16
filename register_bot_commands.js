const BOT_TOKEN = '8214698066:AAFVjf2wjI1KcxXq0jKYXcjNyIYEMmiXvYE';

async function registerCommands() {
    const commands = [
        { command: 'start', description: 'Start the bot' },
        { command: 'leaderboard', description: 'View top players' },
        { command: 'balance', description: 'Check your balance' },
        { command: 'deposit', description: 'Add funds' },
        { command: 'withdraw', description: 'Withdraw winnings' },
        { command: 'referral', description: 'Invite friends & earn' },
        { command: 'daily_bonus', description: 'Claim your daily gift' },
        { command: 'instruction', description: 'How to play' },
        { command: 'support', description: 'Contact us' }
    ];

    console.log('Registering bot commands...');
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setMyCommands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commands })
    });

    const result = await response.json();
    console.log('Result:', JSON.stringify(result, null, 2));
}

registerCommands();
