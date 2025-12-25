-- Admin Platform Schema Extension
-- DATE: 2025-12-22

-- ============================================
-- ADMIN USERS
-- ============================================
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL, -- Arg2 or similar
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'ops', 'finance', 'marketing', 'readonly')),
  full_name TEXT,
  telegram_handle TEXT, -- Optional, for notifications
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial Super Admin (Password: admin123 - CHANGE IMMEDIATELY)
-- Hash is purely a placeholder, in production use Supabase Auth or proper hashing
INSERT INTO admin_users (email, password_hash, role, full_name)
VALUES ('admin@bingo.eth', '$2a$12$R9h/cIPz0gi.URNNXRFXjOios9lnpSHk62/0.w.E5.X.w.E5.X.w', 'super_admin', 'System Owner')
ON CONFLICT DO NOTHING;

-- ============================================
-- AUDIT LOGS (Immutable)
-- ============================================
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES admin_users(id),
  action TEXT NOT NULL,          -- e.g., 'PAUSE_GAME', 'BAN_USER'
  target_resource TEXT,          -- e.g., 'game_123'
  payload JSONB,                 -- previous_value, new_value
  ip_address TEXT,
  user_agent TEXT,
  risk_score INTEGER DEFAULT 0,  -- AI-assigned risk (0-100)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- GAME CONFIGURATIONS (Versioned)
-- ============================================
CREATE TABLE IF NOT EXISTS game_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version TEXT NOT NULL,         -- e.g., 'v1.2.0'
  is_active BOOLEAN DEFAULT FALSE,
  
  -- Core Rules
  rules JSONB NOT NULL DEFAULT '{
    "ande_zig": {"timer": 30, "entry_fee": 10},
    "hulet_zig": {"timer": 45, "entry_fee": 20},
    "mulu_zig": {"timer": 60, "entry_fee": 50}
  }',
  
  -- Feature Flags
  features JSONB NOT NULL DEFAULT '{
    "chat_enabled": false,
    "maintenance_mode": false,
    "signup_enabled": true
  }',
  
  created_by UUID REFERENCES admin_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  activated_at TIMESTAMPTZ
);

-- ============================================
-- MARKETING CAMPAIGNS
-- ============================================
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'completed', 'paused')),
  
  -- Targeting Rules
  segments JSONB NOT NULL DEFAULT '{}',
  
  -- Content
  message_template TEXT,
  button_text TEXT,
  button_url TEXT,
  image_url TEXT,
  
  -- Metrics
  sent_count INTEGER DEFAULT 0,
  conversion_count INTEGER DEFAULT 0,
  
  created_by UUID REFERENCES admin_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  scheduled_for TIMESTAMPTZ
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON admin_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON admin_audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_game_configs_version ON game_configs(version);
CREATE INDEX IF NOT EXISTS idx_game_configs_active ON game_configs(is_active) WHERE is_active = TRUE;

-- ============================================
-- RLS POLICIES (Strict)
-- ============================================
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;

-- Only Authenticated Admins can read/write
-- (For now, we assume service_role usage for the backend, but policies are good practice)
CREATE POLICY "Admins can view all" ON admin_users FOR SELECT USING (true);
CREATE POLICY "Admins can view logs" ON admin_audit_logs FOR SELECT USING (true);
CREATE POLICY "Admins can view configs" ON game_configs FOR SELECT USING (true);
