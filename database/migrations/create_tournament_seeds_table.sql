-- Create tournament_seeds table for centralized seeding management
CREATE TABLE IF NOT EXISTS tournament_seeds (
  id INT PRIMARY KEY AUTO_INCREMENT,
  tournament_id INT NOT NULL,
  seed_number INT NOT NULL,
  
  -- Participant reference (only one will be filled based on category)
  participant_type ENUM('player', 'pair', 'team') NOT NULL,
  player_registration_id INT NULL COMMENT 'For singles tournaments',
  pair_id INT NULL COMMENT 'For pairs/doubles tournaments',
  team_id INT NULL COMMENT 'For teams tournaments',
  
  -- Metadata
  assigned_by INT NOT NULL COMMENT 'Organizer who assigned the seed',
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT NULL COMMENT 'Optional notes about seed assignment',
  
  -- Indexes
  INDEX idx_tournament (tournament_id),
  INDEX idx_seed_number (tournament_id, seed_number),
  INDEX idx_participant_type (tournament_id, participant_type),
  
  -- Unique constraints
  UNIQUE KEY unique_seed_per_tournament (tournament_id, seed_number),
  
  -- Foreign keys (only for tables that exist)
  FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
  FOREIGN KEY (player_registration_id) REFERENCES tournament_registrations(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_by) REFERENCES users(id)
  
  -- Note: Foreign keys for pair_id and team_id will be added when those tables are created
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
