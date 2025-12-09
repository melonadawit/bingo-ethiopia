# Vercel Deployment Guide

## Step 1: Push to GitHub

Open a terminal in `c:\Users\OK\.gemini\antigravity\scratch\bingo-ethiopia` and run:

```bash
git init
git add .
git commit -m "Initial commit: Bingo Ethiopia game"
git branch -M main
git remote add origin https://github.com/melonadawit/bingo-ethiopia.git
git push -u origin main
```

**Note**: You may need to authenticate with GitHub. Use your GitHub username and a Personal Access Token (not password).

## Step 2: Deploy to Vercel

1. Go to https://vercel.com/signup
2. Click "Continue with GitHub"
3. Authorize Vercel to access your GitHub account
4. Click "Import Project" or "Add New Project"
5. Select `melonadawit/bingo-ethiopia` repository
6. Vercel will auto-detect it's a Vite project
7. **Important**: Set the Root Directory to `client`
8. Add Environment Variable:
   - Name: `VITE_API_URL`
   - Value: `http://localhost:3002/api` (we'll update this later with ngrok or your backend URL)
9. Click "Deploy"

## Step 3: Update Telegram Bot

After deployment, Vercel will give you a URL like: `https://bingo-ethiopia.vercel.app`

Update your bot's WEBAPP_URL in `server/.env`:
```
WEBAPP_URL=https://bingo-ethiopia.vercel.app
```

Restart your server:
```bash
cd server
npm run dev
```

## Step 4: Configure Backend Connection

Since your backend is running locally, you have two options:

**Option A: Use ngrok for backend** (recommended for testing)
```bash
cd server
.\ngrok.exe http 3002
```
Then update Vercel environment variable `VITE_API_URL` to the ngrok URL.

**Option B: Deploy backend to Railway/Render** (for production)
Deploy your server folder to a hosting service and update `VITE_API_URL`.

## Troubleshooting

- If build fails, check Vercel build logs
- Make sure Root Directory is set to `client`
- Verify all dependencies are in `client/package.json`
