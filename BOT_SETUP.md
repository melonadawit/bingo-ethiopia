# 🤖 Bot Setup Guide

## ✅ Environment Configuration

### Production Setup (Recommended)

Use your deployed URLs:

```bash
# server/.env
BOT_TOKEN=8214698066:AAFVjf2wjI1KcxXq0jKYXcjNyIYEMmiXvYE
WEB_APP_URL=https://your-app.vercel.app
```

### Local Development

```bash
# server/.env
BOT_TOKEN=8214698066:AAFVjf2wjI1KcxXq0jKYXcjNyIYEMmiXvYE
WEB_APP_URL=http://localhost:5173
```

---

## 🚀 Deploy to Production (Easiest!)

### On Render Dashboard:

1. Go to your service → **Environment** tab
2. Add these variables:
   - `BOT_TOKEN` = `8214698066:AAFVjf2wjI1KcxXq0jKYXcjNyIYEMmiXvYE`
   - `WEB_APP_URL` = `https://your-app.vercel.app` (your actual URL)
3. Click **Save** (triggers automatic redeploy)

### Test Immediately:
- Open Telegram
- Find your bot
- Send `/start` → Bot responds! 🎉

---

## 🧪 Test Locally (Optional)

```bash
cd server
npm run dev
```

Open Telegram and test all commands.

---

## 📋 Available Commands

```
/start   - Welcome & main menu
/play    - Game mode selection
/balance - Wallet info
/deposit - Add funds
/withdraw - Cash out
/help    - Support
```

---

## ✅ What Works Now

- ✅ All 6 commands
- ✅ Inline keyboards
- ✅ Ethiopian game modes
- ✅ Beautiful UI
- ✅ Rate limiting
- ✅ Error handling

---

## 🔄 Next: Connect Real Data

Currently using mock data. To connect:
1. Import Firebase services
2. Connect wallet API
3. Integrate Chapa payments
4. Add user authentication

Ready? Let's do it!
