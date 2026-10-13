-- Migration: Add Standalone Matches Support
-- Date: 2026-01-08
-- Description: Add columns to matches table to support standalone (non-tournament) matches

-- Add columns for standalone matches
ALTER TABLE matches
  ADD COLUMN is_standalone BOOLEAN DEFAULT FALSE COMMENT 'TRUE for standalone matches, FALSE for tournament matches',
  ADD COLUMN sport_id INT NULL COMMENT 'Sport ID for standalone matches (NULL for tournament matches)',
  ADD COLUMN match_config JSON NULL COMMENT 'Match configuration for standalone matches (NULL for tournament matches)',
  ADD COLUMN created_by INT NULL COMMENT 'User who created the standalone match',
  ADD COLUMN category ENUM('singles', 'doubles', 'teams') NULL COMMENT 'Match category for standalone matches';

-- Add indexes for better query performance
ALTER TABLE matches
  ADD INDEX idx_matches_standalone (is_standalone),
  ADD INDEX idx_matches_sport (sport_id),
  ADD INDEX idx_matches_created_by (created_by),
  ADD INDEX idx_matches_category (category);

-- Add foreign key constraints
ALTER TABLE matches
  ADD CONSTRAINT fk_matches_sport FOREIGN KEY (sport_id) REFERENCES sports(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_matches_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- Ensure tournament_id is nullable (should already be, but verify)
ALTER TABLE matches
  MODIFY COLUMN tournament_id INT NULL;

-- Update existing matches to mark as tournament matches
UPDATE matches 
SET is_standalone = FALSE 
WHERE tournament_id IS NOT NULL;

-- Verification query (optional - comment out if not needed)
-- SELECT 
--   COUNT(*) as total_matches,
--   SUM(CASE WHEN is_standalone = TRUE THEN 1 ELSE 0 END) as standalone_matches,
--   SUM(CASE WHEN is_standalone = FALSE THEN 1 ELSE 0 END) as tournament_matches
-- FROM matches;
