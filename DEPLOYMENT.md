# Bingo Ethiopia - Deployment Guide

## 🚀 Quick Deploy to Render (Free)

### Step 1: Push Code to GitHub
```bash
git add .
git commit -m "Ready for deployment"
git push
```

### Step 2: Deploy on Render

1. Go to https://render.com
2. Sign up/Login with GitHub
3. Click **"New +"** → **"Web Service"**
4. Select your repository: **bingo-ethiopia**
5. Configure:
   - **Name:** `bingo-ethiopia-api`
   - **Root Directory:** `server`
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Plan:** `Free`

6. **Add Environment Variables:**
   ```
   CHAPA_SECRET_KEY=CHASECK_TEST-3uteD329HSKOHaUqxxAK8qN4VU7QJgDF
   CHAPA_PUBLIC_KEY=CHAPUBK_TEST-eBkWiTm9nVjZ6t9Lfwlo4pHQwaeLZeRc
   CHAPA_ENCRYPTION_KEY=kGCcmvvazLOKv6Tn7Pw6nlx8
   NODE_ENV=production
   PORT=10000
   ```

7. Click **"Create Web Service"**

### Step 3: Get Your API URL

After deployment completes (~5 mins), you'll get:
```
https://bingo-ethiopia-api.onrender.com
```

### Step 4: Update Vercel

1. Go to Vercel Dashboard
2. Select your project
3. Settings → Environment Variables
4. Add/Update:
   ```
   VITE_API_URL=https://bingo-ethiopia-api.onrender.com
   ```
5. Redeploy

### Step 5: Test!

1. Open your Vercel app
2. Go to Wallet
3. Click Deposit
4. Enter amount
5. Pay with Chapa test credentials

---

## 🔧 Environment Variables Reference

### Required for Render:
```
CHAPA_SECRET_KEY=CHASECK_TEST-3uteD329HSKOHaUqxxAK8qN4VU7QJgDF
CHAPA_PUBLIC_KEY=CHAPUBK_TEST-eBkWiTm9nVjZ6t9Lfwlo4pHQwaeLZeRc
CHAPA_ENCRYPTION_KEY=kGCcmvvazLOKv6Tn7Pw6nlx8
NODE_ENV=production
PORT=10000
```

### Required for Vercel:
```
VITE_API_URL=https://bingo-ethiopia-api.onrender.com
```

---

## ✅ Deployment Checklist

- [ ] Code pushed to GitHub
- [ ] Render service created
- [ ] Environment variables added to Render
- [ ] Deployment successful (check logs)
- [ ] API URL copied
- [ ] Vercel environment variable updated
- [ ] Vercel redeployed
- [ ] Payment tested end-to-end

---

## 🐛 Troubleshooting

**Build fails on Render:**
- Check build logs
- Ensure `npm run build` works locally
- Verify all dependencies in package.json

**API not responding:**
- Check Render logs
- Verify environment variables are set
- Wait for cold start (30-60s first request)

**Payment fails:**
- Check Chapa keys are correct
- Verify callback URL is accessible
- Check Render logs for errors

---

## 📞 Support

If you encounter issues:
1. Check Render logs
2. Check Vercel logs
3. Test locally first
4. Verify all environment variables
