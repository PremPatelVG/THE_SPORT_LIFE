-- Check current tournament config
SELECT 
    id,
    name,
    sport,
    match_config
FROM tournaments
WHERE sport = 'Football'
ORDER BY id DESC
LIMIT 5;

-- Check current in-progress match
SELECT 
    id,
    tournament_id,
    status,
    JSON_EXTRACT(live_score, '$.period_duration') as period_duration,
    JSON_EXTRACT(live_score, '$.break_duration') as break_duration,
    live_score
FROM matches
WHERE status = 'in_progress'
ORDER BY id DESC
LIMIT 1;

-- If you need to update the tournament config (replace TOURNAMENT_ID with actual ID):
-- UPDATE tournaments 
-- SET match_config = JSON_OBJECT(
--     'periods', 2,
--     'period_duration', 1,
--     'break_duration', 2,
--     'match_structure', 'time_based',
--     'estimated_duration', 4,
--     'extra_time_enabled', true
-- )
-- WHERE id = TOURNAMENT_ID;

-- If you need to fix the current match's live_score (replace MATCH_ID with actual ID):
-- UPDATE matches
-- SET live_score = JSON_SET(
--     live_score,
--     '$.period_duration', 1,
--     '$.break_duration', 2
-- )
-- WHERE id = MATCH_ID;
