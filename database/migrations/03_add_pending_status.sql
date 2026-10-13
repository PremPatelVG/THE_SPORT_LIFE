-- =====================================================
-- Migration: Add 'pending' and 'ready' status to matches
-- Date: 2025-10-27
-- Description: Updates match status enum to include 'pending' (default) and 'ready' states
-- =====================================================

-- Step 1: Modify the status enum to include 'pending' and 'ready'
ALTER TABLE matches 
MODIFY COLUMN status ENUM('pending', 'scheduled', 'ready', 'in_progress', 'completed', 'cancelled', 'postponed', 'walkover') 
DEFAULT 'pending' NOT NULL;

-- Step 2: Update existing matches that have 'scheduled' status but no date to 'pending'
UPDATE matches 
SET status = 'pending' 
WHERE status = 'scheduled' 
  AND match_date IS NULL;

-- Step 3: Drop the participant constraint if it exists (allows NULL participants for future rounds)
-- Note: This may fail if constraint doesn't exist, which is fine
ALTER TABLE matches DROP CONSTRAINT IF EXISTS check_match_participants;

-- Verification queries (run these to check the migration)
-- SELECT status, COUNT(*) as count FROM matches GROUP BY status;
-- SELECT COUNT(*) as pending_without_date FROM matches WHERE status = 'pending' AND match_date IS NULL;
-- SELECT COUNT(*) as scheduled_with_date FROM matches WHERE status = 'scheduled' AND match_date IS NOT NULL;
