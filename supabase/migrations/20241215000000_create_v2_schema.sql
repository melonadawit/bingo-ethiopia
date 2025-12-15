-- V2 Database Schema for Bingo Ethiopia
-- PostgreSQL Migration

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  telegram_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  balance DECIMAL(10,2) DEFAULT 1000.00,
  total_games_played INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  total_winnings DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- GAME MODES TABLE
-- ============================================
CREATE TABLE game_modes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  min_bet DECIMAL(10,2) NOT NULL,
  max_players INTEGER DEFAULT 10,
  pattern_type TEXT NOT NULL, -- 'one', 'two', 'full'
  color TEXT DEFAULT '#3B82F6',
  icon TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default game modes
INSERT INTO game_modes (id, title, description, min_bet, pattern_type, color) VALUES
  ('ande-zig', 'አንድ ዝግ (Ande Zig)', 'Win with one pattern', 10.00, 'one', '#10B981'),
  ('hulet-zig', 'ሁለት ዝግ (Hulet Zig)', 'Win with two patterns', 25.00, 'two', '#F59E0B'),
  ('mulu-zig', 'ሙሉ ዝግ (Mulu Zig)', 'Win with full card', 50.00, 'full', '#EF4444');

-- ============================================
-- GAMES TABLE
-- ============================================
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mode TEXT NOT NULL REFERENCES game_modes(id),
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'ended')),
  entry_fee DECIMAL(10,2) NOT NULL,
  prize_pool DECIMAL(10,2) DEFAULT 0,
  max_players INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ
);

-- ============================================
-- GAME PLAYERS TABLE
-- ============================================
CREATE TABLE game_players (
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  card_id INTEGER NOT NULL,
  card_data JSONB NOT NULL, -- 5x5 bingo card
  is_winner BOOLEAN DEFAULT FALSE,
  prize_amount DECIMAL(10,2) DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (game_id, user_id)
);

-- ============================================
-- CALLED NUMBERS TABLE
-- ============================================
CREATE TABLE called_numbers (
  game_id UUID REFERENCES games(id) ON DELETE CASCADE,
  number INTEGER NOT NULL CHECK (number >= 1 AND number <= 75),
  called_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (game_id, number)
);

-- ============================================
-- DAILY REWARDS TABLE
-- ============================================
CREATE TABLE daily_rewards (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  last_claim_date DATE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_claimed INTEGER DEFAULT 0,
  total_rewards DECIMAL(10,2) DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- LEADERBOARD ENTRIES TABLE
-- ============================================
CREATE TABLE leaderboard_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  period TEXT NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly')),
  wins INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  total_winnings DECIMAL(10,2) DEFAULT 0,
  rank INTEGER,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, period, period_start)
);

-- ============================================
-- TRANSACTIONS TABLE
-- ============================================
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdraw', 'game_entry', 'game_win', 'daily_reward')),
  amount DECIMAL(10,2) NOT NULL,
  balance_before DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  reference_id UUID, -- game_id or reward_id
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- REFERRALS TABLE
-- ============================================
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  referred_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reward_amount DECIMAL(10,2) DEFAULT 50.00,
  is_claimed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (referrer_id, referred_id)
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Users indexes
CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Games indexes
CREATE INDEX idx_games_status ON games(status);
CREATE INDEX idx_games_mode ON games(mode);
CREATE INDEX idx_games_created_at ON games(created_at);

-- Game players indexes
CREATE INDEX idx_game_players_game_id ON game_players(game_id);
CREATE INDEX idx_game_players_user_id ON game_players(user_id);

-- Called numbers indexes
CREATE INDEX idx_called_numbers_game_id ON called_numbers(game_id);

-- Leaderboard indexes
CREATE INDEX idx_leaderboard_period ON leaderboard_entries(period, period_start);
CREATE INDEX idx_leaderboard_user ON leaderboard_entries(user_id);
CREATE INDEX idx_leaderboard_rank ON leaderboard_entries(period, rank);

-- Transactions indexes
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE called_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can read own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Games policies
CREATE POLICY "Anyone can read active games" ON games
  FOR SELECT USING (status IN ('waiting', 'active'));

-- Game players policies
CREATE POLICY "Players can read own game data" ON game_players
  FOR SELECT USING (auth.uid() = user_id);

-- Leaderboard policies
CREATE POLICY "Anyone can read leaderboards" ON leaderboard_entries
  FOR SELECT USING (true);

-- Transactions policies
CREATE POLICY "Users can read own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_rewards_updated_at
  BEFORE UPDATE ON daily_rewards
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leaderboard_updated_at
  BEFORE UPDATE ON leaderboard_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate leaderboard ranks
CREATE OR REPLACE FUNCTION calculate_leaderboard_ranks()
RETURNS TRIGGER AS $$
BEGIN
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

-- Trigger for leaderboard rank calculation
CREATE TRIGGER update_leaderboard_ranks
  AFTER INSERT OR UPDATE ON leaderboard_entries
  FOR EACH ROW
  EXECUTE FUNCTION calculate_leaderboard_ranks();

-- ============================================
-- VIEWS FOR COMMON QUERIES
-- ============================================

-- Active games with player count
CREATE VIEW active_games_view AS
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

-- User stats view
CREATE VIEW user_stats_view AS
SELECT 
  u.id,
  u.telegram_id,
  u.username,
  u.balance,
  u.total_games_played,
  u.total_wins,
  u.total_winnings,
  CASE 
    WHEN u.total_games_played > 0 
    THEN ROUND((u.total_wins::DECIMAL / u.total_games_played) * 100, 2)
    ELSE 0
  END as win_rate,
  dr.current_streak as daily_streak,
  dr.total_claimed as total_daily_rewards
FROM users u
LEFT JOIN daily_rewards dr ON u.id = dr.user_id;

-- ============================================
-- SAMPLE DATA (for testing)
-- ============================================

-- Insert test user (optional)
-- INSERT INTO users (telegram_id, username, first_name) VALUES
--   (123456789, 'testuser', 'Test');
