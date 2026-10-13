-- =====================================================
-- Migration: Add Extra Time Event Types
-- Purpose: Add half_3_end, half_4_end, extra_time_start for extra time support
-- Date: 2025-12-03
-- =====================================================

USE sports_tournament_db_v3;

-- Add new event types for extra time
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
  'match_end',
  'penalty_kick',
  'half_1_end',
  'half_2_end',
  'break_start',
  'break_end',
  'half_2_start',
  'half_3_end',                    -- Extra time 1st half ended
  'half_4_end',                    -- Extra time 2nd half ended
  'extra_time_start',              -- Extra time started
  'extra_time_initialized',        -- NEW: Extra time initialized with config
  'extra_time_half_1_start',       -- NEW: Extra time 1st half started
  'extra_time_half_1_end',         -- NEW: Extra time 1st half ended
  'extra_time_break_start',        -- NEW: Extra time break started
  'extra_time_half_2_start',       -- NEW: Extra time 2nd half started
  'extra_time_half_2_end'          -- NEW: Extra time 2nd half ended
) NOT NULL;

-- Verify the changes
SELECT 'Extra time event types added successfully' AS status;
SHOW COLUMNS FROM match_events LIKE 'event_type';
