-- =====================================================
-- TEAM & PAIR MANAGEMENT SYSTEM
-- Migration Script for Tournament Team Formation
-- =====================================================
-- 
-- PURPOSE:
-- Enable organizers to create teams/pairs from locked players
-- Support SINGLES, DOUBLES, and TEAMS tournament categories
-- 
-- =====================================================

USE sports_tournament_db_v3;

-- =====================================================
-- STEP 1: ENSURE TEAMS TABLE HAS STATUS COLUMN
-- =====================================================

-- Add status column if not exists (draft/locked)
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

-- =====================================================
-- STEP 2: ENSURE TEAM_MEMBERS HAS IS_CAPTAIN FLAG
-- =====================================================

-- Add is_captain flag if not exists
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'team_members' 
AND COLUMN_NAME = 'is_captain';

SET @query = IF(@col_exists = 0,
    "ALTER TABLE team_members ADD COLUMN is_captain BOOLEAN DEFAULT FALSE COMMENT 'TRUE if this member is the team captain' AFTER user_id",
    "SELECT 'Column is_captain already exists' AS message");
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Sync captain data from teams table to team_members
UPDATE team_members tm
INNER JOIN teams t ON tm.team_id = t.id
SET tm.is_captain = TRUE
WHERE tm.user_id = t.captain_id;

-- =====================================================
-- STEP 3: ADD LOCKED_AT TIMESTAMP TO TEAMS
-- =====================================================

-- Add locked_at timestamp
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

-- =====================================================
-- STEP 4: ENSURE TOURNAMENT_ID IS NOT NULL FOR TEAMS
-- =====================================================

-- For our use case, all teams must belong to a tournament
-- Update any NULL tournament_id teams (shouldn't exist, but safety check)
-- DELETE FROM teams WHERE tournament_id IS NULL;

-- Make tournament_id NOT NULL
ALTER TABLE teams 
MODIFY COLUMN tournament_id INT NOT NULL COMMENT 'Team belongs to this tournament';

-- =====================================================
-- STEP 5: ADD INDEX FOR TEAM STATUS
-- =====================================================

-- Add index for status if not exists
SET @idx_exists = 0;
SELECT COUNT(*) INTO @idx_exists 
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'teams' 
AND INDEX_NAME = 'idx_teams_status';

SET @query = IF(@idx_exists = 0,
    "ALTER TABLE teams ADD INDEX idx_teams_status (status)",
    "SELECT 'Index idx_teams_status already exists' AS message");
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- STEP 6: CREATE PAIRS TABLE (FOR DOUBLES CATEGORY)
-- =====================================================

CREATE TABLE IF NOT EXISTS pairs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tournament_id INT NOT NULL,
    name VARCHAR(255) NOT NULL COMMENT 'Pair name (e.g., "John & Jane")',
    player1_id INT NOT NULL,
    player2_id INT NOT NULL,
    status ENUM('draft', 'locked') DEFAULT 'draft' COMMENT 'draft: Being created, locked: Finalized',
    locked_at TIMESTAMP NULL COMMENT 'When pair was locked',
    created_by INT NOT NULL COMMENT 'Organizer who created the pair',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    FOREIGN KEY (player1_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (player2_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id),
    
    -- Constraints
    UNIQUE KEY unique_pair_tournament (tournament_id, player1_id, player2_id),
    CHECK (player1_id != player2_id),
    
    -- Indexes
    INDEX idx_pairs_tournament (tournament_id),
    INDEX idx_pairs_player1 (player1_id),
    INDEX idx_pairs_player2 (player2_id),
    INDEX idx_pairs_status (status),
    INDEX idx_pairs_created_by (created_by)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Manages player pairs for DOUBLES tournaments';

-- =====================================================
-- STEP 7: ADD HELPER FUNCTIONS/VIEWS
-- =====================================================

-- View to get available (unassigned) locked players for a tournament
CREATE OR REPLACE VIEW v_available_locked_players AS
SELECT 
    tr.id as registration_id,
    tr.tournament_id,
    tr.user_id,
    u.first_name,
    u.last_name,
    u.phone,
    u.email,
    u.profile_image,
    us.skill_level,
    t.category as tournament_category,
    -- Check if player is already in a team
    (SELECT COUNT(*) FROM team_members tm 
     INNER JOIN teams t ON tm.team_id = t.id 
     WHERE tm.user_id = tr.user_id 
     AND t.tournament_id = tr.tournament_id 
     AND t.deleted_at IS NULL) as in_team_count,
    -- Check if player is already in a pair
    (SELECT COUNT(*) FROM pairs p 
     WHERE (p.player1_id = tr.user_id OR p.player2_id = tr.user_id)
     AND p.tournament_id = tr.tournament_id) as in_pair_count
FROM tournament_registrations tr
INNER JOIN users u ON tr.user_id = u.id
INNER JOIN tournaments t ON tr.tournament_id = t.id
LEFT JOIN user_sports us ON us.user_id = u.id AND us.sport_id = t.sport_id
WHERE tr.status = 'locked'
AND u.deleted_at IS NULL
AND t.deleted_at IS NULL;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Show teams table structure
SELECT 
    COLUMN_NAME, 
    COLUMN_TYPE, 
    IS_NULLABLE, 
    COLUMN_DEFAULT, 
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'teams'
ORDER BY ORDINAL_POSITION;

-- Show team_members table structure
SELECT 
    COLUMN_NAME, 
    COLUMN_TYPE, 
    IS_NULLABLE, 
    COLUMN_DEFAULT, 
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'team_members'
ORDER BY ORDINAL_POSITION;

-- Show pairs table structure
SELECT 
    COLUMN_NAME, 
    COLUMN_TYPE, 
    IS_NULLABLE, 
    COLUMN_DEFAULT, 
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'pairs'
ORDER BY ORDINAL_POSITION;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

SELECT 'Team & Pair Management Migration Complete!' as message;
