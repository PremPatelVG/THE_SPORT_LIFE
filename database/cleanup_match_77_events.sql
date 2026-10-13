-- =====================================================
-- Cleanup Script: Delete Match 77 Events
-- Purpose: Remove all events related to match 77
-- Date: 2025-12-08
-- =====================================================

USE sports_tournament_db_v3;

-- Show current events for match 77
SELECT 'Current events for match 77:' AS info;
SELECT id, event_type, participant_side, created_at 
FROM match_events 
WHERE match_id = 77
ORDER BY event_order;

-- Delete all events for match 77
DELETE FROM match_events WHERE match_id = 77;

-- Verify deletion
SELECT 'Events deleted. Remaining events for match 77:' AS info;
SELECT COUNT(*) as remaining_events 
FROM match_events 
WHERE match_id = 77;

-- Also check if match 77 still exists in matches table
SELECT 'Match 77 status in matches table:' AS info;
SELECT id, status, participant1_id, participant2_id 
FROM matches 
WHERE id = 77;

SELECT '✅ Cleanup complete!' AS status;
