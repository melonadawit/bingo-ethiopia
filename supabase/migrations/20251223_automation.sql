-- Tournaments Table
CREATE TABLE IF NOT EXISTS tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    prize_pool DECIMAL(12,2) DEFAULT 0,
    entry_fee DECIMAL(12,2) DEFAULT 0,
    status TEXT DEFAULT 'scheduled', -- scheduled, active, completed, cancelled
    config JSONB DEFAULT '{}', -- Custom rules
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scheduled Events (Cron-like)
CREATE TABLE IF NOT EXISTS scheduled_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trigger_at TIMESTAMPTZ NOT NULL,
    action_type TEXT NOT NULL, -- 'start_tournament', 'end_tournament', 'post_winner_card'
    payload JSONB DEFAULT '{}', -- Data needed for the action
    status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
    processed_at TIMESTAMPTZ,
    error_log TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for scheduler
CREATE INDEX idx_scheduled_events_trigger_status ON scheduled_events(trigger_at, status);

-- RLS
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access tournaments" ON tournaments FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
);
CREATE POLICY "Public view active tournaments" ON tournaments FOR SELECT USING (true);

CREATE POLICY "Admins full access scheduled_events" ON scheduled_events FOR ALL USING (
    EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())
);
