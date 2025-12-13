# 👥 Testing Referral System (Phase 2)

## What Was Deployed

✅ **Referral System** - Now live in production!

**Features:**
- Unique referral codes (REF + your ID)
- Deep link support (`/start REF12345`)
- Auto-rewards: 50 Birr (referrer) + 25 Birr (new user)
- Firebase tracking
- Instant notifications

---

## 🧪 How to Test

### Setup Required:
You need **2 Telegram accounts** (or ask a friend to help)

**Account 1:** Your main account (Referrer)  
**Account 2:** Test account or friend (New User)

---

### Test Scenario 1: Get Your Referral Link

**On Account 1 (Main):**

1. Open bot on Telegram
2. Click "👥 Refer Friends" button (or send `/start`)
3. Look for your referral link

**Expected:**
```
🎁 Invite Friends & Earn!

Your referral link:
https://t.me/YourBotName?start=REF123456

Your Stats:
💰 Total Earnings: 0 Birr
👥 Friends Referred: 0

Rewards:
✅ You: 50 Birr per referral
✅ Friend: 25 Birr welcome bonus
```

**Copy the link** (e.g., `https://t.me/YourBotName?start=REF123456`)

---

### Test Scenario 2: Friend Uses Referral Link

**On Account 2 (New User/Friend):**

1. **Click the referral link** from Account 1
2. Bot opens on Telegram
3. Click "START" button

**Expected Results:**

**Account 2 sees:**
```
🎉 Welcome to Bingo Ethiopia, [Name]!

🎁 Your Starting Balance: 125 Birr
     (100 Birr starting + 25 Birr referral bonus)
```

**Account 2 also gets notification:**
```
🎁 Welcome bonus! You received 25 Birr from your friend's referral!
```

**Account 1 gets notification:**
```
🎉 [Name] joined using your referral link! You earned 50 Birr!
```

---

### Test Scenario 3: Verify Earnings

**On Account 1 (Main):**

1. Send `/balance`
2. Check balance increased by 50 Birr

**Expected:**
```
💵 Balance: 150 Birr  (was 100, +50 from referral)
```

**On Account 2 (Friend):**

1. Send `/balance`
2. Check balance is 125 Birr

**Expected:**
```
💵 Balance: 125 Birr  (100 starting + 25 bonus)
```

---

### Test Scenario 4: Check Referral Stats

**On Account 1 (Main):**

1. Click "👥 Refer Friends" button again

**Expected:**
```
🎁 Invite Friends & Earn!

Your Stats:
💰 Total Earnings: 50 Birr  ← Increased!
👥 Friends Referred: 1      ← Increased!
```

---

## 📊 Firebase Verification

**Check Firestore Console:**

### Collection: `referrals`

**Document for Account 1 (Referrer):**
```json
{
  "referralCode": "REF123456",
  "referredBy": null,
  "referredUsers": [789012],  ← Account 2's ID
  "totalEarnings": 50,
  "referralCount": 1
}
```

**Document for Account 2 (Referee):**
```json
{
  "referralCode": "REF789012",
  "referredBy": 123456,  ← Account 1's ID
  "referredUsers": [],
  "totalEarnings": 0,
  "referralCount": 0
}
```

---

## ✅ Success Criteria

- [ ] Referral link generated correctly
- [ ] New user can click and start bot
- [ ] Referrer gets 50 Birr
- [ ] New user gets 25 Birr
- [ ] Both users receive notifications
- [ ] Stats update correctly
- [ ] Data saves to Firebase
- [ ] Can't refer yourself
- [ ] Can't be referred twice

---

## 🐛 Edge Cases to Test

### ❌ Self-Referral (Should Fail)
- Use your own referral link
- **Expected:** No bonus, silent fail

### ❌ Duplicate Referral (Should Fail)
- Account 2 clicks another referral link
- **Expected:** No bonus (already referred)

### ✅ Multiple Referrals
- Refer 3 different friends
- **Expected:** 50 × 3 = 150 Birr earned

---

## 🔍 Troubleshooting

**Issue: No bonus received**
- Check: Is Account 2 actually a new user? (registered today)
- Check: Firestore `referrals` collection for both users
- Check: Render logs for any errors

**Issue: Notification not sent**
- Check: Both users have started the bot
- Check: Bot has permission to message users

**Issue: Link doesn't work**
- Format should be: `https://t.me/BotUsername?start=REF12345`
- Verify bot username is correct

---

**Deployment:** ⏳ Render is deploying now (~3-5 minutes)

**After testing, let me know:**
1. ✅ or ❌ for each scenario
2. Any errors or unexpected behavior
3. Screenshots if helpful

Then we'll continue with Phases 3-5!
