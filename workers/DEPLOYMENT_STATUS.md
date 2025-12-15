# 🎉 Cloudflare Workers Deployment

## ✅ **Credentials Set**

All secrets configured:
- ✅ SUPABASE_URL
- ✅ SUPABASE_SERVICE_KEY  
- ✅ BOT_TOKEN

## 🚀 **Deployment Status**

Deploying to Cloudflare...

Your Workers URL will be:
```
https://bingo-api.<your-subdomain>.workers.dev
```

## 📋 **After Deployment**

### **1. Get Your URL**
Check the deployment output for your Workers URL.

### **2. Test Health Endpoint**
```bash
curl https://bingo-api.YOUR-SUBDOMAIN.workers.dev/health
```

Should return:
```json
{
  "status": "ok",
  "version": "3.0.0",
  "platform": "cloudflare-workers",
  "database": "supabase"
}
```

### **3. Test Game Modes**
```bash
curl https://bingo-api.YOUR-SUBDOMAIN.workers.dev/api/game/modes
```

Should return 3 Ethiopian game modes.

### **4. Set Telegram Bot Webhook**
```bash
curl -X POST "https://api.telegram.org/bot8214698066:AAFVjf2wjI1KcxXq0jKYXcjNyIYEMmiXvYE/setWebhook?url=https://bingo-api.YOUR-SUBDOMAIN.workers.dev/bot/webhook"
```

### **5. Test Bot**
Open Telegram and send `/start` to your bot!

---

## 🎯 **Next: Deploy Frontend**

Once Workers is live, deploy frontend to Cloudflare Pages:

```bash
cd client
npx wrangler pages deploy dist --project-name=bingo-ethiopia
```

Update frontend environment variables:
```
VITE_API_URL=https://bingo-api.YOUR-SUBDOMAIN.workers.dev
VITE_WS_URL=wss://bingo-api.YOUR-SUBDOMAIN.workers.dev
```

---

## ✅ **Success Checklist**

- [ ] Workers deployed
- [ ] Health endpoint working
- [ ] Game modes endpoint working
- [ ] Bot webhook set
- [ ] Bot responding to /start
- [ ] Frontend deployed
- [ ] WebSocket connecting

**You're almost there!** 🚀
