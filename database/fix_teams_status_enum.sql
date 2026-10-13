-- =====================================================
-- FIX TEAMS STATUS ENUM - Change 'confirmed' to 'locked'
-- =====================================================

USE sports_tournament_db_v3;

-- Modify the ENUM to have 'draft' and 'locked' instead of 'confirmed'
ALTER TABLE teams 
MODIFY COLUMN status ENUM('draft', 'locked') DEFAULT 'draft' 
COMMENT 'draft: Being created, locked: Finalized for tournament';

-- Verify the change
SELECT 
    COLUMN_NAME,
    COLUMN_TYPE,
    COLUMN_DEFAULT,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'teams'
AND COLUMN_NAME = 'status';

SELECT 'Teams status ENUM fixed successfully! Now has: draft, locked' AS message;
