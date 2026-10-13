-- Add team_type column to teams table
-- This distinguishes between tournament teams, reusable teams, and temporary teams

ALTER TABLE teams 
ADD COLUMN team_type ENUM('tournament', 'reusable', 'temporary') 
DEFAULT 'tournament' 
AFTER is_tournament_specific;

-- Update existing teams based on their tournament_id
UPDATE teams 
SET team_type = CASE 
  WHEN tournament_id IS NOT NULL THEN 'tournament'
  WHEN is_tournament_specific = FALSE THEN 'reusable'
  ELSE 'temporary'
END;

-- Add comment to explain the column
ALTER TABLE teams 
MODIFY COLUMN team_type ENUM('tournament', 'reusable', 'temporary') 
DEFAULT 'tournament' 
COMMENT 'Type of team: tournament (tournament-specific), reusable (can be reused in multiple matches), temporary (one-time use for standalone match)';
    