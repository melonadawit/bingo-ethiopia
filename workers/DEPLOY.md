# 🚀 Cloudflare Workers - Deployment Guide

## ✅ **What's Been Created**

Complete Cloudflare Workers project with:
- ✅ API Routes (game, rewards)
- ✅ Durable Objects (game rooms with WebSocket)
- ✅ Telegram Bot (webhook)
- ✅ Supabase integration
- ✅ TypeScript configuration

---

## 📋 **Next Steps**

### **Step 1: Set Secrets** (2 min)

```bash
cd workers

# Set Supabase credentials
wrangler secret put SUPABASE_URL
# Paste: https://hthvotvtkqggbdpfrryb.supabase.co

wrangler secret put SUPABASE_SERVICE_KEY
# Paste: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0aHZvdHZ0a3FnZ2JkcGZycnliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTgwMTY5OCwiZXhwIjoyMDgxMzc3Njk4fQ.xfwiBDtCiOyWyiAna9DgiM7mjrbQxcr0loDVwAnATAc

wrangler secret put BOT_TOKEN
# Paste: 8214698066:AAFVjf2wjI1KcxXq0jKYXcjNyIYEMmiXvYE
```

### **Step 2: Test Locally** (2 min)

```bash
npm run dev

# Opens http://localhost:8787
# Test: http://localhost:8787/health
```

### **Step 3: Deploy to Cloudflare** (1 min)

```bash
npm run deploy

# Gets URL like:
# https://bingo-api.your-subdomain.workers.dev
```

### **Step 4: Set Bot Webhook** (1 min)

```bash
curl -X POST "https://api.telegram.org/bot8214698066:AAFVjf2wjI1KcxXq0jKYXcjNyIYEMmiXvYE/setWebhook?url=https://bingo-api.YOUR-SUBDOMAIN.workers.dev/bot/webhook"
```

---

## 🧪 **Testing**

### **Test Health:**
```bash
curl https://bingo-api.YOUR-SUBDOMAIN.workers.dev/health
```

### **Test Game Modes:**
```bash
curl https://bingo-api.YOUR-SUBDOMAIN.workers.dev/api/game/modes
```

### **Test Bot:**
Open Telegram and send `/start` to your bot

---

## 🎉 **Success!**

You now have:
- ✅ Workers API deployed
- ✅ Durable Objects for game rooms
- ✅ Bot webhook working
- ✅ $0/month cost

**Next: Deploy frontend to Cloudflare Pages!**
