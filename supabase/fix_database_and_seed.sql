-- ==========================================
-- BINGO ETHIOPIA - DATABASE FIX & SEED SCRIPT
-- ==========================================
-- Run this script in your Supabase SQL Editor to:
-- 1. Ensure all dashboard views are correctly defined.
-- 2. Populate the database with sample data so you can see charts and tables.

-- PART 1: ENSURE VIEWS EXIST
-- ==========================

-- 1. Active Games View (Used by /games page)
DROP VIEW IF EXISTS active_games_view;
CREATE OR REPLACE VIEW active_games_view AS
SELECT 
  g.*,
  COUNT(gp.user_id) as player_count,
  gm.title as mode_title,
  gm.max_players as mode_max_players
FROM games g
LEFT JOIN game_players gp ON g.id = gp.game_id
LEFT JOIN game_modes gm ON g.mode = gm.id
WHERE g.status IN ('waiting', 'active')
GROUP BY g.id, gm.title, gm.max_players;

-- 2. Daily Financials View (Used by /finance and /analytics)
DROP VIEW IF EXISTS daily_financials_view;
CREATE OR REPLACE VIEW daily_financials_view AS
WITH daily_games AS (
    SELECT
        DATE(created_at) as day,
        SUM(CASE WHEN type = 'bet' THEN amount ELSE 0 END) as total_bets,
        SUM(CASE WHEN type = 'win' THEN amount ELSE 0 END) as total_payouts,
        COUNT(DISTINCT user_id) as active_players
    FROM game_transactions
    GROUP BY DATE(created_at)
),
daily_cashflow AS (
    SELECT
        DATE(processed_at) as day,
        SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END) as total_deposits,
        SUM(CASE WHEN type = 'withdraw' THEN amount ELSE 0 END) as total_withdrawals
    FROM payment_requests
    WHERE status = 'approved'
    GROUP BY DATE(processed_at)
),
daily_referrals AS (
    SELECT
        DATE(created_at) as day,
        SUM(reward_amount) as total_referral_bonus
    FROM referrals
    WHERE status = 'completed'
    GROUP BY DATE(created_at)
)
SELECT
    COALESCE(dg.day, dc.day, dr.day) as date,
    COALESCE(dc.total_deposits, 0) as total_deposits,
    COALESCE(dc.total_withdrawals, 0) as total_withdrawals,
    COALESCE(dg.total_bets, 0) as total_bets,
    COALESCE(dg.total_payouts, 0) as total_payouts,
    COALESCE(dr.total_referral_bonus, 0) as total_referral_bonus,
    (COALESCE(dg.total_bets, 0) - COALESCE(dg.total_payouts, 0)) as gross_gaming_revenue,
    (COALESCE(dg.total_bets, 0) - COALESCE(dg.total_payouts, 0) - COALESCE(dr.total_referral_bonus, 0)) as net_profit,

    COALESCE(dg.active_players, 0) as active_players
FROM daily_games dg
FULL OUTER JOIN daily_cashflow dc ON dg.day = dc.day
FULL OUTER JOIN daily_referrals dr ON COALESCE(dg.day, dc.day) = dr.day
ORDER BY date DESC;

