
-- Create the RPC function to efficiently fetch users who need a drip message
-- This function finds users who:
-- 1. Were created BEFORE max_created_at
-- 2. Do NOT have an entry in user_drip_progress for the given step_id
-- 3. Have a valid telegram_id

CREATE OR REPLACE FUNCTION get_users_for_drip(
    max_created_at TIMESTAMPTZ,
    target_step_id TEXT,
    limit_count INT DEFAULT 50
)
RETURNS TABLE (
    id BIGINT,
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
