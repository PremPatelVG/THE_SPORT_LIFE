-- =====================================================
-- ENHANCED TOURNAMENT SCHEMA - MIGRATION SCRIPT
-- =====================================================
-- This script adds new fields for enhanced tournament creation
-- Run this on your existing database

-- Add new fields to tournaments table
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS tournament_type ENUM('open', 'closed') DEFAULT 'open' COMMENT 'Open: Anyone can join, Closed: Invitation only',
ADD COLUMN IF NOT EXISTS match_config JSON COMMENT 'Sport-specific match configuration',
ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500) COMMENT 'Tournament logo URL/path';

-- Update existing logo column comment
ALTER TABLE tournaments 
MODIFY COLUMN logo VARCHAR(500) COMMENT 'Deprecated: Use logo_url instead';

-- Add index for tournament_type
ALTER TABLE tournaments 
ADD INDEX idx_tournament_type (tournament_type);

-- =====================================================
-- SPORT MATCH CONFIGURATION DEFAULTS
-- =====================================================

-- Create a table to store default sport configurations
CREATE TABLE IF NOT EXISTS sport_match_configs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sport_id INT NOT NULL,
    sport_name VARCHAR(100) NOT NULL,
    match_structure ENUM('set_based', 'game_based', 'time_based') NOT NULL,
    default_config JSON NOT NULL COMMENT 'Default match configuration for this sport',
    category_support JSON NOT NULL COMMENT 'Supported categories: singles, doubles, teams',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (sport_id) REFERENCES sports(id) ON DELETE CASCADE,
    UNIQUE KEY unique_sport_config (sport_id),
    INDEX idx_sport_name (sport_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- INSERT DEFAULT SPORT CONFIGURATIONS
-- =====================================================

-- Clear existing data if any
TRUNCATE TABLE sport_match_configs;

-- 1. BADMINTON (Racquet Sport - Set Based)
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
FROM sports WHERE name = 'Badminton' LIMIT 1;

-- 2. FOOTBALL (Team Sport - Time Based)
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
        'extra_time_periods', 2,
        'extra_time_duration', 15,
        'penalty_shootout', false,
        'estimated_duration', 105
    ),
    JSON_OBJECT(
        'singles', false,
        'doubles', false,
        'teams', true
    )
FROM sports WHERE name = 'Football' LIMIT 1;

-- 3. PADEL (Racquet Sport - Set Based with Games)
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
        'tiebreak_at', 6,
        'tiebreak_points', 7,
        'scoring_system', 'tennis',
        'deuce_enabled', true,
        'estimated_duration', 90
    ),
    JSON_OBJECT(
        'singles', true,
        'doubles', true,
        'teams', false
    )
FROM sports WHERE name = 'Padel' LIMIT 1;

-- 4. PICKLEBALL (Racquet Sport - Game Based)
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
FROM sports WHERE name = 'Pickleball' LIMIT 1;

-- 5. SQUASH (Racquet Sport - Game Based)
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
FROM sports WHERE name = 'Squash' LIMIT 1;

-- 6. TABLE TENNIS (Racquet Sport - Game Based)
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
FROM sports WHERE name = 'Table Tennis' LIMIT 1;

-- 7. TENNIS (Racquet Sport - Set Based with Games)
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
        'tiebreak_at', 6,
        'tiebreak_points', 7,
        'final_set_tiebreak', 10,
        'scoring_system', 'tennis',
        'deuce_enabled', true,
        'estimated_duration', 120
    ),
    JSON_OBJECT(
        'singles', true,
        'doubles', true,
        'teams', false
    )
FROM sports WHERE name = 'Tennis' LIMIT 1;

-- 8. VOLLEYBALL (Team Sport - Set Based)
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
        'deciding_set_points', 15,
        'win_by_margin', 2,
        'deuce_enabled', true,
        'no_max_points', true,
        'estimated_duration', 90
    ),
    JSON_OBJECT(
        'singles', false,
        'doubles', false,
        'teams', true
    )
FROM sports WHERE name = 'Volleyball' LIMIT 1;

-- =====================================================
-- UPDATE EXISTING TOURNAMENTS WITH DEFAULT CONFIG
-- =====================================================

-- Update existing tournaments to have match_config based on their sport
UPDATE tournaments t
INNER JOIN sport_match_configs smc ON t.sport_id = smc.sport_id
SET t.match_config = smc.default_config
WHERE t.match_config IS NULL;

-- Set default tournament_type for existing tournaments
UPDATE tournaments 
SET tournament_type = 'open' 
WHERE tournament_type IS NULL;

