# 🚀 Bingo Ethiopia - Deployment Guide

Complete guide for deploying Bingo Ethiopia to production using Vercel (frontend) and Render (backend).

## 📋 Prerequisites

Before deploying, ensure you have:
- ✅ GitHub repository with your code
- ✅ Vercel account (free tier available)
- ✅ Render account (free tier available)
- ✅ Firebase project configured
- ✅ Chapa account with API keys

---

## 🎯 Quick Deploy (Recommended Path)

### Step 1: Deploy Backend to Render

#### 1.1 Push Code to GitHub
```bash
git add .
git commit -m "Ready for production deployment"
git push origin main
```

#### 1.2 Create Render Web Service

1. Go to https://render.com
2. Sign up/Login with GitHub
3. Click **"New +"** → **"Web Service"**
4. Select your repository: **bingo-ethiopia**

#### 1.3 Configure Service

Fill in these exact values:

| Field | Value |
|-------|-------|
| **Name** | `bingo-ethiopia-api` |
| **Root Directory** | `server` |
| **Environment** | `Node` |
| **Region** | `Frankfurt (EU Central)` or closest to you |
| **Branch** | `main` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Plan** | **Free** |

#### 1.4 Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"** and add these:

```env
# Chapa Payment Keys
CHAPA_SECRET_KEY=CHASECK_TEST-3uteD329HSKOHaUqxxAK8qN4VU7QJgDF
CHAPA_PUBLIC_KEY=CHAPUBK_TEST-eBkWiTm9nVjZ6t9Lfwlo4pHQwaeLZeRc
CHAPA_ENCRYPTION_KEY=kGCcmvvazLOKv6Tn7Pw6nlx8

# Node Configuration
NODE_ENV=production
PORT=10000

# Firebase Configuration (from Firebase Console)
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY=your-firebase-private-key
FIREBASE_CLIENT_EMAIL=your-firebase-client-email

# JWT Secret (generate a random string)
JWT_SECRET=your-super-secret-jwt-key-change-this
```

> ⚠️ **Important**: Replace `your-firebase-*` values with your actual Firebase credentials from the Firebase Console → Project Settings → Service Accounts

#### 1.5 Deploy

1. Click **"Create Web Service"**
2. Wait 3-5 minutes for deployment
3. Watch the logs for "Build successful"
4. **Copy your API URL**: `https://bingo-ethiopia-api.onrender.com`

---

### Step 2: Deploy Frontend to Vercel

#### 2.1 Connect to Vercel

1. Go to https://vercel.com
2. Sign up/Login with GitHub
3. Click **"Add New"** → **"Project"**
4. Import your **bingo-ethiopia** repository

#### 2.2 Configure Project

| Field | Value |
|-------|-------|
| **Framework Preset** | Vite |
| **Root Directory** | `client` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |

#### 2.3 Add Environment Variables

Click **"Environment Variables"** and add:

```env
# Your Render backend URL
VITE_API_URL=https://bingo-ethiopia-api.onrender.com
```

> 📝 Make sure to use the exact URL from Step 1.5!

#### 2.4 Deploy

1. Click **"Deploy"**
2. Wait 1-2 minutes
3. Get your app URL: `https://bingo-ethiopia-xyz.vercel.app`

---

## ✅ Post-Deployment Checklist

After deploying both services:

- [ ] Backend health check: `https://bingo-ethiopia-api.onrender.com/health`
- [ ] Frontend loads correctly
- [ ] User registration works
- [ ] Login works
- [ ] Wallet deposit initiates Chapa payment
- [ ] Game lobby shows available games
- [ ] Can join and play a game
- [ ] Audio plays correctly
- [ ] Withdrawal requests process

---

## 🧪 Testing the Deployment

### 1. Test Backend API

```bash
# Health check
curl https://bingo-ethiopia-api.onrender.com/health

# Expected response: {"status":"ok"}
```

### 2. Test Payment Flow

1. Open your Vercel app
2. Sign up for a new account
3. Go to Wallet → Deposit
4. Enter amount: **50 ETB**
5. Click "Pay Now"
6. Should redirect to Chapa checkout ✅

**Test Card Details:**
```
Card Number: 5204 7300 0000 0003
CVV: 123
Expiry: 12/25
Name: Test User
```

### 3. Test Game Flow

1. After deposit, go to Lobby
2. Join or create a game
3. Wait for game to start
4. Verify numbers are called
5. Test "BINGO!" claim

---

## 🔧 Environment Variables Reference

### Backend (Render)

```env
# Required
CHAPA_SECRET_KEY=your-chapa-secret-key
CHAPA_PUBLIC_KEY=your-chapa-public-key
CHAPA_ENCRYPTION_KEY=your-chapa-encryption-key
NODE_ENV=production
PORT=10000
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email
JWT_SECRET=your-jwt-secret

# Optional
BOT_ENABLED=false
MIN_PLAYERS=2
```

### Frontend (Vercel)

```env
# Required
VITE_API_URL=https://your-backend-url.onrender.com
```

---

## 🔄 Updating the Deployment

### Update Backend

Render auto-deploys when you push to `main`:

```bash
git add .
git commit -m "Update backend"
git push origin main
```

