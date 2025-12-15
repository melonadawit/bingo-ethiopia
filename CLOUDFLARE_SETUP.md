# Cloudflare Workers Setup Guide

## 🚀 Quick Start (15 minutes)

### **Step 1: Create Cloudflare Account** (3 min)

1. Go to **[cloudflare.com](https://cloudflare.com)**
2. Click **"Sign Up"**
3. Use your email (no credit card required!)
4. Verify email
5. Skip domain setup (not needed yet)

### **Step 2: Install Wrangler CLI** (2 min)

```bash
npm install -g wrangler

# Verify installation
wrangler --version
```

### **Step 3: Login to Cloudflare** (1 min)

```bash
wrangler login

# Opens browser to authorize
# Click "Allow"
```

### **Step 4: Create Workers Project** (5 min)

```bash
cd c:\Users\OK\.gemini\antigravity\scratch\bingo-ethiopia

# Create workers directory
mkdir workers
cd workers

# Create new project
wrangler init bingo-workers

# Choose:
# - TypeScript: Yes
# - Fetch handler: Yes
# - Tests: No (for now)
```

### **Step 5: Test Locally** (2 min)

```bash
cd bingo-workers
wrangler dev

# Opens http://localhost:8787
# Should see "Hello World"
```

### **Step 6: Deploy Test** (2 min)

```bash
wrangler deploy

# Gets URL like:
# https://bingo-workers.your-subdomain.workers.dev
```

---

## ✅ **You're Ready!**

Now I'll create the actual Workers code for your Bingo game!

**Let me know when you've completed these steps!** 🎯
