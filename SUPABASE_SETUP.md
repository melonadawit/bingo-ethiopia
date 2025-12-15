# Supabase Setup Guide

## 🎯 Quick Setup (5 minutes)

### Step 1: Create Supabase Account

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign up with GitHub (recommended)

### Step 2: Create New Project

1. Click "New Project"
2. Fill in details:
   - **Name**: `bingo-ethiopia-v2`
   - **Database Password**: (generate strong password - SAVE THIS!)
   - **Region**: Choose closest to Ethiopia (Europe recommended)
   - **Pricing Plan**: Free tier

3. Click "Create new project"
4. Wait 2-3 minutes for setup

### Step 3: Get Your Credentials

Once project is ready:

1. Go to **Settings** → **API**
2. Copy these values:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...  (public key)
SUPABASE_SERVICE_KEY=eyJhbGc...  (secret key - keep safe!)
```

### Step 4: Apply Database Schema

**Option A: Using Supabase Dashboard** (Easiest)

1. Go to **SQL Editor** in Supabase dashboard
2. Click "New query"
3. Copy entire content from `supabase/migrations/20241215000000_create_v2_schema.sql`
4. Paste into SQL editor
5. Click "Run" (bottom right)
6. Should see "Success. No rows returned"

**Option B: Using Supabase CLI** (Advanced)

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push
```

### Step 5: Verify Schema

1. Go to **Table Editor** in dashboard
2. You should see these tables:
   - ✅ users
   - ✅ game_modes
   - ✅ games
   - ✅ game_players
   - ✅ called_numbers
   - ✅ daily_rewards
   - ✅ leaderboard_entries
   - ✅ transactions
   - ✅ referrals

3. Click on `game_modes` table
4. Should see 3 rows (Ande Zig, Hulet Zig, Mulu Zig)

---

## 🔐 Environment Variables

Create `.env` file in `server/` directory:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key

# Server
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# CORS
CORS_ORIGIN=*

# Telegram Bot (keep existing)
BOT_TOKEN=your-bot-token

# Firebase (keep for now during migration)
FIREBASE_PROJECT_ID=your-project-id
```

---

## 🧪 Test Connection

Create a test file:

```typescript
// test-supabase.ts
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function test() {
  // Test 1: Read game modes
  const { data: modes, error } = await supabase
    .from('game_modes')
    .select('*');
  
  console.log('✅ Game Modes:', modes);
  
  // Test 2: Create test user
  const { data: user, error: userError } = await supabase
    .from('users')
    .insert({
      telegram_id: 123456789,
      username: 'testuser',
      first_name: 'Test'
    })
    .select()
    .single();
  
  console.log('✅ Test User:', user);
  
  // Test 3: Read user back
  const { data: users } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', 123456789);
  
  console.log('✅ Users:', users);
}

test();
```

Run test:

```bash
npx tsx test-supabase.ts
```

Should see:
```
✅ Game Modes: [{ id: 'ande-zig', ... }, ...]
✅ Test User: { id: '...', telegram_id: 123456789, ... }
✅ Users: [{ ... }]
```

---

## 🎯 Next Steps

After Supabase is set up:

1. ✅ Test Fastify server with Supabase
2. ✅ Migrate data from Firebase
3. ✅ Update all routes
4. ✅ Test realtime features

---

## 🆘 Troubleshooting

### "Project not found"
- Make sure you copied the correct project URL
- Check that project is fully initialized (wait 2-3 minutes)

### "Permission denied"
- Make sure you're using SERVICE_KEY (not ANON_KEY) for server
- Check RLS policies are correct

### "Table not found"
- Make sure migration was applied successfully
- Check SQL Editor for any errors

---

## 📚 Resources

- [Supabase Docs](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [PostgreSQL Tutorial](https://www.postgresql.org/docs/current/tutorial.html)

**Ready to test?** Let me know when Supabase is set up! 🚀
