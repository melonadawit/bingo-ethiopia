-- Leaderboard Enhancements: Spending-based rankings and Yearly period
-- Run this in Supabase SQL Editor

-- 1. Add yearly to period check and total_spent column
ALTER TABLE leaderboard_entries DROP CONSTRAINT IF EXISTS leaderboard_entries_period_check;
ALTER TABLE leaderboard_entries ADD CONSTRAINT leaderboard_entries_period_check 
  CHECK (period IN ('daily', 'weekly', 'monthly', 'yearly'));

ALTER TABLE leaderboard_entries ADD COLUMN IF NOT EXISTS total_spent DECIMAL(10,2) DEFAULT 0;

-- 2. Create a view for spending-based leaderboard
CREATE OR REPLACE VIEW spending_leaderboard_view AS
SELECT 
  le.*,
  u.username,
  u.first_name,
  u.avatar_url
FROM leaderboard_entries le
JOIN users u ON le.user_id = u.id
ORDER BY le.total_spent DESC;

-- 3. Function to aggregate spending into leaderboard_entries
-- This can be called via cron or manually
CREATE OR REPLACE FUNCTION refresh_spending_leaderboard(p_period TEXT, p_start DATE, p_end DATE)
RETURNS VOID AS $$
BEGIN
  -- Insert or update records for the given period
  INSERT INTO leaderboard_entries (user_id, period, total_spent, period_start, period_end)
  SELECT 
    u.id, 
    p_period, 
    COALESCE(SUM(gt.amount), 0) as spent,
    p_start,
    p_end
  FROM users u
  JOIN game_transactions gt ON u.telegram_id = gt.user_id
  WHERE gt.type = 'bet'
    AND gt.created_at::DATE >= p_start
    AND gt.created_at::DATE <= p_end
  GROUP BY u.id
  ON CONFLICT (user_id, period, period_start) 
  DO UPDATE SET 
    total_spent = EXCLUDED.total_spent,
    updated_at = NOW();

  -- Re-rank based on spending for THIS period
  UPDATE leaderboard_entries le
  SET rank = subquery.new_rank
  FROM (
    SELECT id, ROW_NUMBER() OVER (ORDER BY total_spent DESC) as new_rank
    FROM leaderboard_entries
    WHERE period = p_period AND period_start = p_start
  ) AS subquery
  WHERE le.id = subquery.id;
END;
$$ LANGUAGE plpgsql;

-- 4. Update the existing calculate_leaderboard_ranks to handle spending
CREATE OR REPLACE FUNCTION calculate_leaderboard_ranks()
RETURNS TRIGGER AS $$
BEGIN
  -- Default ranking (Winnings)
  UPDATE leaderboard_entries
  SET rank = subquery.new_rank
  FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY period, period_start
      ORDER BY total_winnings DESC, wins DESC
    ) as new_rank
    FROM leaderboard_entries
    WHERE period = NEW.period AND period_start = NEW.period_start
  ) AS subquery
  WHERE leaderboard_entries.id = subquery.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