Render will automatically:
1. Pull latest code
2. Run build
3. Deploy new version

### Update Frontend

Vercel also auto-deploys from `main`:

```bash
git add .
git commit -m "Update frontend"
git push origin main
```

### Manual Redeploy

**Render:**
1. Go to your service dashboard
2. Click "Manual Deploy" → "Deploy latest commit"

**Vercel:**
1. Go to project dashboard
2. Go to Deployments tab
3. Click ⋯ on latest deployment → "Redeploy"

---

## 🐛 Troubleshooting

### Backend Issues

#### Build Fails
```
Error: Cannot find module 'xyz'
```
**Solution:**
- Verify `package.json` includes the missing dependency
- Check that `npm install` is in build command
- Review Render logs for specific error

#### Service Won't Start
```
Error: listen EADDRINUSE
```
**Solution:**
- Ensure `PORT` environment variable is set to `10000`
- Check that `src/index.ts` uses `process.env.PORT`

#### Database Connection Fails
```
Error: Firebase credentials invalid
```
**Solution:**
- Verify Firebase environment variables are set correctly
- Check that private key is properly formatted (with \n for newlines)
- Ensure Firebase project has Firestore enabled

### Frontend Issues

#### Build Fails
```
Error: VITE_API_URL is not defined
```
**Solution:**
- Add `VITE_API_URL` to Vercel environment variables
- Redeploy after adding variable

#### API Calls Fail (CORS Error)
```
Access to fetch blocked by CORS policy
```
**Solution:**
- Verify backend CORS is configured to allow your Vercel domain
- Check that `VITE_API_URL` doesn't have trailing slash
- Update `server/src/index.ts` CORS configuration:
```typescript
app.use(cors({
  origin: ['https://your-app.vercel.app'],
  credentials: true
}));
```

#### Socket Connection Fails
```
WebSocket connection failed
```
**Solution:**
- Verify backend is running and accessible
- Check that Socket.IO is properly configured for production
- Ensure Render service is not sleeping (free tier sleeps after inactivity)

### Payment Issues

#### Chapa Redirect Fails
**Solution:**
- Verify Chapa keys are correctly set in Render
- Check that callback URL is accessible
- Review Render logs for payment errors
- Ensure using HTTPS (HTTP won't work for callbacks)

#### Cold Start Delay
**Issue:** First request takes 30-60 seconds

**Solution:**
- This is normal on Render's free tier
- Service "wakes up" after first request
- Consider upgrading to paid tier for production
- Implement a keep-alive ping from frontend

---

## 📊 Monitoring & Logs

### View Render Logs
1. Go to your service dashboard
2. Click "Logs" tab
3. Filter by error level if needed

### View Vercel Logs
1. Go to project dashboard
2. Click "Deployments"
3. Click on a deployment
4. View "Build Logs" or "Function Logs"

### Set Up Error Tracking (Recommended)

Add [Sentry](https://sentry.io) for error tracking:

```bash
npm install @sentry/node @sentry/react
```

---

## 🔐 Security Best Practices

### Before Production

- [ ] Change all default secret keys
- [ ] Use production Chapa keys (not test keys)
- [ ] Enable HTTPS only
- [ ] Configure CORS for specific domains
- [ ] Add rate limiting
- [ ] Enable Firebase security rules
- [ ] Set up monitoring and alerts
- [ ] Configure proper logging
- [ ] Add input validation
- [ ] Implement CSP headers

### Environment Secrets

**Never commit:**
- `.env` files
- API keys
- Private keys
- Passwords

**Always use:**
- Environment variables
- Secret management tools
- `.env.example` for templates

---

## 💰 Cost Estimation

### Free Tier (Development/Testing)

| Service | Free Tier | Limits |
|---------|-----------|--------|
| **Render** | Free | 750 hours/month, sleeps after 15 min inactivity |
| **Vercel** | Free | 100 GB bandwidth, unlimited deployments |
| **Firebase** | Free | 1 GiB storage, 50K reads/day |

**Total: $0/month**

### Production (Recommended)

| Service | Plan | Cost |
|---------|------|------|
| **Render** | Starter | $7/month |
| **Vercel** | Pro | $20/month |
| **Firebase** | Blaze (pay-as-you-go) | ~$25-50/month |

**Total: ~$52-77/month**

---

## 📞 Support & Resources

- **Render Docs:** https://render.com/docs
- **Vercel Docs:** https://vercel.com/docs
- **Firebase Docs:** https://firebase.google.com/docs
- **Chapa Docs:** https://chapa.co/docs

---

## 🎉 Next Steps After Deployment

1. **Custom Domain**
   - Add custom domain in Vercel
   - Configure DNS settings
   - Enable SSL (automatic on Vercel)

2. **Monitoring**
   - Set up Sentry for error tracking
   - Add Google Analytics
   - Configure uptime monitoring

3. **Performance**
   - Enable Vercel Analytics
   - Set up CDN caching
   - Optimize images and assets

4. **Marketing**
   - Add SEO metadata
   - Create social media cards
   - Set up email notifications

---

**🚀 Your Bingo Ethiopia app is now live!** Share your Vercel URL with users and start accepting players! 🎰

For issues or questions, check the troubleshooting section or open a GitHub issue.
