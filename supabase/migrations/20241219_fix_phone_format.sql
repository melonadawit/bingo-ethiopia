-- Fix phone number format for all users
-- Add '+' prefix to phone numbers that don't have it

UPDATE users
SET phone_number = '+' || phone_number
WHERE phone_number NOT LIKE '+%'
  AND phone_number IS NOT NULL
  AND phone_number != '';

-- Verify the update
SELECT telegram_id, username, phone_number, balance, is_registered
FROM users
WHERE is_registered = true
ORDER BY created_at DESC;
