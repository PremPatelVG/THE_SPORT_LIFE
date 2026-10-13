-- Fix match participants constraint to allow NULL for pending matches
-- This allows creating placeholder matches for future rounds in knockout tournaments

-- Drop the old constraint
ALTER TABLE matches DROP CONSTRAINT check_match_participants;

-- Add new constraint that allows NULL participants OR requires both to be set and different
ALTER TABLE matches ADD CONSTRAINT check_match_participants CHECK (
    (participant1_id IS NULL AND participant2_id IS NULL) OR
    (participant1_id IS NOT NULL AND participant2_id IS NOT NULL AND participant1_id != participant2_id)
);
