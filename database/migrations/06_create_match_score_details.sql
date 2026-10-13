-- =====================================================
-- Migration: Create Match Score Details Table
-- Purpose: Store detailed set-by-set/period-by-period scores
-- Date: 2025-11-12
-- =====================================================

USE sports_tournament_db_v3;

-- Create match_score_details table
CREATE TABLE IF NOT EXISTS match_score_details (
  id INT PRIMARY KEY AUTO_INCREMENT,
  match_id INT NOT NULL,
  
  -- Set/Period Information
  set_number INT NOT NULL COMMENT 'Set number (1, 2, 3...) or Period number for timed sports',
  
  -- Scores for this set/period
  participant1_score INT DEFAULT 0,
  participant2_score INT DEFAULT 0,
  
  -- Set/Period Winner
  winner_participant_id INT DEFAULT NULL,
  
  -- Additional Info
  is_tiebreak BOOLEAN DEFAULT FALSE COMMENT 'Was this set decided by tiebreak',
  duration_minutes INT DEFAULT NULL COMMENT 'How long this set/period took',
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (winner_participant_id) REFERENCES tournament_participants(id) ON DELETE SET NULL,
  
  -- Unique constraint: one record per match per set
  UNIQUE KEY unique_match_set (match_id, set_number),
  
  -- Indexes
  INDEX idx_score_details_match (match_id),
  INDEX idx_score_details_set (set_number)
  
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verify table creation
SELECT 'match_score_details table created successfully' AS status;
DESCRIBE match_score_details;
