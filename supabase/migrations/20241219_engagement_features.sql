-- Engagement Features Database Schema
-- Add tables for tournaments, events, and notifications
-- Run this in Supabase SQL Editor

-- ============================================
-- TOURNAMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('daily', 'weekly', 'monthly')),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  entry_fee DECIMAL(10,2) DEFAULT 0,
  prize_pool DECIMAL(10,2) DEFAULT 0,
  prize_distribution JSONB NOT NULL DEFAULT '{"1": 1000, "2": 500, "3": 250}'::jsonb,
  status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'ended')),
  max_participants INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TOURNAMENT PARTICIPANTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS tournament_participants (
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL,
  wins INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  total_winnings DECIMAL(10,2) DEFAULT 0,
  rank INTEGER,
  prize_won DECIMAL(10,2) DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (tournament_id, user_id)
);

-- ============================================
-- SPECIAL EVENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS special_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('happy_hour', 'weekend_bonanza', 'flash_sale', 'holiday')),
  description TEXT,
  multiplier DECIMAL(3,2) DEFAULT 1.0,
  bonus_percentage INTEGER DEFAULT 0,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- EVENT PARTICIPATION TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS event_participation (
  event_id UUID REFERENCES special_events(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL,
  games_played INTEGER DEFAULT 0,
  bonus_earned DECIMAL(10,2) DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (event_id, user_id)
);

-- ============================================
-- NOTIFICATION PREFERENCES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id BIGINT PRIMARY KEY,
  game_alerts BOOLEAN DEFAULT TRUE,
  streak_reminders BOOLEAN DEFAULT TRUE,
  tournament_updates BOOLEAN DEFAULT TRUE,
  event_alerts BOOLEAN DEFAULT TRUE,
  friend_activity BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id BIGINT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('game_starting', 'streak_reminder', 'tournament_update', 'event_alert', 'friend_activity')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

-- Tournament indexes
CREATE INDEX IF NOT EXISTS idx_tournaments_type ON tournaments(type);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournaments_dates ON tournaments(start_date, end_date);

-- Tournament participants indexes
CREATE INDEX IF NOT EXISTS idx_tournament_participants_tournament ON tournament_participants(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_user ON tournament_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_leaderboard ON tournament_participants(tournament_id, wins DESC, total_winnings DESC);

-- Event indexes
CREATE INDEX IF NOT EXISTS idx_events_type ON special_events(type);
CREATE INDEX IF NOT EXISTS idx_events_active ON special_events(is_active, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_events_dates ON special_events(start_time, end_time);

-- Event participation indexes
CREATE INDEX IF NOT EXISTS idx_event_participation_event ON event_participation(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participation_user ON event_participation(user_id);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- ============================================
-- TRIGGERS
-- ============================================

-- Update tournament updated_at
CREATE TRIGGER update_tournaments_updated_at
  BEFORE UPDATE ON tournaments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Update notification preferences updated_at
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Get active tournaments
CREATE OR REPLACE FUNCTION get_active_tournaments()
RETURNS TABLE (
  id UUID,
  name TEXT,
  type TEXT,
  end_date TIMESTAMPTZ,
  participant_count BIGINT,
  prize_pool DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.type,
    t.end_date,
    COUNT(tp.user_id) as participant_count,
    t.prize_pool
  FROM tournaments t
  LEFT JOIN tournament_participants tp ON t.id = tp.tournament_id
  WHERE t.status = 'active'
  GROUP BY t.id, t.name, t.type, t.end_date, t.prize_pool;
END;
$$ LANGUAGE plpgsql;

-- Get active events
CREATE OR REPLACE FUNCTION get_active_events()
RETURNS TABLE (
  id UUID,
  name TEXT,
  type TEXT,
  description TEXT,
  multiplier DECIMAL,
  end_time TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.name,
    e.type,
    e.description,
    e.multiplier,
    e.end_time
  FROM special_events e
  WHERE e.is_active = TRUE
    AND e.start_time <= NOW()
    AND e.end_time >= NOW();
END;
$$ LANGUAGE plpgsql;

-- Get tournament leaderboard
CREATE OR REPLACE FUNCTION get_tournament_leaderboard(tournament_uuid UUID, limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  rank INTEGER,
  user_id BIGINT,
  wins INTEGER,
  games_played INTEGER,
  total_winnings DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tp.rank,
    tp.user_id,
    tp.wins,
    tp.games_played,
    tp.total_winnings
  FROM tournament_participants tp
  WHERE tp.tournament_id = tournament_uuid
  ORDER BY tp.wins DESC, tp.total_winnings DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Update tournament ranks
CREATE OR REPLACE FUNCTION update_tournament_ranks(tournament_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE tournament_participants
  SET rank = subquery.new_rank
  FROM (
    SELECT 
      user_id,
      ROW_NUMBER() OVER (ORDER BY wins DESC, total_winnings DESC) as new_rank
    FROM tournament_participants
    WHERE tournament_id = tournament_uuid
  ) AS subquery
  WHERE tournament_participants.tournament_id = tournament_uuid
    AND tournament_participants.user_id = subquery.user_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VIEWS
-- ============================================

-- Active tournaments with participant count
CREATE OR REPLACE VIEW active_tournaments_view AS
SELECT 
  t.*,
  COUNT(tp.user_id) as participant_count
FROM tournaments t
LEFT JOIN tournament_participants tp ON t.id = tp.tournament_id
WHERE t.status IN ('upcoming', 'active')
GROUP BY t.id;

-- User notification summary
CREATE OR REPLACE VIEW user_notification_summary AS
SELECT 
  user_id,
  COUNT(*) as total_notifications,
  COUNT(*) FILTER (WHERE is_read = FALSE) as unread_count,
  MAX(sent_at) as last_notification_at
FROM notifications
GROUP BY user_id;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Engagement features schema created successfully!';
  RAISE NOTICE '📊 Tables: tournaments, tournament_participants, special_events, event_participation, notification_preferences, notifications';
  RAISE NOTICE '🔧 Functions: get_active_tournaments, get_active_events, get_tournament_leaderboard, update_tournament_ranks';
  RAISE NOTICE '👁️ Views: active_tournaments_view, user_notification_summary';
END $$;
