-- =====================================================
-- MATCH SQUADS - Squad Selection & Player Labeling
-- =====================================================
-- This migration adds support for:
-- 1. Selecting which team members are playing in a match
-- 2. Assigning positions/labels to players (e.g., Goalkeeper, Striker)
-- 3. Displaying squad information on match details
-- =====================================================

-- Match Squads Table
-- Stores the selected players for each match with their assigned positions
CREATE TABLE IF NOT EXISTS match_squads (
    id INT PRIMARY KEY AUTO_INCREMENT,
    match_id INT NOT NULL,
    team_id INT NOT NULL,
    user_id INT NOT NULL,
    position_label VARCHAR(50),  -- e.g., "Goalkeeper", "Defender", "Striker", "Setter", "Libero"
    jersey_number INT,
    is_starting BOOLEAN DEFAULT TRUE,  -- Starting lineup vs substitute
    is_captain BOOLEAN DEFAULT FALSE,
    notes TEXT,  -- Additional notes (e.g., "Injured", "Substitute")
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    
    UNIQUE KEY unique_match_squad_player (match_id, team_id, user_id),
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_match_squads_match (match_id),
    INDEX idx_match_squads_team (team_id),
    INDEX idx_match_squads_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sport Position Presets Table
-- Stores predefined position labels for each sport
CREATE TABLE IF NOT EXISTS sport_position_presets (
    id INT PRIMARY KEY AUTO_INCREMENT,
    sport_id INT NOT NULL,
    position_name VARCHAR(50) NOT NULL,
    position_code VARCHAR(20),  -- Short code (e.g., "GK", "DF", "MF", "FW")
    display_order INT DEFAULT 0,  -- Order to display positions
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    UNIQUE KEY unique_sport_position (sport_id, position_name),
    FOREIGN KEY (sport_id) REFERENCES sports(id) ON DELETE CASCADE,
    
    INDEX idx_sport_positions_sport (sport_id),
    INDEX idx_sport_positions_order (sport_id, display_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default position presets for common sports
-- Football positions
INSERT INTO sport_position_presets (sport_id, position_name, position_code, display_order)
SELECT id, 'Goalkeeper', 'GK', 1 FROM sports WHERE name = 'Football'
UNION ALL
SELECT id, 'Defender', 'DF', 2 FROM sports WHERE name = 'Football'
UNION ALL
SELECT id, 'Midfielder', 'MF', 3 FROM sports WHERE name = 'Football'
UNION ALL
SELECT id, 'Forward', 'FW', 4 FROM sports WHERE name = 'Football';

-- Volleyball positions
INSERT INTO sport_position_presets (sport_id, position_name, position_code, display_order)
SELECT id, 'Setter', 'S', 1 FROM sports WHERE name = 'Volleyball'
UNION ALL
SELECT id, 'Outside Hitter', 'OH', 2 FROM sports WHERE name = 'Volleyball'
UNION ALL
SELECT id, 'Middle Blocker', 'MB', 3 FROM sports WHERE name = 'Volleyball'
UNION ALL
SELECT id, 'Opposite Hitter', 'OPP', 4 FROM sports WHERE name = 'Volleyball'
UNION ALL
SELECT id, 'Libero', 'L', 5 FROM sports WHERE name = 'Volleyball';

-- Basketball positions
INSERT INTO sport_position_presets (sport_id, position_name, position_code, display_order)
SELECT id, 'Point Guard', 'PG', 1 FROM sports WHERE name = 'Basketball'
UNION ALL
SELECT id, 'Shooting Guard', 'SG', 2 FROM sports WHERE name = 'Basketball'
UNION ALL
SELECT id, 'Small Forward', 'SF', 3 FROM sports WHERE name = 'Basketball'
UNION ALL
SELECT id, 'Power Forward', 'PF', 4 FROM sports WHERE name = 'Basketball'
UNION ALL
SELECT id, 'Center', 'C', 5 FROM sports WHERE name = 'Basketball';

-- Hockey positions
INSERT INTO sport_position_presets (sport_id, position_name, position_code, display_order)
SELECT id, 'Goalkeeper', 'GK', 1 FROM sports WHERE name = 'Hockey'
UNION ALL
SELECT id, 'Defender', 'DF', 2 FROM sports WHERE name = 'Hockey'
UNION ALL
SELECT id, 'Midfielder', 'MF', 3 FROM sports WHERE name = 'Hockey'
UNION ALL
SELECT id, 'Forward', 'FW', 4 FROM sports WHERE name = 'Hockey';

-- Badminton (Doubles) - minimal positions
INSERT INTO sport_position_presets (sport_id, position_name, position_code, display_order)
SELECT id, 'Player', 'P', 1 FROM sports WHERE name = 'Badminton';

-- Tennis (Doubles) - minimal positions
INSERT INTO sport_position_presets (sport_id, position_name, position_code, display_order)
SELECT id, 'Player', 'P', 1 FROM sports WHERE name = 'Tennis';

-- Table Tennis (Doubles) - minimal positions
INSERT INTO sport_position_presets (sport_id, position_name, position_code, display_order)
SELECT id, 'Player', 'P', 1 FROM sports WHERE name = 'Table Tennis';

-- Squash (Doubles) - minimal positions
INSERT INTO sport_position_presets (sport_id, position_name, position_code, display_order)
SELECT id, 'Player', 'P', 1 FROM sports WHERE name = 'Squash';
