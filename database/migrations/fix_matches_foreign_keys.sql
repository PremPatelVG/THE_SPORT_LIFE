-- =====================================================
-- FIX MATCHES TABLE FOREIGN KEY CONSTRAINTS
-- Migration Script
-- =====================================================
-- 
-- ISSUE: matches table has FK to tournament_participants for participant fields
-- SOLUTION: Remove FK constraints since participant_id now references different tables
--           based on tournament category (tournament_registrations, pairs, or teams)
--
-- =====================================================

USE sports_tournament_db_v3;

-- =====================================================
-- STEP 1: DROP FOREIGN KEYS FROM matches TABLE
-- =====================================================

-- Drop participant1_id foreign key
ALTER TABLE matches DROP FOREIGN KEY matches_ibfk_3;

-- Drop participant2_id foreign key
ALTER TABLE matches DROP FOREIGN KEY matches_ibfk_4;

-- Drop winner_participant_id foreign key
ALTER TABLE matches DROP FOREIGN KEY matches_ibfk_8;

-- =====================================================
-- STEP 2: ADD COMMENTS TO DOCUMENT NEW BEHAVIOR
-- =====================================================

ALTER TABLE matches 
MODIFY COLUMN participant1_id INT NULL 
COMMENT 'References tournament_registrations.id (singles), pairs.id (doubles), or teams.id (teams) based on tournament category';

ALTER TABLE matches 
MODIFY COLUMN participant2_id INT NULL 
COMMENT 'References tournament_registrations.id (singles), pairs.id (doubles), or teams.id (teams) based on tournament category';

ALTER TABLE matches 
MODIFY COLUMN winner_participant_id INT NULL 
COMMENT 'References tournament_registrations.id (singles), pairs.id (doubles), or teams.id (teams) based on tournament category';

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Show remaining foreign keys on matches table
SELECT 
    CONSTRAINT_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'matches'
AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY ORDINAL_POSITION;

SELECT '✅ Matches table foreign key constraints fixed successfully!' AS status;
SELECT '⚠️  Note: participant fields now reference different tables based on tournament category' AS note;
