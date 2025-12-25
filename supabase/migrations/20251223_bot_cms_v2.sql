-- BOT CMS EXPANSION (V2)
-- Seeds all configuration keys from the hardcoded config.ts to the database.

-- 1. PAYMENT LIMITS
INSERT INTO bot_configs (key, value, description, category, updated_by) VALUES
('min_deposit', '10', 'Minimum deposit amount (ETB)', 'finance', NULL),
('min_withdrawal', '100', 'Minimum withdrawal amount (ETB)', 'finance', NULL),
('max_withdrawal', '20000', 'Maximum withdrawal amount (ETB)', 'finance', NULL),
('withdrawal_fee', '5', 'Withdrawal fee percentage or fixed amount', 'finance', NULL)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 2. REFERRAL SETTINGS
INSERT INTO bot_configs (key, value, description, category, updated_by) VALUES
('referral_reward_referrer', '10', 'Reward for the person who refers (ETB)', 'marketing', NULL),
('referral_reward_referred', '10', 'Reward for the new user (ETB)', 'marketing', NULL)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 3. DAILY REWARDS (JSON)
INSERT INTO bot_configs (key, value, description, category, updated_by) VALUES
('daily_rewards_structure', '{"1": 10, "2": 15, "3": 20, "4": 25, "5": 30, "6": 35, "7": 50}', 'Daily login bonus structure (Day: Amount)', 'marketing', NULL)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 4. MESSAGES & PROMPTS
INSERT INTO bot_configs (key, value, description, category, updated_by) VALUES
('msg_welcome', '👋 Welcome to Bingo Ethiopia!\n\nPlease register first by clicking the button below:', 'Welcome message for non-registered users', 'messages', NULL),
('msg_deposit_prompt', '💰 ማስገባት የሚፈልጉትን መጠን ከ10 ብር ጀምሮ ያስገቡ።', 'Prompt for deposit amount', 'messages', NULL),
('msg_deposit_pending', '✅ Your deposit Request have been sent to admins please wait 1 min.', 'Deposit success message', 'messages', NULL),
('msg_withdraw_prompt', '💰 ማውጣት የሚፈልጉትን የገንዘብ መጠን ያስገቡ ?', 'Prompt for withdrawal amount', 'messages', NULL),
('msg_instructions', '📘 የቢንጎ ጨዋታ ህጎች\n\n1. ጨዋታውን ለመጀመር...', 'Full game instructions text', 'content', NULL),
('msg_support', '📞 Contact Support\n\nPhone: +251-931-50-35-59\nTelegram: @onlineet_bingo_support', 'Support contact info', 'content', NULL)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 5. PAYMENT METHODS (JSON) - Making them dynamic too!
INSERT INTO bot_configs (key, value, description, category, updated_by) VALUES
('payment_methods', '{
  "telebirr": {
    "name": "Telebirr",
    "account": "0931503559",
    "accountName": "Tadese",
    "instructions": "1. ከታች ባለው የቴሌብር አካውንት {amount} ብር ያስገቡ\\n Phone: 0931503559\\n Name: Tadese\\n\\n2. የከፈሉበትን አጭር የጹሁፍ መልዕክት(message) copy በማድረግ እዚ ላይ Past አድረገው ያስገቡና ይላኩት👇👇👇"
  },
  "cbe": {
    "name": "CBE",
    "account": "1000123456789",
    "accountName": "Tadese",
    "instructions": "1. ከታች ባለው የCBE አካውንት {amount} ብር ያስገቡ..."
  }
}', 'Payment methods configuration (Telebirr, CBE, etc.)', 'finance', NULL)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
