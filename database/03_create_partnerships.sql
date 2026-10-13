-- Create partnerships table for doubles tournaments
CREATE TABLE IF NOT EXISTS partnerships (
  id INT PRIMARY KEY AUTO_INCREMENT,
  player1_id INT NOT NULL,
  player2_id INT NOT NULL,
  tournament_id INT NULL,
  name VARCHAR(255) NOT NULL,
  sport_id INT NOT NULL,
  status ENUM('active', 'inactive') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  
  FOREIGN KEY (player1_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (player2_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  FOREIGN KEY (sport_id) REFERENCES sports(id) ON DELETE RESTRICT,
  
  -- Ensure player1 and player2 are different
  CONSTRAINT chk_different_players CHECK (player1_id != player2_id),
  
  -- Unique constraint to prevent duplicate partnerships
  UNIQUE KEY unique_partnership (player1_id, player2_id, tournament_id),
  
  INDEX idx_player1 (player1_id),
  INDEX idx_player2 (player2_id),
  INDEX idx_tournament (tournament_id),
  INDEX idx_sport (sport_id),
  INDEX idx_status (status),
  INDEX idx_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add partnership_id to tournament_participants if not exists
ALTER TABLE tournament_participants 
ADD COLUMN IF NOT EXISTS partnership_id INT NULL AFTER team_id,
ADD FOREIGN KEY IF NOT EXISTS fk_partnership (partnership_id) REFERENCES partnerships(id) ON DELETE CASCADE,
ADD INDEX IF NOT EXISTS idx_partnership (partnership_id);

-- Add comment
ALTER TABLE partnerships COMMENT = 'Stores partnerships for doubles tournaments';
