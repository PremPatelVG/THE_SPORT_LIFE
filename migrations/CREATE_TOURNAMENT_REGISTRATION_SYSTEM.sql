-- =====================================================
-- TOURNAMENT REGISTRATION & TEAM MANAGEMENT SYSTEM
-- Migration Script
-- =====================================================
-- 
-- CHANGES:
-- 1. Add tournament_type (open/closed) to tournaments
-- 2. Create tournament_registrations table (player invitations/requests)
-- 3. Update teams to be tournament-specific only (remove reusable teams)
-- 4. Add scorer support to matches (match-level assignment)
-- 5. Update team_members to track captain properly
--
-- =====================================================

USE sports_tournament_db_v3;

-- =====================================================
-- STEP 1: UPDATE TOURNAMENTS TABLE
-- =====================================================

-- Add tournament_type column (check if exists first)
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'tournaments' 
AND COLUMN_NAME = 'tournament_type';

SET @query = IF(@col_exists = 0,
    "ALTER TABLE tournaments ADD COLUMN tournament_type ENUM('open', 'closed') DEFAULT 'open' COMMENT 'open: Anyone can request to join, closed: Invitation only' AFTER status",
    "SELECT 'Column tournament_type already exists' AS message");
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add match_config column (already added in previous migration)
-- ALTER TABLE tournaments 
-- ADD COLUMN IF NOT EXISTS match_config JSON COMMENT 'Sport-specific match configuration'
-- AFTER tournament_type;

-- Add logo_url column (already added in previous migration)
-- ALTER TABLE tournaments 
-- ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500) COMMENT 'Tournament logo URL/path'
-- AFTER match_config;

-- Update existing tournaments to 'open' type
UPDATE tournaments 
SET tournament_type = 'open' 
WHERE tournament_type IS NULL;

-- =====================================================
-- STEP 2: CREATE TOURNAMENT_REGISTRATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS tournament_registrations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tournament_id INT NOT NULL,
    user_id INT NOT NULL COMMENT 'Player being registered/invited',
    
    -- Registration Type & Status
    registration_type ENUM('request', 'invitation') NOT NULL COMMENT 'request: Player requested to join (OPEN), invitation: Organizer invited player (CLOSED)',
    status ENUM('pending', 'accepted', 'rejected', 'declined', 'locked') DEFAULT 'pending' COMMENT 'pending: Awaiting response, accepted: Approved by organizer, rejected: Denied by organizer, declined: Player declined invitation, locked: Finalized for tournament',
    
    -- Metadata
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP NULL COMMENT 'When organizer/player responded',
    locked_at TIMESTAMP NULL COMMENT 'When player was locked (finalized)',
    notes TEXT COMMENT 'Organizer notes about the player',
    
    -- Who created this registration
    created_by INT NOT NULL COMMENT 'User who created this registration (organizer for invitations, player for requests)',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Constraints
    UNIQUE KEY unique_tournament_user (tournament_id, user_id) COMMENT 'One registration per user per tournament',
    
    -- Indexes
    INDEX idx_tournament_registrations_tournament (tournament_id),
    INDEX idx_tournament_registrations_user (user_id),
    INDEX idx_tournament_registrations_status (status),
    INDEX idx_tournament_registrations_type (registration_type),
    INDEX idx_tournament_registrations_created_by (created_by)
    
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Manages player registrations and invitations for tournaments';

-- =====================================================
-- STEP 3: UPDATE TEAMS TABLE
-- =====================================================

-- Remove reusable teams functionality
-- Teams are now ONLY tournament-specific

-- Drop the reusability columns if they exist
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'teams' 
AND COLUMN_NAME = 'is_tournament_specific';

SET @query = IF(@col_exists > 0,
    "ALTER TABLE teams DROP COLUMN is_tournament_specific",
    "SELECT 'Column is_tournament_specific does not exist' AS message");
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'teams' 
AND COLUMN_NAME = 'is_public';

SET @query = IF(@col_exists > 0,
    "ALTER TABLE teams DROP COLUMN is_public",
    "SELECT 'Column is_public does not exist' AS message");
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Ensure tournament_id is NOT NULL (all teams must belong to a tournament)
-- Already NOT NULL in schema, just adding comment
ALTER TABLE teams 
MODIFY COLUMN tournament_id INT NOT NULL COMMENT 'Team belongs to this tournament only';

-- Ensure captain_id is NOT NULL (team captain is required)
-- Already NOT NULL in schema, just adding comment
ALTER TABLE teams 
MODIFY COLUMN captain_id INT NOT NULL COMMENT 'Team captain (required)';

