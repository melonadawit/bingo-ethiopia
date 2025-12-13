# ⚙️ URGENT: Add This to Render Environment Variables

Go to **Render Dashboard** → Your Service → **Environment**

Add this variable:

```
WEB_APP_URL=https://bingo-ethiopia.vercel.app
```

Click **Save Changes** → Render will redeploy automatically

---

## Why This is Needed

Telegram requires HTTPS URLs for WebApp buttons. The bot is currently using `http://localhost:5173` because `WEB_APP_URL` is not set.

Once you add this environment variable, the bot will work perfectly!

---

## Quick Steps:
1. Open Render.com
2. Click your service
3. Go to "Environment" tab
4. Click "Add Environment Variable"
5. Key: `WEB_APP_URL`
6. Value: `https://bingo-ethiopia.vercel.app`
7. Click "Save"
8. Wait ~3 minutes for redeploy
9. Test `/start` on Telegram ✅
