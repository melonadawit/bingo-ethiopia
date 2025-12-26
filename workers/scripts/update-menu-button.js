const BOT_TOKEN = '8214698066:AAFVjf2wjI1KcxXq0jKYXcjNyIYEMmiXvYE';
const WEB_APP_URL = 'https://9015dbfa.bingo-client.pages.dev';

async function setMenuButton() {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/setChatMenuButton`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            menu_button: {
                type: 'web_app',
                text: '🎮 Play Bingo',
                web_app: { url: WEB_APP_URL }
            }
        })
    });

    const result = await response.json();
    console.log('Menu button update result:', result);
}

setMenuButton();
