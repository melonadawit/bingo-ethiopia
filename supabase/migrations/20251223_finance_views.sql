-- Financial Analytics Views
-- Aggregates data from game_transactions and payment_requests for dashboard

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

-- Grant permissions
GRANT SELECT ON daily_financials_view TO authenticated;
GRANT SELECT ON daily_financials_view TO service_role;
