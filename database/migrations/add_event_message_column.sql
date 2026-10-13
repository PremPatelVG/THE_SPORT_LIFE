-- =====================================================
-- Migration: Add event_message column to match_events
-- Purpose: Store pre-generated event messages from backend
-- Date: 2026-07-16
-- =====================================================

USE sports_tournament_db_v3;

-- Add event_message column if it doesn't exist
ALTER TABLE match_events 
ADD COLUMN IF NOT EXISTS event_message TEXT DEFAULT NULL COMMENT 'Pre-generated event message from backend';

-- Add metadata column if it doesn't exist (for storing additional event data)
ALTER TABLE match_events 
ADD COLUMN IF NOT EXISTS metadata JSON DEFAULT NULL COMMENT 'Additional event metadata (excitement, scores, etc.)';

-- Verify columns added
SELECT 'event_message and metadata columns added successfully' AS status;
DESCRIBE match_events;
