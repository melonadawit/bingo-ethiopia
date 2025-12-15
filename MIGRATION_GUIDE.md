# Firebase to Supabase Migration Guide

## 🎯 **Overview**

This script migrates your data from Firebase Firestore to Supabase PostgreSQL.

---

## 📋 **What Gets Migrated**

1. **Users** - All user accounts and balances
2. **Daily Rewards** - Reward streaks and history
3. **Games** - Game history (optional)

---

## ⚠️ **Before You Start**

1. **Backup Firebase** - Export your data first!
2. **Test on staging** - Don't run on production first
3. **Check credentials** - Ensure both Firebase and Supabase are configured

---

## 🚀 **How to Run**

### **Step 1: Install Dependencies**

```bash
cd server
npm install firebase-admin
```

### **Step 2: Configure Environment**

Make sure your `.env` has:

```env
# Firebase
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-client-email
FIREBASE_PRIVATE_KEY="your-private-key"

# Supabase
SUPABASE_URL=https://hthvotvtkqggbdpfrryb.supabase.co
SUPABASE_SERVICE_KEY=your-service-key
```

### **Step 3: Run Migration**

```bash
npx tsx migrate-firebase-to-supabase.ts
```

---

## 📊 **What to Expect**

```
🚀 Starting Firebase → Supabase migration...

🔄 Migrating users...
✅ Migrated 150 users

🔄 Migrating daily rewards...
✅ Migrated 75 daily rewards

🔄 Migrating games...
✅ Migrated 200 games

🎉 Migration complete!
```

---

## ✅ **Verify Migration**

1. **Check Supabase Dashboard**
   - Go to Table Editor
   - Verify row counts match Firebase

2. **Test Queries**
   ```bash
   npm run test:supabase
   ```

3. **Test V2 Server**
   ```bash
   npm run dev:v2
   curl http://localhost:3000/api/game/modes
   ```

---

## 🔄 **If Something Goes Wrong**

1. **Check logs** - Script shows detailed errors
2. **Verify credentials** - Double-check `.env`
3. **Check Supabase** - Ensure tables exist
4. **Re-run** - Script uses `upsert`, safe to re-run

---

## 💡 **Tips**

- Migration is **idempotent** (safe to run multiple times)
- Uses `upsert` to avoid duplicates
- Preserves original IDs where possible
- Skips invalid/missing data

---

## 🎯 **After Migration**

1. ✅ Verify data in Supabase
2. ✅ Test V2 endpoints
3. ✅ Update frontend to use V2 API
4. ✅ Deploy to Railway
5. ✅ Monitor for issues

---

## 🆘 **Troubleshooting**

**Error: "Firebase credentials invalid"**
- Check `FIREBASE_PRIVATE_KEY` format
- Ensure it's wrapped in quotes
- Replace `\n` with actual newlines

**Error: "Supabase connection failed"**
- Verify `SUPABASE_URL`
- Check `SUPABASE_SERVICE_KEY` (not ANON_KEY)

**Error: "Table not found"**
- Run migration SQL first
- Check table names match schema

---

**Ready to migrate?** Make sure you have backups first! 🚀
