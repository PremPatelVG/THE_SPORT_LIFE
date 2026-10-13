-- =====================================================
-- Migration: Create Match Undo Logs Table
-- Purpose: Track undo actions (internal only, not shown to users)
-- Date: 2026-07-21
-- =====================================================

USE sports_tournament_db_v3;

-- Create match_undo_logs table (simplified - internal tracking only)
CREATE TABLE IF NOT EXISTS match_undo_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  match_id INT NOT NULL,
  
  -- Who performed the undo (internal tracking only)
  undone_by_user_id INT DEFAULT NULL COMMENT 'User who performed undo (NULL if user deleted)',
  undone_by_role ENUM('referee', 'admin', 'organizer') NOT NULL,
  
  -- What was undone
  undone_event_id INT DEFAULT NULL COMMENT 'Reference to undone event',
  undone_event_type VARCHAR(50) NOT NULL COMMENT 'Type of event that was undone',
  undone_event_data JSON NOT NULL COMMENT 'Complete event data',
  
  -- Match context at time of undo
  match_status VARCHAR(50) DEFAULT NULL,
  current_set INT DEFAULT NULL,
  current_game INT DEFAULT NULL,
  
  -- Score states (complete snapshots)
  score_before_undo JSON NOT NULL COMMENT 'Live score before undo',
  score_after_undo JSON NOT NULL COMMENT 'Live score after undo',
  
  -- Deuce tracking
  deuce_count_before INT DEFAULT NULL COMMENT 'Deuce count before undo',
  deuce_count_after INT DEFAULT NULL COMMENT 'Deuce count after undo',
  
  -- Special flags
  was_match_end_undo BOOLEAN DEFAULT FALSE COMMENT 'TRUE if undoing match_end',
  was_deuce_causing_point BOOLEAN DEFAULT FALSE COMMENT 'TRUE if undoing deuce point',
  
  -- Additional context
  participant_side ENUM('participant1', 'participant2') DEFAULT NULL,
  player_id INT DEFAULT NULL,
  
  -- Timestamp
  undone_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (undone_by_user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (undone_event_id) REFERENCES match_events(id) ON DELETE SET NULL,
  FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE SET NULL,
  
  -- Indexes
  INDEX idx_undo_logs_match (match_id),
  INDEX idx_undo_logs_user (undone_by_user_id),
  INDEX idx_undo_logs_time (undone_at),
  INDEX idx_undo_logs_match_end (was_match_end_undo)
  
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verify table creation
SELECT 'match_undo_logs table created successfully' AS status;
DESCRIBE match_undo_logs;
