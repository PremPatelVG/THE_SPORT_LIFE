-- Add pair_type column to pairs table
-- This distinguishes between tournament pairs, reusable pairs, and temporary pairs

ALTER TABLE pairs 
ADD COLUMN pair_type ENUM('tournament', 'reusable', 'temporary') 
DEFAULT 'tournament' 
AFTER is_tournament_specific;

-- Update existing pairs based on their tournament_id
UPDATE pairs 
SET pair_type = CASE 
  WHEN tournament_id IS NOT NULL THEN 'tournament'
  WHEN is_tournament_specific = FALSE THEN 'reusable'
  ELSE 'temporary'
END;

-- Add comment to explain the column
ALTER TABLE pairs 
MODIFY COLUMN pair_type ENUM('tournament', 'reusable', 'temporary') 
DEFAULT 'tournament' 
COMMENT 'Type of pair: tournament (tournament-specific), reusable (can be reused in multiple matches), temporary (one-time use for standalone match)';
