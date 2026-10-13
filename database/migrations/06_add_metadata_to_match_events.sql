-- =====================================================
-- Migration: Add metadata column to match_events
-- Purpose: Store event-specific data (goal type, assist, etc.)
-- Date: 2025-11-13
-- =====================================================

USE sports_tournament_db_v3;

-- Add metadata column to match_events table
ALTER TABLE match_events 
ADD COLUMN metadata JSON DEFAULT NULL COMMENT 'Event-specific data (goal_type, assist_player_id, etc.)' 
AFTER notes;

-- Verify column addition
SELECT 'metadata column added to match_events table' AS status;
DESCRIBE match_events;
