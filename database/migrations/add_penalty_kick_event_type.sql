-- =====================================================
-- Migration: Add penalty_kick Event Type
-- Purpose: Add penalty_kick to match_events.event_type ENUM
-- Date: 2025-11-25
-- =====================================================

USE sports_tournament_db_v3;

-- Add penalty_kick to event_type ENUM
ALTER TABLE match_events 
MODIFY COLUMN event_type ENUM(
  'point', 
  'goal', 
  'ace', 
  'fault', 
  'double_fault',
  'timeout', 
  'substitution', 
  'yellow_card', 
  'red_card', 
  'injury', 
  'challenge', 
  'set_won', 
  'game_won',
  'period_end',
  'match_start',
  'match_pause',
  'match_resume',
  'penalty_kick'  -- NEW: For penalty shootout kicks
) NOT NULL;

-- Add metadata column if it doesn't exist (check first to avoid error)
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
                   WHERE TABLE_SCHEMA = 'sports_tournament_db_v3' 
                   AND TABLE_NAME = 'match_events' 
                   AND COLUMN_NAME = 'metadata');

SET @sql = IF(@col_exists = 0, 
              'ALTER TABLE match_events ADD COLUMN metadata JSON DEFAULT NULL COMMENT "Additional event metadata (e.g., penalty kick result)"',
              'SELECT "metadata column already exists" AS message');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verify the changes
SELECT 'penalty_kick event type and metadata column added successfully' AS status;
SHOW COLUMNS FROM match_events LIKE 'event_type';
SHOW COLUMNS FROM match_events LIKE 'metadata';
