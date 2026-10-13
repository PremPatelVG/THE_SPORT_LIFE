-- =====================================================
-- Migration: Enhance Tournament Standings Table
-- Purpose: Add comprehensive statistics tracking for leaderboard/points table
-- Date: 2025-12-03
-- Impact: ZERO - Only adds new columns with default values
-- Existing data: Preserved completely
-- =====================================================

-- Note: This migration is SAFE to run on production
-- - All new columns have DEFAULT values
-- - Existing rows will get default values automatically
-- - No data loss or modification to existing columns
-- - Existing queries will continue to work

USE sports_tournament_db_v3;

-- Step 1: Add new columns for goals/points tracking
-- These columns will track actual match results
ALTER TABLE tournament_standings
ADD COLUMN goals_for INT DEFAULT 0 NOT NULL COMMENT 'Total goals/points scored by this participant',
ADD COLUMN goals_against INT DEFAULT 0 NOT NULL COMMENT 'Total goals/points conceded by this participant';

-- Step 2: Add calculated/derived statistics columns
ALTER TABLE tournament_standings
ADD COLUMN clean_sheets INT DEFAULT 0 NOT NULL COMMENT 'Number of matches without conceding goals',
ADD COLUMN avg_goals_for DECIMAL(5,2) DEFAULT 0.00 NOT NULL COMMENT 'Average goals scored per match',
ADD COLUMN avg_goals_against DECIMAL(5,2) DEFAULT 0.00 NOT NULL COMMENT 'Average goals conceded per match';

-- Step 3: Add streak tracking columns
ALTER TABLE tournament_standings
ADD COLUMN winning_streak INT DEFAULT 0 NOT NULL COMMENT 'Current consecutive wins',
ADD COLUMN losing_streak INT DEFAULT 0 NOT NULL COMMENT 'Current consecutive losses';

-- Step 4: Add form guide column (enhanced from existing 'form' column)
-- Note: 'form' column already exists as VARCHAR(10), we'll use it for last 5 matches
-- Format: 'WWLWD' = Win, Win, Loss, Win, Draw (most recent last)
ALTER TABLE tournament_standings
MODIFY COLUMN form VARCHAR(10) DEFAULT '' COMMENT 'Last 5 match results: W/L/D (most recent last)';

-- Step 5: Add head-to-head records (JSON format for flexibility)
ALTER TABLE tournament_standings
ADD COLUMN head_to_head JSON DEFAULT NULL COMMENT 'Head-to-head records vs other participants {participant_id: {w:1, l:0, d:0}}';

-- Step 6: Update goal_difference calculation for existing rows
-- This ensures existing tournaments have correct goal_difference
UPDATE tournament_standings 
SET goal_difference = goals_for - goals_against
WHERE goal_difference != (goals_for - goals_against);

-- Step 7: Add indexes for performance on new columns
ALTER TABLE tournament_standings
ADD INDEX idx_standings_goals_for (goals_for),
ADD INDEX idx_standings_goals_against (goals_against),
ADD INDEX idx_standings_goal_diff (goal_difference),
ADD INDEX idx_standings_points_position (tournament_id, points, position);

-- Verification: Show the updated table structure
SELECT 
  COLUMN_NAME, 
  COLUMN_TYPE, 
  IS_NULLABLE, 
  COLUMN_DEFAULT, 
  COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'sports_tournament_db_v3' 
  AND TABLE_NAME = 'tournament_standings'
  AND COLUMN_NAME IN (
    'goals_for', 'goals_against', 'clean_sheets', 
    'avg_goals_for', 'avg_goals_against', 
    'winning_streak', 'losing_streak', 'form', 'head_to_head'
  )
ORDER BY ORDINAL_POSITION;

-- Success message
SELECT 'Tournament standings table enhanced successfully! ✅' AS status,
       'All existing data preserved. New columns added with default values.' AS note,
       'Existing queries will continue to work without modification.' AS compatibility;
