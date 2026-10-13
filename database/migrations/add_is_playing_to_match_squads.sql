-- =====================================================
-- ADD is_playing FIELD TO match_squads
-- =====================================================
-- This migration adds a field to track which players are currently playing
-- vs on the bench (different from is_starting which is initial lineup)
-- =====================================================

-- Add is_playing column to track current playing status
ALTER TABLE match_squads 
ADD COLUMN is_playing BOOLEAN DEFAULT TRUE AFTER is_starting;

-- Set is_playing to match is_starting for existing records
UPDATE match_squads 
SET is_playing = is_starting;

-- Add index for quick filtering of playing players
CREATE INDEX idx_match_squads_playing ON match_squads(match_id, team_id, is_playing);

-- Add comment
ALTER TABLE match_squads 
MODIFY COLUMN is_playing BOOLEAN DEFAULT TRUE COMMENT 'Current playing status - changes during match via substitutions';

ALTER TABLE match_squads 
MODIFY COLUMN is_starting BOOLEAN DEFAULT TRUE COMMENT 'Initial starting lineup - does not change during match';
