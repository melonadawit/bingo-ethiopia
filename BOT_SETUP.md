# 🤖 Bot Setup Guide

## ✅ Quick Setup (3 Steps)

### Step 1: Add Bot Token to .env

Add these lines to your `server/.env` file:

```bash
BOT_TOKEN=8214698066:AAFVjf2wjI1KcxXq0jKYXcjNyIYEMmiXvYE
WEB_APP_URL=http://localhost:5173
```

### Step 2: Start the Bot

```bash
cd server
npm run dev
```

### Step 3: Test on Telegram

1. Open Telegram
2. Search for your bot: **@BingoEthiopiaBot** (or whatever username you set)
3. Send `/start`

You should see the welcome message with buttons!

---

## 🧪 Test All Commands

Try these commands in Telegram:

```
/start   - Welcome message
/play    - Game selection
/balance - Check wallet
/deposit - Add funds
/withdraw - Cash out
/help    - Support info
```

---

## 🎯 What Works Right Now

✅ All 6 commands respond
✅ Inline keyboard buttons
✅ Beautiful formatted messages
✅ Ethiopian game modes displayed
✅ Rate limiting (20 commands/min)
✅ Error handling

---

## ⚠️ What's Using Mock Data

These show placeholder data (will connect to database later):
- Balance: Shows 150 Birr (hardcoded)
- Stats: Shows mock stats
- Games: Shows 3 fake games
- Payment links: Demo URLs

---

## 🔗 Next: Connect to Your Database

To connect to real data, we need to:
1. Import your existing user/wallet services
2. Replace mock data in commands
3. Connect payment to actual Chapa
4. Add WebApp authentication

Ready to do that next?
