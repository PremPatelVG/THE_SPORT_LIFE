-- =====================================================
-- Migration: Add Volleyball Statistics to Standings
-- =====================================================
-- Purpose: Add set-based and point-based statistics for volleyball
-- while maintaining backward compatibility with football
-- =====================================================

USE sports_tournament_db_v3;

-- Add volleyball-specific columns to tournament_standings (if they don't exist)
SET @dbname = DATABASE();
SET @tablename = "tournament_standings";

-- Check and add sets_won column
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'sets_won');
SET @query = IF(@col_exists = 0, 'ALTER TABLE tournament_standings ADD COLUMN sets_won INT DEFAULT 0 COMMENT "Sets won (volleyball)"', 'SELECT "Column sets_won already exists" as status');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add sets_lost column
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'sets_lost');
SET @query = IF(@col_exists = 0, 'ALTER TABLE tournament_standings ADD COLUMN sets_lost INT DEFAULT 0 COMMENT "Sets lost (volleyball)"', 'SELECT "Column sets_lost already exists" as status');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add set_ratio column
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'set_ratio');
SET @query = IF(@col_exists = 0, 'ALTER TABLE tournament_standings ADD COLUMN set_ratio DECIMAL(5,2) DEFAULT 0.00 COMMENT "Set ratio (SW/SL)"', 'SELECT "Column set_ratio already exists" as status');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add points_won column
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'points_won');
SET @query = IF(@col_exists = 0, 'ALTER TABLE tournament_standings ADD COLUMN points_won INT DEFAULT 0 COMMENT "Points won in sets (volleyball)"', 'SELECT "Column points_won already exists" as status');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add points_lost column
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'points_lost');
SET @query = IF(@col_exists = 0, 'ALTER TABLE tournament_standings ADD COLUMN points_lost INT DEFAULT 0 COMMENT "Points lost in sets (volleyball)"', 'SELECT "Column points_lost already exists" as status');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add point_ratio column
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND COLUMN_NAME = 'point_ratio');
SET @query = IF(@col_exists = 0, 'ALTER TABLE tournament_standings ADD COLUMN point_ratio DECIMAL(5,2) DEFAULT 0.00 COMMENT "Point ratio (PW/PL)"', 'SELECT "Column point_ratio already exists" as status');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add indexes for better query performance (check if they exist first)
SET @index_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND INDEX_NAME = 'idx_standings_sets');
SET @query = IF(@index_exists = 0, 'CREATE INDEX idx_standings_sets ON tournament_standings(sets_won, sets_lost)', 'SELECT "Index idx_standings_sets already exists" as status');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tablename AND INDEX_NAME = 'idx_standings_points');
SET @query = IF(@index_exists = 0, 'CREATE INDEX idx_standings_points ON tournament_standings(points_won, points_lost)', 'SELECT "Index idx_standings_points already exists" as status');
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- BACKWARD COMPATIBILITY NOTES:
-- =====================================================
-- 1. All new columns have DEFAULT values (0 or 0.00)
-- 2. Existing football tournaments are NOT affected
-- 3. goals_for, goals_against, goal_difference remain unchanged
-- 4. Football tournaments will continue to use goals columns
-- 5. Volleyball tournaments will use sets/points columns
-- =====================================================

SELECT 'Migration 06: Volleyball stats columns added successfully!' as status;
