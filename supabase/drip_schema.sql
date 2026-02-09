
-- Table to track the progress of each user in the drip sequence
CREATE TABLE IF NOT EXISTS user_drip_progress (
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    step_id TEXT NOT NULL,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, step_id)
);

-- Index for faster lookups during cron jobs
CREATE INDEX IF NOT EXISTS idx_drip_progress_user_id ON user_drip_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_drip_progress_step_id ON user_drip_progress(step_id);
