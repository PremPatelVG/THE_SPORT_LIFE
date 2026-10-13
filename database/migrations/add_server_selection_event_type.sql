-- =====================================================
-- Migration: Add server_selection Event Type
-- Purpose: Add server_selection to match_events.event_type ENUM
-- Date: 2026-07-31
-- =====================================================

USE sports_tournament_db_v3;

-- Add server_selection to event_type ENUM (complete list with all event types)
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
  'half_2_start',
  'break_start',
  'break_end',
  'extra_time_initialized',
  'extra_time_start',
  'extra_time_break_start',
  'extra_time_break_end',
  'extra_time_half_1_start',
  'extra_time_half_1_end',
  'extra_time_half_2_start',
  'extra_time_half_2_end',
  'undo',
  'server_selection'
) NOT NULL;

-- Verify the changes
SELECT 'server_selection event type added successfully' AS status;
SHOW COLUMNS FROM match_events LIKE 'event_type';
