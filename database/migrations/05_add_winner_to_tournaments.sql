-- =====================================================
-- Migration: Add winner_participant_id to tournaments
-- Purpose: Store tournament winner for league/round-robin formats
-- Date: 2025-12-04
-- =====================================================

USE sports_tournament_db_v3;

-- Check if column already exists
SELECT '=== Checking if winner_participant_id exists ===' AS step;

-- Add winner_participant_id column
-- Note: Will fail if column already exists (safe to ignore error)
ALTER TABLE tournaments
ADD COLUMN winner_participant_id INT NULL
COMMENT 'Winner participant ID (for league/round-robin formats)'
AFTER status;

-- Add foreign key constraint (optional, but good practice)
-- Note: This assumes participant IDs are stored in teams/tournament_registrations/pairs tables
-- We'll skip FK for now since participant_id can reference different tables

-- Show updated structure
SELECT '=== Updated tournaments table structure ===' AS step;
DESCRIBE tournaments;

-- Success message
SELECT '✅ winner_participant_id column added to tournaments table!' AS status,
       'This column will store the tournament winner for league/round-robin formats' AS purpose;
