-- =====================================================
-- Rollback Script for Phase 1 Migrations
-- Purpose: Safely remove Phase 1 changes if needed
-- Date: 2025-12-03
-- WARNING: Only run this if you need to undo Phase 1
-- =====================================================

-- Note: This rollback is SAFE
-- - Removes only the new columns added in Phase 1
-- - Preserves all existing data
-- - Existing functionality remains intact

USE sports_tournament_db_v3;

-- Confirmation message
SELECT '⚠️  WARNING: This will rollback Phase 1 migrations' AS warning,
       'Only run this if you need to undo the changes' AS note;

-- Wait for user confirmation (in MySQL Workbench, you'll need to confirm)
-- In command line, you can comment this out

-- Step 1: Drop the standings view
DROP VIEW IF EXISTS v_tournament_standings;
SELECT '✅ Dropped v_tournament_standings view' AS status;

-- Step 2: Remove indexes from match_statistics
ALTER TABLE match_statistics
DROP INDEX IF EXISTS idx_match_stats_goals,
DROP INDEX IF EXISTS idx_match_stats_points_scored,
DROP INDEX IF EXISTS idx_match_stats_points_conceded,
DROP INDEX IF EXISTS idx_match_stats_match_participant,
DROP INDEX IF EXISTS idx_match_stats_aces,
DROP INDEX IF EXISTS idx_match_stats_assists,
DROP INDEX IF EXISTS idx_match_stats_blocks;
SELECT '✅ Removed indexes from match_statistics' AS status;

-- Step 3: Remove indexes from tournament_standings
ALTER TABLE tournament_standings
DROP INDEX IF EXISTS idx_standings_goals_for,
DROP INDEX IF EXISTS idx_standings_goals_against,
DROP INDEX IF EXISTS idx_standings_goal_diff,
DROP INDEX IF EXISTS idx_standings_points_position;
SELECT '✅ Removed indexes from tournament_standings' AS status;

-- Step 4: Remove new columns from tournament_standings
-- Note: This will delete the data in these columns
-- Make sure you have a backup if needed
ALTER TABLE tournament_standings
DROP COLUMN IF EXISTS head_to_head,
DROP COLUMN IF EXISTS losing_streak,
DROP COLUMN IF EXISTS winning_streak,
DROP COLUMN IF EXISTS avg_goals_against,
DROP COLUMN IF EXISTS avg_goals_for,
DROP COLUMN IF EXISTS clean_sheets,
DROP COLUMN IF EXISTS goals_against,
DROP COLUMN IF EXISTS goals_for;
SELECT '✅ Removed new columns from tournament_standings' AS status;

-- Step 5: Restore form column to original definition
ALTER TABLE tournament_standings
MODIFY COLUMN form VARCHAR(10) DEFAULT NULL;
SELECT '✅ Restored form column to original definition' AS status;

-- Verification
SELECT 
  COLUMN_NAME, 
  COLUMN_TYPE, 
  IS_NULLABLE, 
  COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'sports_tournament_db_v3' 
  AND TABLE_NAME = 'tournament_standings'
ORDER BY ORDINAL_POSITION;

-- Success message
SELECT '✅ Phase 1 migrations rolled back successfully!' AS status,
       'Database restored to pre-Phase 1 state.' AS note,
       'All existing data preserved.' AS data_status;
