-- Default Main Menu Buttons
INSERT INTO bot_configs (key, value) 
VALUES ('bot_menu_buttons', '[
    [{"text": "🎮 Play Now", "type": "web_app"}],
    [{"text": "💰 Balance"}, {"text": "💳 Deposit"}],
    [{"text": "💸 Withdraw"}, {"text": "🎁 Referral"}],
    [{"text": "🎁 Daily Bonus"}, {"text": "📞 Support"}]
]') ON CONFLICT (key) DO NOTHING;

-- Default Custom Commands (Empty initially)
INSERT INTO bot_configs (key, value)
VALUES ('bot_commands', '{}') ON CONFLICT (key) DO NOTHING;

-- Default General Settings
INSERT INTO bot_configs (key, value)
VALUES ('bot_settings', '{
    "welcome_message": "👋 Welcome to Bingo Ethiopia!\n\nPlease register first by clicking the button below:",
    "menu_button_text": "🎮",
    "open_now_text": "🎮 Play Now"
}') ON CONFLICT (key) DO NOTHING;
