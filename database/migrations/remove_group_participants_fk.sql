-- Remove foreign key constraint from group_participants to tournament_participants
-- This allows group_participants.participant_id to reference tournament_registrations, pairs, or teams directly

USE sports_tournament_db_v3;

-- Drop the foreign key constraint
ALTER TABLE group_participants
DROP FOREIGN KEY fk_group_participants_participant;

-- The participant_id column will remain but without FK constraint
-- This allows flexibility to reference different participant types
