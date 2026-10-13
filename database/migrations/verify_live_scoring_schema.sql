-- =====================================================
-- Verification Script for Live Scoring Schema
-- Purpose: Verify all tables and columns are created correctly
-- Date: 2025-11-12
-- =====================================================

USE sportforlife;

SELECT '========================================' AS '';
SELECT 'LIVE SCORING SCHEMA VERIFICATION' AS '';
SELECT '========================================' AS '';
SELECT '' AS '';

-- 1. Check if match_events table exists
SELECT '1. Checking match_events table...' AS '';
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✓ match_events table exists'
        ELSE '✗ match_events table NOT found'
    END AS status
FROM information_schema.tables 
WHERE table_schema = 'sportforlife' 
  AND table_name = 'match_events';

SELECT '' AS '';

-- Show match_events structure
SELECT 'match_events table structure:' AS '';
DESCRIBE match_events;

SELECT '' AS '';
SELECT '========================================' AS '';

-- 2. Check if match_score_details table exists
SELECT '2. Checking match_score_details table...' AS '';
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✓ match_score_details table exists'
        ELSE '✗ match_score_details table NOT found'
    END AS status
FROM information_schema.tables 
WHERE table_schema = 'sportforlife' 
  AND table_name = 'match_score_details';

SELECT '' AS '';

-- Show match_score_details structure
SELECT 'match_score_details table structure:' AS '';
DESCRIBE match_score_details;

SELECT '' AS '';
SELECT '========================================' AS '';

-- 3. Check if matches table has new columns
SELECT '3. Checking matches table new columns...' AS '';

SELECT 
    COLUMN_NAME,
    COLUMN_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'sportforlife' 
  AND TABLE_NAME = 'matches'
  AND COLUMN_NAME IN ('current_set', 'current_game', 'live_score', 'match_timer', 'is_paused', 'pause_reason')
ORDER BY ORDINAL_POSITION;

SELECT '' AS '';
SELECT '========================================' AS '';

-- 4. Check indexes
SELECT '4. Checking indexes...' AS '';

SELECT 
    TABLE_NAME,
    INDEX_NAME,
    GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columns
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_SCHEMA = 'sportforlife'
  AND TABLE_NAME IN ('match_events', 'match_score_details', 'matches')
  AND INDEX_NAME LIKE '%event%' OR INDEX_NAME LIKE '%score_detail%' OR INDEX_NAME LIKE '%current_set%' OR INDEX_NAME LIKE '%paused%'
GROUP BY TABLE_NAME, INDEX_NAME
ORDER BY TABLE_NAME, INDEX_NAME;

SELECT '' AS '';
SELECT '========================================' AS '';

-- 5. Summary
SELECT 'VERIFICATION SUMMARY' AS '';
SELECT '-------------------' AS '';

SELECT 
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'sportforlife' AND table_name = 'match_events') AS match_events_exists,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'sportforlife' AND table_name = 'match_score_details') AS match_score_details_exists,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'sportforlife' AND table_name = 'matches' AND column_name = 'current_set') AS current_set_column_exists,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'sportforlife' AND table_name = 'matches' AND column_name = 'live_score') AS live_score_column_exists;

SELECT '' AS '';
SELECT 'If all values above are 1, the schema is ready!' AS '';
SELECT '========================================' AS '';
