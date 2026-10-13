-- =====================================================
-- Migration: Enhance Match Statistics Table
-- Purpose: Add indexes for better query performance
-- Date: 2025-12-03
-- Impact: ZERO - Only adds indexes, no data changes
-- =====================================================

-- Note: This migration is SAFE to run on production
-- - Only adds indexes for performance
-- - No data modification
-- - Existing queries continue to work
-- - Will make statistics queries faster

USE sports_tournament_db_v3;

-- Step 1: Verify match_statistics table exists
SELECT 
  TABLE_NAME,
  TABLE_ROWS,
  CREATE_TIME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = 'sports_tournament_db_v3' 
  AND TABLE_NAME = 'match_statistics';

-- Step 2: Add performance indexes on commonly queried columns
ALTER TABLE match_statistics
ADD INDEX idx_match_stats_goals (goals),
ADD INDEX idx_match_stats_points_scored (points_scored),
ADD INDEX idx_match_stats_points_conceded (points_conceded),
ADD INDEX idx_match_stats_match_participant (match_id, participant_id);

-- Step 3: Add indexes for sport-specific stats
-- These will be used when filtering/sorting by specific statistics
ALTER TABLE match_statistics
ADD INDEX idx_match_stats_aces (aces),
ADD INDEX idx_match_stats_assists (assists),
ADD INDEX idx_match_stats_blocks (blocks);

-- Verification: Show all indexes on match_statistics table
SELECT 
  INDEX_NAME,
  COLUMN_NAME,
  SEQ_IN_INDEX,
  INDEX_TYPE
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = 'sports_tournament_db_v3' 
  AND TABLE_NAME = 'match_statistics'
ORDER BY INDEX_NAME, SEQ_IN_INDEX;

-- Success message
SELECT 'Match statistics table indexes added successfully! ✅' AS status,
       'Query performance improved for statistics lookups.' AS note,
       'No data modified - only performance enhancement.' AS impact;
