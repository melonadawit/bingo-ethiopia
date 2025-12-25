-- Migration to add Telegram bot fields to existing users table
-- Run this in Supabase SQL Editor

-- Add new columns to users table (only if they don't exist)
DO $$ 
BEGIN
    -- Add phone_number if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='phone_number') THEN
        ALTER TABLE users ADD COLUMN phone_number TEXT;
    END IF;

    -- Add referral_code if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='referral_code') THEN
        ALTER TABLE users ADD COLUMN referral_code TEXT UNIQUE;
    END IF;

    -- Add referred_by if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='referred_by') THEN
        ALTER TABLE users ADD COLUMN referred_by BIGINT;
    END IF;

    -- Add referral_count if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='referral_count') THEN
        ALTER TABLE users ADD COLUMN referral_count INTEGER DEFAULT 0;
    END IF;

    -- Add referral_earnings if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='referral_earnings') THEN
        ALTER TABLE users ADD COLUMN referral_earnings DECIMAL(10,2) DEFAULT 0;
    END IF;

    -- Add last_daily_claim if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='last_daily_claim') THEN
        ALTER TABLE users ADD COLUMN last_daily_claim DATE;
    END IF;

    -- Add daily_streak if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='daily_streak') THEN
        ALTER TABLE users ADD COLUMN daily_streak INTEGER DEFAULT 0;
    END IF;

    -- Add total_daily_earned if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='total_daily_earned') THEN
        ALTER TABLE users ADD COLUMN total_daily_earned DECIMAL(10,2) DEFAULT 0;
    END IF;

    -- Add is_registered if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='is_registered') THEN
        ALTER TABLE users ADD COLUMN is_registered BOOLEAN DEFAULT FALSE;
    END IF;

    -- Add total_deposited if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='total_deposited') THEN
        ALTER TABLE users ADD COLUMN total_deposited DECIMAL(10,2) DEFAULT 0;
    END IF;

    -- Add total_withdrawn if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='users' AND column_name='total_withdrawn') THEN
        ALTER TABLE users ADD COLUMN total_withdrawn DECIMAL(10,2) DEFAULT 0;
    END IF;
END $$;

-- Create payment_requests table if not exists
CREATE TABLE IF NOT EXISTS payment_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id BIGINT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdraw')),
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  payment_method TEXT,
  bank_account_number TEXT,
  screenshot_url TEXT,
  telebirr_phone TEXT,
  reference_code TEXT,
  admin_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  processed_by BIGINT
);

-- Create daily_claims table if not exists
CREATE TABLE IF NOT EXISTS daily_claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id BIGINT NOT NULL,
  claim_date DATE NOT NULL,
  reward_amount DECIMAL(10,2) NOT NULL,
  streak_day INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, claim_date)
);

-- Create referrals table if not exists (drop old one if exists with wrong structure)
DROP TABLE IF EXISTS referrals CASCADE;
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id BIGINT NOT NULL,
  referred_id BIGINT NOT NULL,
  reward_amount DECIMAL(10,2) DEFAULT 10.00,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payment_requests_user_id ON payment_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_payment_requests_created_at ON payment_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_daily_claims_user ON daily_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_claims_date ON daily_claims(claim_date DESC);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON referrals(referred_id);

-- Create helper functions
CREATE OR REPLACE FUNCTION increment_balance(user_telegram_id BIGINT, amount DECIMAL)
RETURNS VOID AS $$
BEGIN
  UPDATE users 
  SET balance = balance + amount,
      total_deposited = total_deposited + amount
  WHERE telegram_id = user_telegram_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_balance(user_telegram_id BIGINT, amount DECIMAL)
RETURNS VOID AS $$
BEGIN
  UPDATE users 
  SET balance = balance - amount,
      total_withdrawn = total_withdrawn + amount
  WHERE telegram_id = user_telegram_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    code := 'BINGO' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    SELECT EXISTS(SELECT 1 FROM users WHERE referral_code = code) INTO exists;
    EXIT WHEN NOT exists;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully!';
  RAISE NOTICE 'Added columns to users table';
  RAISE NOTICE 'Created payment_requests, daily_claims, referrals tables';
  RAISE NOTICE 'Created helper functions';
END $$;
