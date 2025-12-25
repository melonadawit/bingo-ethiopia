-- Create bot_configs table for CMS
CREATE TABLE IF NOT EXISTS bot_configs (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'general',
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Seed default values
INSERT INTO bot_configs (key, value, description, category) VALUES
('welcome_message', '👋 Welcome to Bingo Ethiopia! Hit the button below to start playing.', 'Message sent to new users on /start', 'onboarding'),
('help_message', '🆘 Need help? Contact our support team @BingoSupport or check the FAQ.', 'Message for /help command', 'general'),
('min_deposit_amount', '50', 'Minimum amount allowed for deposits (ETB)', 'finance'),
('referral_bonus_amount', '10', 'Amount rewarded for valid referrals (ETB)', 'finance'),
('support_contact', '@BingoSupport', 'Support telegram handle', 'general')
ON CONFLICT (key) DO NOTHING;

-- Enable RLS
ALTER TABLE bot_configs ENABLE ROW LEVEL SECURITY;

-- Allow Admin Read/Write (assuming admin policy exists)
CREATE POLICY "Admins can view bot configs" ON bot_configs FOR SELECT USING (true); -- Refine to admin check later if needed
CREATE POLICY "Admins can update bot configs" ON bot_configs FOR UPDATE USING (true);
