-- Finalized public_tournaments_view V6
-- Ensures tournaments disappear EXACTLY and IMMEDIATELY after end_time.
-- Matches 'is_strictly_active' to the actual current time with a small buffer.
-- This prevents the "FINISHED" button bug due to slight clock drift between client and server.

DROP VIEW IF EXISTS public_tournaments_view CASCADE;

CREATE VIEW public_tournaments_view AS
SELECT 
  t.id,
  t.title,
  'standard'::text as type,
  t.start_time as start_date,
  t.end_time as end_date,
  t.prize_pool,
  t.entry_fee,
  t.status,
  t.description,
  COUNT(tp.user_id) as participant_count,
  -- is_strictly_active is true if current time is within [start_time - 2m, end_time)
  -- AND the status is either 'active', 'scheduled', or 'upcoming'
  (
    t.status IN ('active', 'scheduled', 'upcoming') AND
    NOW() >= (t.start_time - INTERVAL '2 minutes') AND 
    NOW() < t.end_time
  ) as is_strictly_active
FROM tournaments t
LEFT JOIN tournament_participants tp ON t.id = tp.tournament_id
-- We show tournaments that haven't ended yet
WHERE NOW() < t.end_time
GROUP BY t.id, t.title, t.start_time, t.end_time, t.prize_pool, t.entry_fee, t.status, t.description;

GRANT SELECT ON public_tournaments_view TO anon, authenticated;
