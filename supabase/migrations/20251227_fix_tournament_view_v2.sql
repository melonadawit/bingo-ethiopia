-- Re-create public_tournaments_view with strict expiration and visibility
-- Ensures tournaments disappear EXACTLY and IMMEDIATELY after end_time.

DROP VIEW IF EXISTS public_tournaments_view;

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
  -- STRICTLY ACTIVE: status is 'active' AND current time is within [start_time, end_time)
  -- Disappear IMMEDIATELY at end_time
  (
    t.status IN ('active', 'upcoming', 'scheduled') AND 
    NOW() >= t.start_time AND 
    NOW() < t.end_time
  ) as is_strictly_active
FROM tournaments t
LEFT JOIN tournament_participants tp ON t.id = tp.tournament_id
-- We ONLY show tournaments that have NOT reached their end_time yet.
-- This ensures they are removed from the list immediately upon expiration.
WHERE (t.status IN ('upcoming', 'active', 'scheduled')) 
  AND NOW() < t.end_time
GROUP BY t.id, t.title, t.start_time, t.end_time, t.prize_pool, t.entry_fee, t.status, t.description;

GRANT SELECT ON public_tournaments_view TO anon, authenticated;
