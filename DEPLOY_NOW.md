# 🚀 DEPLOY BACKEND TO RENDER - STEP BY STEP

## ✅ Your code is ready! Follow these exact steps:

### Step 1: Go to Render
1. Open https://render.com in your browser
2. Click "Get Started" or "Sign Up"
3. Choose "Sign up with GitHub"
4. Authorize Render to access your GitHub

### Step 2: Create New Web Service
1. Click the blue "New +" button (top right)
2. Select "Web Service"
3. You'll see a list of your GitHub repositories
4. Find and click "bingo-ethiopia"

### Step 3: Configure the Service
Fill in these EXACT values:

**Name:** `bingo-ethiopia-api`

**Root Directory:** `server`

**Environment:** `Node`

**Region:** `Frankfurt (EU Central)` (or closest to you)

**Branch:** `main`

**Build Command:** 
```
npm install && npm run build
```

**Start Command:**
```
npm start
```

**Plan:** Select **"Free"**

### Step 4: Add Environment Variables

Click "Advanced" → "Add Environment Variable"

Add these ONE BY ONE:

1. **CHAPA_SECRET_KEY**
   ```
   CHASECK_TEST-3uteD329HSKOHaUqxxAK8qN4VU7QJgDF
   ```

2. **CHAPA_PUBLIC_KEY**
   ```
   CHAPUBK_TEST-eBkWiTm9nVjZ6t9Lfwlo4pHQwaeLZeRc
   ```

3. **CHAPA_ENCRYPTION_KEY**
   ```
   kGCcmvvazLOKv6Tn7Pw6nlx8
   ```

4. **NODE_ENV**
   ```
   production
   ```

5. **PORT**
   ```
   10000
   ```

### Step 5: Deploy!
1. Click "Create Web Service" button at the bottom
2. Wait 3-5 minutes for deployment
3. Watch the logs - you should see "Build successful"

### Step 6: Copy Your API URL
After deployment, you'll see your URL at the top:
```
https://bingo-ethiopia-api.onrender.com
```
**COPY THIS URL!**

---

## 🔄 UPDATE VERCEL (IMPORTANT!)

### Step 7: Update Vercel Environment Variable

1. Go to https://vercel.com/dashboard
2. Click on your "bingo-ethiopia" project
3. Go to "Settings" tab
4. Click "Environment Variables" in left sidebar
5. Look for `VITE_API_URL`
   - If it exists: Click "Edit" and update the value
   - If it doesn't exist: Click "Add New"

6. Set:
   - **Name:** `VITE_API_URL`
   - **Value:** `https://bingo-ethiopia-api.onrender.com` (your Render URL)
   - **Environment:** Check all (Production, Preview, Development)

7. Click "Save"

### Step 8: Redeploy Vercel

1. Go to "Deployments" tab
2. Click the 3 dots (...) on the latest deployment
3. Click "Redeploy"
4. Wait 1-2 minutes

---

## ✅ TEST PAYMENT!

1. Open your Vercel app: `https://your-app.vercel.app`
2. Click menu → Wallet
3. Click "Deposit"
4. Enter amount: 50
5. Click "Pay Now"
6. Should redirect to Chapa checkout! 🎉

**Test Card:**
```
Card: 5204 7300 0000 0003
CVV: 123
Expiry: 12/25
```

---

## 🐛 If Something Goes Wrong

**Render deployment fails:**
- Check the logs in Render dashboard
- Make sure all environment variables are set correctly

**Vercel still shows "Processing...":**
- Make sure you updated VITE_API_URL
- Make sure you redeployed Vercel
- Wait 30-60 seconds (cold start)
- Check browser console for errors

**Need help?**
- Check Render logs for errors
- Verify the API URL is correct
- Test the API directly: `https://bingo-ethiopia-api.onrender.com/health`

---

## 📞 Ready to Deploy?

Follow the steps above carefully. The whole process takes about 10 minutes!

After deployment, your payment will work perfectly! 🚀
