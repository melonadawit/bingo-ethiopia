# Payment Setup Guide

## Quick Start - Fix "Failed to Process Deposit"

### 1. Create Environment Files

**Client (.env.local):**
```bash
cd client
# Create .env.local file with:
VITE_API_URL=http://localhost:3002
```

**Server (.env):**
```bash
cd server
# Create .env file with:
PORT=3002
CHAPA_SECRET_KEY=CHASECK_TEST-3uteD329HSKOHaUqxxAK8qN4VU7QJgDF
CHAPA_PUBLIC_KEY=CHAPUBK_TEST-eBkWiTm9nVjZ6t9Lfwlo4pHQwaeLZeRc
CHAPA_ENCRYPTION_KEY=kGCcmvvazLOKv6Tn7Pw6nlx8
API_URL=http://localhost:3002
FRONTEND_URL=http://localhost:5173
```

### 2. Install Dependencies

```bash
# Server
cd server
npm install

# Client
cd ../client
npm install
```

### 3. Start Both Servers

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
```

### 4. Test Payment Flow

1. Open http://localhost:5173
2. Go to Wallet page
3. Click "Deposit"
4. Enter amount (e.g., 100)
5. Click "Pay Now"
6. Should redirect to Chapa checkout

---

## Chapa Test Credentials

**Test Card:**
- Card: 5204 7300 0000 0003
- CVV: 123
- Expiry: 12/25

**Test Phone (Mobile Money):**
- Telebirr: 0911234567
- CBE Birr: 0911234567
- OTP: 123456

---

## Troubleshooting

### Error: "Failed to process deposit"

**Cause:** Backend not running or wrong API URL

**Fix:**
1. Check if backend is running on port 3002
2. Check `.env.local` has correct VITE_API_URL
3. Check browser console for errors

### Error: "Network Error"

**Cause:** CORS or backend not accessible

**Fix:**
1. Ensure backend is running
2. Check CORS is enabled in server
3. Verify ports match

### Error: "Unauthorized"

**Cause:** No auth token

**Fix:**
1. Make sure you're logged in
2. Check localStorage has 'token'
3. Telegram authentication should create mock user

---

## Production Deployment

### Backend (Railway/Render/Heroku)
1. Deploy server folder
2. Set environment variables
3. Get deployed URL (e.g., https://your-api.railway.app)

### Frontend (Vercel)
1. Set environment variable:
   ```
   VITE_API_URL=https://your-api.railway.app
   ```
2. Deploy

### Update Chapa Callback
In `paymentController.ts`, update:
```typescript
callback_url: `https://your-api.railway.app/api/payment/callback`
return_url: `https://your-app.vercel.app/wallet?payment=success`
```

---

## Quick Commands

```bash
# Install server dependencies
cd server && npm install

# Install client dependencies  
cd client && npm install

# Run both (in separate terminals)
cd server && npm run dev
cd client && npm run dev
```
