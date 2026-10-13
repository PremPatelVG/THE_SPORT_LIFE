-- =====================================================
-- Migration: Add Manual Half Control Event Types
-- Purpose: Add half_1_end, half_2_end, break_start, break_end, half_2_start to match_events.event_type ENUM
-- Date: 2025-12-02
-- =====================================================

USE sports_tournament_db_v3;

-- Add new event types for manual half control
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
  'penalty_kick',
  'half_1_end',      -- NEW: 1st half ended (manual control)
  'half_2_end',      -- NEW: 2nd half ended (manual control)
  'break_start',     -- NEW: Break period started (manual control)
  'break_end',       -- NEW: Break period ended (manual control)
  'half_2_start'     -- NEW: 2nd half started (manual control)
) NOT NULL;

-- Verify the changes
SELECT 'Manual half control event types added successfully' AS status;
SHOW COLUMNS FROM match_events LIKE 'event_type';
