-- =====================================================
-- FIX BRACKET GENERATION FOREIGN KEY CONSTRAINTS
-- Migration Script
-- =====================================================
-- 
-- ISSUE: tournament_brackets.participant_id has FK to tournament_participants
-- SOLUTION: Remove FK constraint since participant_id now references different tables
--           based on tournament category (tournament_registrations, pairs, or teams)
--
-- =====================================================

USE sports_tournament_db_v3;

-- =====================================================
-- STEP 1: DROP FOREIGN KEY FROM tournament_brackets
-- =====================================================

-- Check if foreign key exists and drop it
SET @fk_exists = 0;
SELECT COUNT(*) INTO @fk_exists 
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'tournament_brackets' 
AND CONSTRAINT_NAME = 'fk_tournament_brackets_participant';

SET @query = IF(@fk_exists > 0,
    "ALTER TABLE tournament_brackets DROP FOREIGN KEY fk_tournament_brackets_participant",
    "SELECT 'Foreign key fk_tournament_brackets_participant does not exist' AS message");
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Also check for the constraint added by ALTER TABLE in schema
SET @fk_exists = 0;
SELECT COUNT(*) INTO @fk_exists 
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'tournament_brackets' 
AND CONSTRAINT_NAME = 'tournament_brackets_ibfk_2';

SET @query = IF(@fk_exists > 0,
    "ALTER TABLE tournament_brackets DROP FOREIGN KEY tournament_brackets_ibfk_2",
    "SELECT 'Foreign key tournament_brackets_ibfk_2 does not exist' AS message");
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- STEP 2: DROP FOREIGN KEY FROM group_participants
-- =====================================================

-- Check if foreign key exists and drop it
SET @fk_exists = 0;
SELECT COUNT(*) INTO @fk_exists 
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'group_participants' 
AND CONSTRAINT_NAME = 'group_participants_ibfk_2';

SET @query = IF(@fk_exists > 0,
    "ALTER TABLE group_participants DROP FOREIGN KEY group_participants_ibfk_2",
    "SELECT 'Foreign key group_participants_ibfk_2 does not exist' AS message");
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- STEP 3: DROP FOREIGN KEY FROM tournament_standings
-- =====================================================

-- Check and drop foreign key from tournament_standings
SET @fk_exists = 0;
SELECT COUNT(*) INTO @fk_exists 
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'tournament_standings' 
AND CONSTRAINT_NAME LIKE '%participant%';

-- Get the actual constraint name
SET @constraint_name = NULL;
SELECT CONSTRAINT_NAME INTO @constraint_name
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'tournament_standings' 
AND CONSTRAINT_NAME LIKE '%participant%'
LIMIT 1;

SET @query = IF(@constraint_name IS NOT NULL,
    CONCAT("ALTER TABLE tournament_standings DROP FOREIGN KEY ", @constraint_name),
    "SELECT 'No participant foreign key found in tournament_standings' AS message");
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- STEP 4: DROP FOREIGN KEY FROM matches (if exists)
-- =====================================================

-- Check for participant1_id foreign key
SET @fk_exists = 0;
SELECT COUNT(*) INTO @fk_exists 
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'matches' 
AND CONSTRAINT_NAME LIKE '%participant1%';

SET @constraint_name = NULL;
SELECT CONSTRAINT_NAME INTO @constraint_name
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'matches' 
AND CONSTRAINT_NAME LIKE '%participant1%'
LIMIT 1;

SET @query = IF(@constraint_name IS NOT NULL,
    CONCAT("ALTER TABLE matches DROP FOREIGN KEY ", @constraint_name),
    "SELECT 'No participant1 foreign key found in matches' AS message");
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check for participant2_id foreign key
SET @fk_exists = 0;
SELECT COUNT(*) INTO @fk_exists 
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'matches' 
AND CONSTRAINT_NAME LIKE '%participant2%';

SET @constraint_name = NULL;
SELECT CONSTRAINT_NAME INTO @constraint_name
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'matches' 
AND CONSTRAINT_NAME LIKE '%participant2%'
LIMIT 1;

SET @query = IF(@constraint_name IS NOT NULL,
    CONCAT("ALTER TABLE matches DROP FOREIGN KEY ", @constraint_name),
    "SELECT 'No participant2 foreign key found in matches' AS message");
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check for winner_participant_id foreign key
SET @fk_exists = 0;
SELECT COUNT(*) INTO @fk_exists 
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'matches' 
AND CONSTRAINT_NAME LIKE '%winner%';

SET @constraint_name = NULL;
SELECT CONSTRAINT_NAME INTO @constraint_name
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'matches' 
AND CONSTRAINT_NAME LIKE '%winner%'
LIMIT 1;

SET @query = IF(@constraint_name IS NOT NULL,
    CONCAT("ALTER TABLE matches DROP FOREIGN KEY ", @constraint_name),
    "SELECT 'No winner foreign key found in matches' AS message");
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- STEP 5: ADD COMMENTS TO DOCUMENT NEW BEHAVIOR
-- =====================================================

-- Add comments to explain the new structure
ALTER TABLE tournament_brackets 
MODIFY COLUMN participant_id INT NULL 
COMMENT 'References tournament_registrations.id (singles), pairs.id (doubles), or teams.id (teams) based on tournament category';

ALTER TABLE group_participants 
MODIFY COLUMN participant_id INT NOT NULL 
COMMENT 'References tournament_registrations.id (singles), pairs.id (doubles), or teams.id (teams) based on tournament category';

ALTER TABLE tournament_standings 
MODIFY COLUMN participant_id INT NOT NULL 
COMMENT 'References tournament_registrations.id (singles), pairs.id (doubles), or teams.id (teams) based on tournament category';

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

-- Show remaining foreign keys on tournament_brackets
SELECT 
    CONSTRAINT_NAME,
    TABLE_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'tournament_brackets'
AND REFERENCED_TABLE_NAME IS NOT NULL;

-- Show remaining foreign keys on matches
SELECT 
    CONSTRAINT_NAME,
    TABLE_NAME,
    COLUMN_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'matches'
AND REFERENCED_TABLE_NAME IS NOT NULL;

SELECT '✅ Foreign key constraints removed successfully!' AS status;
SELECT '⚠️  Note: participant_id fields now reference different tables based on tournament category' AS note;