-- 3. Bot Configs Table (Required for CMS)
DROP TABLE IF EXISTS bot_configs;
CREATE TABLE IF NOT EXISTS bot_configs (
    key TEXT PRIMARY KEY,
    value TEXT, -- JSON stringified
    category TEXT DEFAULT 'general',
    updated_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Marketing Campaigns Table (Required for Marketing)
CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    message TEXT,
    audience_filter JSONB,
    status TEXT DEFAULT 'draft', -- draft, active, completed
    sent_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Admin Users View (Used by /team)
DROP VIEW IF EXISTS admin_users_view;
CREATE OR REPLACE VIEW admin_users_view AS
SELECT 
  au.*,
  u.email as auth_email,
  u.last_sign_in_at
FROM admin_users au
LEFT JOIN auth.users u ON au.email = u.email;


-- PART 2: SEED SAMPLE DATA (Only runs if tables are empty)
-- ========================================================

DO $$
DECLARE
    dummy_user_id UUID;
    dummy_telegram_id BIGINT;
    dummy_game_id UUID;
BEGIN
    -- 1. Create Dummy Users if none exist
    IF NOT EXISTS (SELECT 1 FROM users LIMIT 1) THEN
        INSERT INTO users (telegram_id, username, first_name, balance, is_registered)
        VALUES 
            (111222333, 'demo_admin', 'Admin User', 5000.00, true),
            (444555666, 'lucky_player', 'Lucky', 1500.00, true),
            (777888999, 'newbie', 'New Player', 100.00, true)
        RETURNING id, telegram_id INTO dummy_user_id, dummy_telegram_id;
    ELSE
        SELECT id, telegram_id INTO dummy_user_id, dummy_telegram_id FROM users LIMIT 1;
    END IF;

    -- 2. Create Dummy Active Game
    IF NOT EXISTS (SELECT 1 FROM games WHERE status = 'active') THEN
        INSERT INTO games (mode, status, entry_fee, max_players, started_at)
        VALUES ('ande-zig', 'active', 10.00, 10, NOW())
        RETURNING id INTO dummy_game_id;
        
        -- Add players to game (Use UUID for game_players)
        INSERT INTO game_players (game_id, user_id, card_id, card_data)
        VALUES (dummy_game_id, dummy_user_id, 1, '[[1,2,3,4,5],[6,7,8,9,10],[11,12,13,14,15],[16,17,18,19,20],[21,22,23,24,25]]'::jsonb);
    ELSE
        SELECT id INTO dummy_game_id FROM games WHERE status = 'active' LIMIT 1;
    END IF;

    -- 3. Create Dummy Financial Data (We need BIGINT user_id here for game_transactions)
    
    -- Day 1: Deposit
    IF NOT EXISTS (SELECT 1 FROM payment_requests WHERE user_id = dummy_telegram_id) THEN
        INSERT INTO payment_requests (user_id, type, amount, status, processed_at)
        VALUES (dummy_telegram_id, 'deposit', 1000.00, 'approved', NOW() - INTERVAL '1 day');
    END IF;

    -- Day 2: Bet (Use BIGINT user_id, TEXT game_id)
    INSERT INTO game_transactions (user_id, game_id, type, amount, created_at)
    VALUES (dummy_telegram_id, dummy_game_id::TEXT, 'bet', 100.00, NOW() - INTERVAL '2 days');

    -- Day 3: Win (Use BIGINT user_id, TEXT game_id)
    INSERT INTO game_transactions (user_id, game_id, type, amount, created_at)
    VALUES (dummy_telegram_id, dummy_game_id::TEXT, 'win', 500.00, NOW() - INTERVAL '3 days');

    -- 4. Seed Bot Configs (if empty)
    IF NOT EXISTS (SELECT 1 FROM bot_configs) THEN
        INSERT INTO bot_configs (key, value, category)
        VALUES 
            ('msg_deposit_prompt', '"💰 Please enter the amount to deposit (min 10 ETB):"', 'general'),
            ('min_deposit', '10', 'limits'),
            ('msg_support', '"📞 Contact @BingoSupport for help."', 'general');
    END IF;

END $$;

-- Grant permissions again just in case
GRANT SELECT ON active_games_view TO authenticated;
GRANT SELECT ON active_games_view TO service_role;
GRANT SELECT ON daily_financials_view TO authenticated;
GRANT SELECT ON daily_financials_view TO service_role;
GRANT SELECT ON admin_users_view TO authenticated;

GRANT SELECT ON admin_users_view TO service_role;

GRANT ALL ON bot_configs TO service_role;
GRANT ALL ON bot_configs TO authenticated; -- Admin needs access

GRANT ALL ON marketing_campaigns TO service_role;
GRANT ALL ON marketing_campaigns TO authenticated;

-- 6. Drip Progress Tracking (New)
CREATE TABLE IF NOT EXISTS user_drip_progress (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    step_id TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, step_id)
);

CREATE INDEX IF NOT EXISTS idx_drip_progress_user_id ON user_drip_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_drip_progress_step_id ON user_drip_progress(step_id);

GRANT ALL ON user_drip_progress TO service_role;
GRANT ALL ON user_drip_progress TO authenticated;

-- 7. Drip RPC Function
CREATE OR REPLACE FUNCTION get_users_for_drip(
    max_created_at TIMESTAMPTZ,
    target_step_id TEXT,
    limit_count INT DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    telegram_id BIGINT,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT u.id, u.telegram_id, u.created_at
    FROM users u
    WHERE u.created_at <= max_created_at
    AND u.telegram_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM user_drip_progress udp
        WHERE udp.user_id = u.id AND udp.step_id = target_step_id
    )
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Storage Buckets (Marketing Assets)
-- Note: Requires `storage` extension usually enabled by default
INSERT INTO storage.buckets (id, name, public)
VALUES ('marketing-assets', 'marketing-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
-- 1. Allow Public Read
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO public
USING ( bucket_id = 'marketing-assets' );

-- 2. Allow Authenticated Uploads (Admin)
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'marketing-assets' );

-- 9a. Game Configs Table (Required for App Control)
CREATE TABLE IF NOT EXISTS game_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version TEXT NOT NULL,
    rules JSONB,
    features JSONB,
    is_active BOOLEAN DEFAULT true,
    created_by UUID, -- Optional Admin ID
    created_at TIMESTAMPTZ DEFAULT NOW()
);

GRANT ALL ON game_configs TO service_role;
GRANT ALL ON game_configs TO authenticated;

-- 9. Update Marketing Campaigns Table (if exists)
DO $$
BEGIN
    ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS media_url TEXT;
    ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS button_text TEXT;
    ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS action_url TEXT;
END $$;