-- =====================================================
-- VALIDATION FUNCTIONS (Optional - for MySQL 8.0+)
-- =====================================================

-- Note: These are example validation checks
-- Implement in application layer for better compatibility

-- Example: Validate match_config structure
DELIMITER $$

CREATE FUNCTION IF NOT EXISTS validate_match_config(
    config JSON,
    structure VARCHAR(20)
) RETURNS BOOLEAN
DETERMINISTIC
BEGIN
    DECLARE is_valid BOOLEAN DEFAULT FALSE;
    
    -- Check if required fields exist based on structure
    IF structure = 'set_based' THEN
        SET is_valid = (
            JSON_EXTRACT(config, '$.sets_to_win') IS NOT NULL AND
            JSON_EXTRACT(config, '$.total_sets') IS NOT NULL
        );
    ELSEIF structure = 'game_based' THEN
        SET is_valid = (
            JSON_EXTRACT(config, '$.games_to_win') IS NOT NULL AND
            JSON_EXTRACT(config, '$.total_games') IS NOT NULL
        );
    ELSEIF structure = 'time_based' THEN
        SET is_valid = (
            JSON_EXTRACT(config, '$.periods') IS NOT NULL AND
            JSON_EXTRACT(config, '$.period_duration') IS NOT NULL
        );
    END IF;
    
    RETURN is_valid;
END$$

DELIMITER ;

-- =====================================================
-- VIEWS FOR EASY QUERYING
-- =====================================================

-- View: Tournaments with sport configuration
CREATE OR REPLACE VIEW v_tournaments_with_config AS
SELECT 
    t.*,
    s.name as sport_name,
    s.category as sport_category,
    smc.match_structure,
    smc.default_config as sport_default_config,
    smc.category_support,
    v.name as venue_name,
    v.city as venue_city,
    CONCAT(u.first_name, ' ', u.last_name) as organizer_name,
    u.email as organizer_email
FROM tournaments t
LEFT JOIN sports s ON t.sport_id = s.id
LEFT JOIN sport_match_configs smc ON t.sport_id = smc.sport_id
LEFT JOIN venues v ON t.venue_id = v.id
LEFT JOIN users u ON t.organizer_id = u.id
WHERE t.deleted_at IS NULL;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Add composite indexes for common queries
ALTER TABLE tournaments 
ADD INDEX idx_sport_category_status (sport_id, category, status),
ADD INDEX idx_tournament_dates_status (start_date, end_date, status),
ADD INDEX idx_tournament_type_status (tournament_type, status);

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

ALTER TABLE tournaments 
MODIFY COLUMN tournament_type ENUM('open', 'closed') DEFAULT 'open' 
COMMENT 'Open: Public registration, Closed: Invitation/approval required';

ALTER TABLE tournaments 
MODIFY COLUMN match_config JSON 
COMMENT 'Sport-specific match rules: sets, games, points, duration, etc.';

-- =====================================================
-- ROLLBACK SCRIPT (Keep for reference)
-- =====================================================

/*
-- To rollback these changes:

-- Remove new columns
ALTER TABLE tournaments 
DROP COLUMN IF EXISTS tournament_type,
DROP COLUMN IF EXISTS match_config,
DROP COLUMN IF EXISTS logo_url;

-- Drop new table
DROP TABLE IF EXISTS sport_match_configs;

-- Drop view
DROP VIEW IF EXISTS v_tournaments_with_config;

-- Drop function
DROP FUNCTION IF EXISTS validate_match_config;

-- Remove indexes
ALTER TABLE tournaments 
DROP INDEX IF EXISTS idx_tournament_type,
DROP INDEX IF EXISTS idx_sport_category_status,
DROP INDEX IF EXISTS idx_tournament_dates_status,
DROP INDEX IF EXISTS idx_tournament_type_status;
*/

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if migration was successful
SELECT 'Migration completed successfully!' as status;

-- Verify new columns exist
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    COLUMN_TYPE,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'tournaments' 
AND COLUMN_NAME IN ('tournament_type', 'match_config', 'logo_url');

-- Verify sport configurations
SELECT 
    sport_name,
    match_structure,
    JSON_EXTRACT(default_config, '$.estimated_duration') as duration,
    JSON_EXTRACT(category_support, '$.singles') as supports_singles,
    JSON_EXTRACT(category_support, '$.doubles') as supports_doubles,
    JSON_EXTRACT(category_support, '$.teams') as supports_teams
FROM sport_match_configs;

-- Count tournaments by type
SELECT 
    tournament_type,
    COUNT(*) as count
FROM tournaments
WHERE deleted_at IS NULL
GROUP BY tournament_type;
