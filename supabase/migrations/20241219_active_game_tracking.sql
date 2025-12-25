-- Add active game tracking columns to users table
-- This allows server-side tracking of which users have active games with selected cards

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS active_game_id TEXT,
ADD COLUMN IF NOT EXISTS active_game_mode TEXT,
ADD COLUMN IF NOT EXISTS active_game_updated_at TIMESTAMPTZ;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_active_game ON users(active_game_id) WHERE active_game_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN users.active_game_id IS 'ID of the game where user has selected cards (null if just watching)';
COMMENT ON COLUMN users.active_game_mode IS 'Game mode of the active game';
COMMENT ON COLUMN users.active_game_updated_at IS 'When the active game state was last updated';
