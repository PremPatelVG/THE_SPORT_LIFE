-- Migration: Update teams table to support reusable teams
-- Date: 2025-10-24
-- Description: Allow teams to be created independently or for specific tournaments

-- Step 1: Add new columns to teams table
ALTER TABLE teams 
ADD COLUMN is_tournament_specific BOOLEAN DEFAULT TRUE NOT NULL COMMENT 'If true, team is for specific tournament only. If false, team can be used across tournaments',
ADD COLUMN sport_id INT NULL COMMENT 'Sport type for non-tournament-specific teams',
ADD COLUMN is_public BOOLEAN DEFAULT FALSE NOT NULL COMMENT 'If true, team is visible to all users for joining';

-- Step 2: Make tournament_id nullable for non-tournament-specific teams
ALTER TABLE teams 
MODIFY COLUMN tournament_id INT NULL;

-- Step 3: Add foreign key for sport_id
ALTER TABLE teams 
ADD CONSTRAINT fk_teams_sport FOREIGN KEY (sport_id) REFERENCES sports(id) ON DELETE SET NULL;

-- Step 4: Add index for sport_id
ALTER TABLE teams 
ADD INDEX idx_teams_sport (sport_id);

-- Step 5: Add index for is_tournament_specific
ALTER TABLE teams 
ADD INDEX idx_teams_tournament_specific (is_tournament_specific);

-- Step 6: Update unique constraint to handle both tournament-specific and reusable teams
-- Drop old constraint
ALTER TABLE teams 
DROP INDEX unique_team_name_tournament;

-- Add new constraint that allows same team name for different tournaments
-- but prevents duplicate names for reusable teams
ALTER TABLE teams
ADD UNIQUE KEY unique_team_name_creator_tournament (name, creator_id, tournament_id);

-- Step 7: Create new table for team tournament registrations
CREATE TABLE IF NOT EXISTS team_tournament_registrations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    team_id INT NOT NULL,
    tournament_id INT NOT NULL,
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status ENUM('pending', 'confirmed', 'rejected', 'withdrawn') DEFAULT 'pending' NOT NULL,
    payment_status ENUM('pending', 'paid', 'refunded', 'waived') DEFAULT 'pending' NOT NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    
    UNIQUE KEY unique_team_tournament_registration (team_id, tournament_id),
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    
    INDEX idx_team_tournament_reg_team (team_id),
    INDEX idx_team_tournament_reg_tournament (tournament_id),
    INDEX idx_team_tournament_reg_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 8: Migrate existing data
-- All existing teams are tournament-specific
UPDATE teams 
SET is_tournament_specific = TRUE,
    sport_id = (SELECT sport_id FROM tournaments WHERE tournaments.id = teams.tournament_id)
WHERE tournament_id IS NOT NULL;

-- Step 9: Create team tournament registrations for existing tournament-specific teams
INSERT INTO team_tournament_registrations (team_id, tournament_id, status, payment_status)
SELECT 
    t.id,
    t.tournament_id,
    'confirmed',
    'waived'
FROM teams t
WHERE t.tournament_id IS NOT NULL
ON DUPLICATE KEY UPDATE status = status;

-- Step 10: Add check constraint
ALTER TABLE teams
ADD CONSTRAINT check_team_tournament_or_sport CHECK (
    (is_tournament_specific = TRUE AND tournament_id IS NOT NULL) OR
    (is_tournament_specific = FALSE AND sport_id IS NOT NULL)
);

-- Step 11: Add comments to columns
ALTER TABLE teams 
MODIFY COLUMN is_tournament_specific BOOLEAN DEFAULT TRUE NOT NULL 
    COMMENT 'TRUE: Team is specific to one tournament. FALSE: Team can participate in multiple tournaments';

ALTER TABLE teams 
MODIFY COLUMN tournament_id INT NULL 
    COMMENT 'Required if is_tournament_specific=TRUE. NULL if is_tournament_specific=FALSE';

ALTER TABLE teams 
MODIFY COLUMN sport_id INT NULL 
    COMMENT 'Required if is_tournament_specific=FALSE. Defines sport type for reusable teams';

-- Verification queries (commented out - for manual testing)
-- SELECT * FROM teams WHERE is_tournament_specific = FALSE;
-- SELECT * FROM teams WHERE is_tournament_specific = TRUE;
-- SELECT * FROM team_tournament_registrations;
