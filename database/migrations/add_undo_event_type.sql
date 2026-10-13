-- =====================================================
-- Migration: Add undo Event Type
-- Purpose: Add undo to match_events.event_type ENUM
-- Date: 2026-07-21
-- =====================================================

USE sports_tournament_db_v3;

-- Add undo to event_type ENUM (includes all existing types from current database)
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
  'half_3_end',
  'half_4_end',
  'extra_time_start',
  'extra_time_initialized',
  'extra_time_half_1_start',
  'extra_time_half_1_end',
  'extra_time_break_start',
  'extra_time_half_2_start',
  'extra_time_half_2_end',
  'undo'
) NOT NULL;

-- Verify the changes
SELECT 'undo event type added successfully' AS status;
SHOW COLUMNS FROM match_events LIKE 'event_type';
