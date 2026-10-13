-- Manually populate match_player_status for existing in-progress matches
-- Run this ONLY if you have matches that were started before the new system was deployed

-- For match 282 (or change the match_id as needed)
INSERT INTO match_player_status 
  (match_id, team_id, user_id, first_name, last_name, jersey_number, position_label, is_playing, is_starting)
SELECT 
  ms.match_id,
  ms.team_id,
  ms.user_id,
  u.first_name,
  u.last_name,
  ms.jersey_number,
  ms.position_label,
  ms.is_playing AS is_playing,  -- Use current is_playing from match_squads
  ms.is_starting
FROM match_squads ms
JOIN users u ON ms.user_id = u.id
WHERE ms.match_id = 282  -- Change this to your match ID
ON DUPLICATE KEY UPDATE
  is_playing = VALUES(is_playing),
  updated_at = NOW();

-- Verify the data
SELECT 
  mps.match_id,
  mps.team_id,
  mps.user_id,
  CONCAT(mps.first_name, ' ', mps.last_name) as player_name,
  mps.jersey_number,
  mps.position_label,
  mps.is_playing,
  mps.is_starting
FROM match_player_status mps
WHERE mps.match_id = 282
ORDER BY mps.team_id, mps.is_playing DESC, mps.is_starting DESC;
