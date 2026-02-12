# 🔧 Cloudflare Workers - Manual Deployment

## ⚠️ **Auth Issue**

Wrangler auth token expired. Need to re-login.

---

## 🚀 **Quick Deploy Steps**

### **Step 1: Re-login to Cloudflare**

```bash
cd workers
wrangler login
```

This will open your browser to authorize Wrangler.

### **Step 2: Set Secrets Manually**

```bash
wrangler secret put SUPABASE_URL
# When prompted, paste: https://hthvotvtkqggbdpfrryb.supabase.co

wrangler secret put SUPABASE_SERVICE_KEY
# When prompted, paste: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0aHZvdHZ0a3FnZ2JkcGZycnliIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTgwMTY5OCwiZXhwIjoyMDgxMzc3Njk4fQ.xfwiBDtCiOyWyiAna9DgiM7mjrbQxcr0loDVwAnATAc

wrangler secret put BOT_TOKEN
# When prompted, paste: 8214698066:AAFVjf2wjI1KcxXq0jKYXcjNyIYEMmiXvYE
```

### **Step 3: Deploy**

```bash
wrangler deploy
```

You'll get a URL like:
```
https://bingo-api.YOUR-SUBDOMAIN.workers.dev
```

### **Step 4: Test**

```bash
# Test health
curl https://bingo-api.YOUR-SUBDOMAIN.workers.dev/health

# Test game modes
curl https://bingo-api.YOUR-SUBDOMAIN.workers.dev/api/game/modes
```

### **Step 5: Set Bot Webhook**

```bash
curl -X POST "https://api.telegram.org/bot8214698066:AAFVjf2wjI1KcxXq0jKYXcjNyIYEMmiXvYE/setWebhook?url=https://bingo-api.YOUR-SUBDOMAIN.workers.dev/bot/webhook"
```

---

## ✅ **That's It!**

Your Cloudflare Workers stack will be live!

- ✅ API routes working
- ✅ Durable Objects for game rooms
- ✅ Bot webhook set
- ✅ $0/month cost

**Test the bot by sending `/start` in Telegram!** 🎉
