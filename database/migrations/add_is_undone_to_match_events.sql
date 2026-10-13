-- =====================================================
-- Migration: Add is_undone flag to match_events
-- Purpose: Mark events as undone instead of deleting them
-- Date: 2026-07-21
-- =====================================================

USE sports_tournament_db_v3;

-- Add is_undone column to match_events
ALTER TABLE match_events 
ADD COLUMN IF NOT EXISTS is_undone BOOLEAN DEFAULT FALSE COMMENT 'TRUE if event was undone';

-- Add index for filtering
CREATE INDEX IF NOT EXISTS idx_events_undone ON match_events(is_undone);

-- Verify column addition
SELECT 'is_undone column added to match_events table' AS status;
DESCRIBE match_events;
