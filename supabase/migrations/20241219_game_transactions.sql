-- Create game_transactions table to track all bets and winnings
CREATE TABLE IF NOT EXISTS game_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
    game_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('bet', 'win')),
    amount DECIMAL(10,2) NOT NULL,
    balance_before DECIMAL(10,2),
    balance_after DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_game_transactions_user_id ON game_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_game_transactions_game_id ON game_transactions(game_id);
CREATE INDEX IF NOT EXISTS idx_game_transactions_created_at ON game_transactions(created_at DESC);

-- Create or update user_game_stats table for tracking wins/losses
CREATE TABLE IF NOT EXISTS user_game_stats (
    user_id BIGINT PRIMARY KEY REFERENCES users(telegram_id) ON DELETE CASCADE,
    games_played INT DEFAULT 0,
    games_won INT DEFAULT 0,
    total_bet DECIMAL(10,2) DEFAULT 0,
    total_winnings DECIMAL(10,2) DEFAULT 0,
    last_game_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to update user stats after game
CREATE OR REPLACE FUNCTION update_user_game_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.type = 'bet' THEN
        INSERT INTO user_game_stats (user_id, games_played, total_bet, last_game_at)
        VALUES (NEW.user_id, 1, NEW.amount, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
            games_played = user_game_stats.games_played + 1,
            total_bet = user_game_stats.total_bet + NEW.amount,
            last_game_at = NOW(),
            updated_at = NOW();
    ELSIF NEW.type = 'win' THEN
        UPDATE user_game_stats
        SET games_won = games_won + 1,
            total_winnings = total_winnings + NEW.amount,
            updated_at = NOW()
        WHERE user_id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update stats
DROP TRIGGER IF EXISTS trigger_update_user_game_stats ON game_transactions;
CREATE TRIGGER trigger_update_user_game_stats
    AFTER INSERT ON game_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_user_game_stats();

-- Grant permissions
GRANT SELECT, INSERT ON game_transactions TO authenticated;
GRANT SELECT ON user_game_stats TO authenticated;

COMMENT ON TABLE game_transactions IS 'Tracks all game bets and winnings for audit trail';
COMMENT ON TABLE user_game_stats IS 'Aggregated statistics for user game performance';
