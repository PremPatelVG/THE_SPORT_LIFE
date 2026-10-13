-- =====================================================
-- FIX TEAMS TABLE - ADD STATUS COLUMN
-- =====================================================

USE sports_tournament_db_v3;

-- Check and add status column if not exists
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'teams' 
AND COLUMN_NAME = 'status';

SET @query = IF(@col_exists = 0,
    "ALTER TABLE teams ADD COLUMN status ENUM('draft', 'locked') DEFAULT 'draft' COMMENT 'draft: Being created, locked: Finalized for tournament' AFTER captain_id",
    "SELECT 'Column status already exists' AS message");
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update existing teams without status to 'draft'
UPDATE teams 
SET status = 'draft' 
WHERE status IS NULL;

-- Check and add locked_at column if not exists
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'teams' 
AND COLUMN_NAME = 'locked_at';

SET @query = IF(@col_exists = 0,
    "ALTER TABLE teams ADD COLUMN locked_at TIMESTAMP NULL COMMENT 'When team was locked (finalized)' AFTER status",
    "SELECT 'Column locked_at already exists' AS message");
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verify the changes
SELECT 
    COLUMN_NAME,
    COLUMN_TYPE,
    COLUMN_DEFAULT,
    IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'teams'
AND COLUMN_NAME IN ('status', 'locked_at');

SELECT 'Teams table status column fixed successfully!' AS message;
