-- Set Tournament Winner
-- Replace tournament_id and winner_participant_id with actual values

-- For your tournament (ID: 92), Group B winner T4 (participant_id: 175)
UPDATE tournaments 
SET winner_participant_id = 175,
    status = 'completed'
WHERE id = 92;

-- Verify
SELECT id, name, status, winner_participant_id 
FROM tournaments 
WHERE id = 92;
