-- =====================================================
-- CREATE match_player_status TABLE
-- =====================================================
-- This table tracks real-time player status during a match
-- Simplified approach: Direct lookup for playing vs substitute players
-- =====================================================

CREATE TABLE IF NOT EXISTS match_player_status (
  id INT PRIMARY KEY AUTO_INCREMENT,
  match_id INT NOT NULL,
  team_id INT NOT NULL,
  user_id INT NOT NULL,
  
  -- Player details (cached for quick access)
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  jersey_number INT,
  position_label VARCHAR(50),
  
  -- Current status
  is_playing BOOLEAN DEFAULT TRUE COMMENT 'TRUE = on field, FALSE = on bench',
  is_starting BOOLEAN DEFAULT TRUE COMMENT 'Was in starting lineup',
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  
  -- Indexes
  INDEX idx_match_team (match_id, team_id),
  INDEX idx_match_playing (match_id, is_playing),
  UNIQUE KEY unique_player_match (match_id, user_id)
  
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verify table creation
SELECT 'match_player_status table created successfully' AS status;
DESCRIBE match_player_status;
