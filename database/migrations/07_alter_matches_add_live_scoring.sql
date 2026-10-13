-- =====================================================
-- Migration: Alter Matches Table for Live Scoring
-- Purpose: Add columns needed for live match scoring
-- Date: 2025-11-12
-- =====================================================

USE sports_tournament_db_v3;

-- Add new columns to matches table
ALTER TABLE matches 
ADD COLUMN current_set INT DEFAULT 1 COMMENT 'Current set being played',
ADD COLUMN current_game INT DEFAULT NULL COMMENT 'Current game in set (for tennis-like sports)',
ADD COLUMN live_score JSON DEFAULT NULL COMMENT 'Real-time score state as JSON',
ADD COLUMN match_timer VARCHAR(10) DEFAULT NULL COMMENT 'Match timer for timed sports (HH:MM:SS)',
ADD COLUMN is_paused BOOLEAN DEFAULT FALSE COMMENT 'Is match currently paused',
ADD COLUMN pause_reason VARCHAR(255) DEFAULT NULL COMMENT 'Reason for match pause';

-- Add indexes for new columns
ALTER TABLE matches
ADD INDEX idx_matches_current_set (current_set),
ADD INDEX idx_matches_paused (is_paused);

-- Verify changes
SELECT 'matches table altered successfully' AS status;

-- Show the new columns
SELECT 
  COLUMN_NAME, 
  COLUMN_TYPE, 
  IS_NULLABLE, 
  COLUMN_DEFAULT, 
  COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'sportforlife' 
  AND TABLE_NAME = 'matches'
  AND COLUMN_NAME IN ('current_set', 'current_game', 'live_score', 'match_timer', 'is_paused', 'pause_reason')
ORDER BY ORDINAL_POSITION;
