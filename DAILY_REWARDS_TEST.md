# 🎁 Testing Daily Rewards System

## What Was Deployed

✅ **Daily Rewards Feature** - Now live in production!

**Features:**
- 7-day streak system
- Reward tiers: 10 → 20 → 30 → 50 → 70 → 85 → 100 Birr
- 24-hour cooldown
- Auto-credit to wallet
- Streak resets after 48h gap

---

## 🧪 How to Test

### 1. Send `/daily` Command

Open your Telegram bot and type:
```
/daily
```

**Expected Result:**
- If first time: Shows "Claim 10 Birr" button (Day 1 reward)
- If already claimed today: Shows time until next claim

### 2. Click "🎁 Claim" Button

**Expected Result:**
```
🎉 Reward Claimed! 🎉

💰 +10 Birr added to wallet!

🔥 Streak: Day 1
🎁 Tomorrow: 20 Birr

Keep your streak alive by claiming daily!
```

### 3. Check Your Balance

Send `/balance` to verify the 10 Birr was added

**Expected:** Balance increased by 10 Birr

### 4. Try Claiming Again

Send `/daily` again immediately

**Expected Result:**
```
✅ Already Claimed Today!

🔥 Current Streak: 1 day
💰 Next Reward: 20 Birr

⏰ Come back in: 23h 59m

🎮 Play games while you wait!
```

---

## 📊 Test Scenarios

### ✅ Scenario 1: First Claim (Day 1)
- Send `/daily`
- Click "Claim 10 Birr"
- Balance increases by 10 Birr
- Streak = 1 day

### ✅ Scenario 2: Already Claimed
- Send `/daily` again
- See "Already Claimed" message
- Shows countdown timer

### ✅ Scenario 3: Daily Streak (Tomorrow)
**Wait 24 hours**, then:
- Send `/daily`
- Click "Claim 20 Birr" (Day 2 reward)
- Balance increases by 20 Birr
- Streak = 2 days

### ✅ Scenario 4: 7-Day Streak Complete
After claiming for 7 consecutive days:
- Day 7 reward: 100 Birr
- Message shows "7-Day Streak Complete! 🏆"
- Next day resets to Day 1 (10 Birr)

### ❌ Scenario 5: Streak Reset
**Skip more than 48 hours**:
- Streak resets to 0
- Next claim starts at Day 1 (10 Birr)

---

## 🔍 What to Check

**Firebase Collection:**
Check Firebase Console → Firestore → `dailyRewards` collection

Should see document with your Telegram ID containing:
```json
{
  "lastClaimDate": "2025-12-13T14:00:00Z",
  "streakDays": 1,
  "totalClaimed": 10,
  "claimHistory": [
    {
      "date": "2025-12-13T14:00:00Z",
      "amount": 10,
      "streakDay": 1
    }
  ]
}
```

---

## ✅ Success Criteria

- [ ] `/daily` command responds
- [ ] Can claim reward successfully
- [ ] Balance increases correctly
- [ ] Can't claim twice in 24h
- [ ] Streak counter increments
- [ ] Data saves to Firebase
- [ ] Cooldown timer shows correctly

---

## 🐛 If Issues Found

Share:
1. What command you ran
2. Expected vs actual result
3. Screenshot if possible
4. Your Telegram user ID

Then I'll fix and redeploy!

---

**Deployment:** ⏳ Render is deploying now (~3-5 minutes)

**After testing daily rewards, we'll continue with:**
- Phase 2: Referral System
- Phase 3: Transaction History
- Phase 4: Game Integration
- Phase 5: Notifications
