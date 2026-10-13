-- =====================================================
-- ADD metadata COLUMN TO match_events
-- =====================================================
-- This migration adds a metadata JSON column to store
-- additional event-specific data like substitution details
-- =====================================================

-- Add metadata column
ALTER TABLE match_events 
ADD COLUMN metadata JSON DEFAULT NULL COMMENT 'Additional event-specific data (e.g., player_in_id for substitutions)' 
AFTER notes;

-- Add index for metadata queries
CREATE INDEX idx_events_metadata ON match_events((CAST(metadata->'$.player_in_id' AS UNSIGNED)));

-- Verify
SELECT 'metadata column added to match_events' AS status;
