-- =====================================================
-- ENHANCED TOURNAMENT SCHEMA - MIGRATION SCRIPT (FIXED)
-- =====================================================
-- Compatible with MySQL 5.7+ and 8.0+

-- Check and add tournament_type column
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'tournaments' 
AND COLUMN_NAME = 'tournament_type';

SET @query = IF(@col_exists = 0,
    "ALTER TABLE tournaments ADD COLUMN tournament_type ENUM('open', 'closed') DEFAULT 'open' COMMENT 'Open: Anyone can join, Closed: Invitation only'",
    "SELECT 'Column tournament_type already exists' AS message");
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add match_config column
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'tournaments' 
AND COLUMN_NAME = 'match_config';

SET @query = IF(@col_exists = 0,
    "ALTER TABLE tournaments ADD COLUMN match_config JSON COMMENT 'Sport-specific match configuration'",
    "SELECT 'Column match_config already exists' AS message");
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add logo_url column
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'tournaments' 
AND COLUMN_NAME = 'logo_url';

SET @query = IF(@col_exists = 0,
    "ALTER TABLE tournaments ADD COLUMN logo_url VARCHAR(500) COMMENT 'Tournament logo URL/path'",
    "SELECT 'Column logo_url already exists' AS message");
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- SPORT MATCH CONFIGURATION TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS sport_match_configs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sport_id INT NOT NULL,
    sport_name VARCHAR(100) NOT NULL,
    match_structure ENUM('set_based', 'game_based', 'time_based') NOT NULL,
    default_config JSON NOT NULL COMMENT 'Default match configuration for this sport',
    category_support JSON NOT NULL COMMENT 'Supported categories: singles, doubles, teams',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_sport_config (sport_id),
    INDEX idx_sport_name (sport_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- INSERT DEFAULT SPORT CONFIGURATIONS
-- =====================================================

-- Clear existing data if any
DELETE FROM sport_match_configs;

-- 1. BADMINTON
INSERT INTO sport_match_configs (sport_id, sport_name, match_structure, default_config, category_support)
SELECT 
    id,
    'Badminton',
    'set_based',
    JSON_OBJECT(
        'match_structure', 'set_based',
        'sets_to_win', 2,
        'total_sets', 3,
        'points_per_set', 21,
        'win_by_margin', 2,
        'max_points', 30,
        'deuce_enabled', true,
        'estimated_duration', 45
    ),
    JSON_OBJECT(
        'singles', true,
        'doubles', true,
        'teams', true
    )
FROM sports WHERE name = 'Badminton' LIMIT 1
ON DUPLICATE KEY UPDATE sport_name = VALUES(sport_name);

-- 2. FOOTBALL
INSERT INTO sport_match_configs (sport_id, sport_name, match_structure, default_config, category_support)
SELECT 
    id,
    'Football',
    'time_based',
    JSON_OBJECT(
        'match_structure', 'time_based',
        'periods', 2,
        'period_duration', 45,
        'break_duration', 15,
        'extra_time_enabled', false,
        'estimated_duration', 105
    ),
    JSON_OBJECT(
        'singles', false,
        'doubles', false,
        'teams', true
    )
FROM sports WHERE name = 'Football' LIMIT 1
ON DUPLICATE KEY UPDATE sport_name = VALUES(sport_name);

-- 3. PADEL
INSERT INTO sport_match_configs (sport_id, sport_name, match_structure, default_config, category_support)
SELECT 
    id,
    'Padel',
    'set_based',
    JSON_OBJECT(
        'match_structure', 'set_based',
        'sets_to_win', 2,
        'total_sets', 3,
        'games_per_set', 6,
        'tiebreak_enabled', true,
        'tiebreak_at', 6,
        'tiebreak_points', 7,
        'estimated_duration', 90
    ),
    JSON_OBJECT(
        'singles', true,
        'doubles', true,
        'teams', false
    )
FROM sports WHERE name = 'Padel' LIMIT 1
ON DUPLICATE KEY UPDATE sport_name = VALUES(sport_name);

-- 4. PICKLEBALL
INSERT INTO sport_match_configs (sport_id, sport_name, match_structure, default_config, category_support)
SELECT 
    id,
    'Pickleball',
    'game_based',
    JSON_OBJECT(
        'match_structure', 'game_based',
        'games_to_win', 2,
        'total_games', 3,
        'points_per_game', 11,
        'win_by_margin', 2,
        'deuce_enabled', true,
        'estimated_duration', 30
    ),
    JSON_OBJECT(
        'singles', true,
        'doubles', true,
        'teams', false
    )
FROM sports WHERE name = 'Pickleball' LIMIT 1
ON DUPLICATE KEY UPDATE sport_name = VALUES(sport_name);

-- 5. SQUASH
INSERT INTO sport_match_configs (sport_id, sport_name, match_structure, default_config, category_support)
SELECT 
    id,
    'Squash',
    'game_based',
    JSON_OBJECT(
        'match_structure', 'game_based',
        'games_to_win', 3,
        'total_games', 5,
        'points_per_game', 11,
        'win_by_margin', 2,
        'deuce_enabled', true,
        'estimated_duration', 60
    ),
    JSON_OBJECT(
        'singles', true,
        'doubles', false,
        'teams', false
    )
FROM sports WHERE name = 'Squash' LIMIT 1
ON DUPLICATE KEY UPDATE sport_name = VALUES(sport_name);

-- 6. TABLE TENNIS
INSERT INTO sport_match_configs (sport_id, sport_name, match_structure, default_config, category_support)
SELECT 
    id,
    'Table Tennis',
    'game_based',
    JSON_OBJECT(
        'match_structure', 'game_based',
        'games_to_win', 4,
        'total_games', 7,
        'points_per_game', 11,
        'win_by_margin', 2,
        'deuce_enabled', true,
        'estimated_duration', 45
    ),
    JSON_OBJECT(
        'singles', true,
        'doubles', true,
        'teams', false
    )
FROM sports WHERE name = 'Table Tennis' LIMIT 1
ON DUPLICATE KEY UPDATE sport_name = VALUES(sport_name);

-- 7. TENNIS
INSERT INTO sport_match_configs (sport_id, sport_name, match_structure, default_config, category_support)
SELECT 
    id,
    'Tennis',
    'set_based',
    JSON_OBJECT(
        'match_structure', 'set_based',
        'sets_to_win', 2,
        'total_sets', 3,
        'games_per_set', 6,
        'tiebreak_enabled', true,
        'tiebreak_at', 6,
        'tiebreak_points', 7,
        'final_set_tiebreak', 10,
        'estimated_duration', 120
    ),
    JSON_OBJECT(
        'singles', true,
        'doubles', true,
        'teams', false
    )
FROM sports WHERE name = 'Tennis' LIMIT 1
ON DUPLICATE KEY UPDATE sport_name = VALUES(sport_name);

-- 8. VOLLEYBALL
INSERT INTO sport_match_configs (sport_id, sport_name, match_structure, default_config, category_support)
SELECT 
    id,
    'Volleyball',
    'set_based',
    JSON_OBJECT(
        'match_structure', 'set_based',
        'sets_to_win', 3,
        'total_sets', 5,
        'points_per_set', 25,
        'win_by_margin', 2,
        'deuce_enabled', true,
        'estimated_duration', 90
    ),
    JSON_OBJECT(
        'singles', false,
        'doubles', false,
        'teams', true
    )
FROM sports WHERE name = 'Volleyball' LIMIT 1
ON DUPLICATE KEY UPDATE sport_name = VALUES(sport_name);

-- =====================================================
-- UPDATE EXISTING TOURNAMENTS
-- =====================================================

-- Set default tournament_type for existing tournaments
UPDATE tournaments 
SET tournament_type = 'open' 
WHERE tournament_type IS NULL;

-- Update existing tournaments with default match_config
UPDATE tournaments t
INNER JOIN sport_match_configs smc ON t.sport_id = smc.sport_id
SET t.match_config = smc.default_config
WHERE t.match_config IS NULL;

-- =====================================================
-- ADD INDEXES
-- =====================================================

-- Check and add indexes
SET @index_exists = 0;
SELECT COUNT(*) INTO @index_exists 
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'tournaments' 
AND INDEX_NAME = 'idx_tournament_type';

SET @query = IF(@index_exists = 0,
    "ALTER TABLE tournaments ADD INDEX idx_tournament_type (tournament_type)",
    "SELECT 'Index idx_tournament_type already exists' AS message");
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT 'Migration completed successfully!' as status;

-- Show new columns
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    COLUMN_TYPE
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE()
AND TABLE_NAME = 'tournaments' 
AND COLUMN_NAME IN ('tournament_type', 'match_config', 'logo_url');

-- Show sport configurations
SELECT 
    sport_name,
    match_structure,
    JSON_EXTRACT(category_support, '$.singles') as singles,
    JSON_EXTRACT(category_support, '$.doubles') as doubles,
    JSON_EXTRACT(category_support, '$.teams') as teams
FROM sport_match_configs
ORDER BY sport_name;