-- Add team status (check if exists first)
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'teams' 
AND COLUMN_NAME = 'status';

SET @query = IF(@col_exists = 0,
    "ALTER TABLE teams ADD COLUMN status ENUM('draft', 'confirmed') DEFAULT 'draft' COMMENT 'draft: Being created, confirmed: Finalized' AFTER captain_id",
    "SELECT 'Column status already exists' AS message");
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update existing teams to 'confirmed' status
UPDATE teams 
SET status = 'confirmed' 
WHERE status IS NULL;

-- =====================================================
-- STEP 4: UPDATE TEAM_MEMBERS TABLE
-- =====================================================

-- Add is_captain flag to team_members (check if exists first)
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
-- STEP 5: UPDATE MATCHES TABLE FOR SCORER SUPPORT
-- =====================================================

-- Add scorer_id column (match-level assignment)
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'matches' 
AND COLUMN_NAME = 'scorer_id';

SET @query = IF(@col_exists = 0,
    "ALTER TABLE matches ADD COLUMN scorer_id INT NULL COMMENT 'User assigned as scorer for this match' AFTER referee_id",
    "SELECT 'Column scorer_id already exists' AS message");
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key for scorer (check if exists first)
SET @fk_exists = 0;
SELECT COUNT(*) INTO @fk_exists 
FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'matches' 
AND CONSTRAINT_NAME = 'fk_matches_scorer';

SET @query = IF(@fk_exists = 0,
    "ALTER TABLE matches ADD CONSTRAINT fk_matches_scorer FOREIGN KEY (scorer_id) REFERENCES users(id) ON DELETE SET NULL",
    "SELECT 'Foreign key fk_matches_scorer already exists' AS message");
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index for scorer (check if exists first)
SET @idx_exists = 0;
SELECT COUNT(*) INTO @idx_exists 
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'matches' 
AND INDEX_NAME = 'idx_matches_scorer';

SET @query = IF(@idx_exists = 0,
    "ALTER TABLE matches ADD INDEX idx_matches_scorer (scorer_id)",
    "SELECT 'Index idx_matches_scorer already exists' AS message");
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- STEP 6: DROP OLD TEAM TOURNAMENT REGISTRATIONS TABLE
-- =====================================================

-- This table was for reusable teams, no longer needed
DROP TABLE IF EXISTS team_tournament_registrations;

-- =====================================================
-- STEP 7: DROP OLD TEAM INVITATIONS TABLE
-- =====================================================

-- Team invitations are now handled through tournament_registrations
-- Players are invited to tournaments, not teams
DROP TABLE IF EXISTS team_invitations;

-- =====================================================
-- STEP 8: CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Index on tournament_type for filtering (check if exists first)
SET @idx_exists = 0;
SELECT COUNT(*) INTO @idx_exists 
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'tournaments' 
AND INDEX_NAME = 'idx_tournaments_type';

SET @query = IF(@idx_exists = 0,
    "ALTER TABLE tournaments ADD INDEX idx_tournaments_type (tournament_type)",
    "SELECT 'Index idx_tournaments_type already exists' AS message");
PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Index on team status (check if exists first)
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
-- STEP 9: UPDATE PLAYER_SCHEDULE TABLE
-- =====================================================

-- Add 'scorer' role to player_schedule
ALTER TABLE player_schedule 
MODIFY COLUMN role ENUM('participant', 'referee', 'scorer') NOT NULL 
COMMENT 'participant: Playing in match, referee: Officiating match, scorer: Scoring match';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check tournaments table
SELECT 
    'tournaments' as table_name,
    COUNT(*) as total_records,
    SUM(CASE WHEN tournament_type = 'open' THEN 1 ELSE 0 END) as open_tournaments,
    SUM(CASE WHEN tournament_type = 'closed' THEN 1 ELSE 0 END) as closed_tournaments
FROM tournaments;

-- Check tournament_registrations table
SELECT 
    'tournament_registrations' as table_name,
    COUNT(*) as total_records
FROM tournament_registrations;

-- Check teams table
SELECT 
    'teams' as table_name,
    COUNT(*) as total_records,
    SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) as draft_teams,
    SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_teams
FROM teams;

-- Check team_members with captain info
SELECT 
    'team_members' as table_name,
    COUNT(*) as total_members,
    SUM(CASE WHEN is_captain = TRUE THEN 1 ELSE 0 END) as total_captains
FROM team_members;

-- Show table structure
SHOW CREATE TABLE tournament_registrations;
SHOW CREATE TABLE teams;
SHOW CREATE TABLE team_members;
SHOW CREATE TABLE matches;

SELECT 'Migration completed successfully!' as status;
