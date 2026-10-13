-- =====================================================
-- Migration: Create Match Events Table
-- Purpose: Track all scoring events during live matches
-- Date: 2025-11-12
-- =====================================================

USE sports_tournament_db_v3;

-- Create match_events table
CREATE TABLE IF NOT EXISTS match_events (
  id INT PRIMARY KEY AUTO_INCREMENT,
  match_id INT NOT NULL,
  
  -- Event Details
  event_type ENUM(
    'point', 
    'goal', 
    'ace', 
    'fault', 
    'double_fault',
    'timeout', 
    'substitution', 
    'yellow_card', 
    'red_card', 
    'injury', 
    'challenge', 
    'set_won', 
    'game_won',
    'period_end',
    'match_start',
    'match_pause',
    'match_resume'
  ) NOT NULL,
  
  event_subtype VARCHAR(50) DEFAULT NULL COMMENT 'Additional event classification',
  
  -- Who scored/caused event
  participant_side ENUM('participant1', 'participant2') NOT NULL,
  player_id INT DEFAULT NULL COMMENT 'Specific player in team/doubles matches',
  
  -- Score at time of event (snapshot)
  score_snapshot JSON NOT NULL COMMENT 'Complete score state when event occurred',
  
  -- Set/Game context
  current_set INT DEFAULT 1,
  current_game INT DEFAULT NULL COMMENT 'For sports with games (tennis)',
  
  -- Timing
  match_time VARCHAR(10) DEFAULT NULL COMMENT 'Match time e.g., "12:34" or "Set 2"',
  event_order INT NOT NULL COMMENT 'Sequential order of events in match',
  
  -- Additional Data
  notes TEXT DEFAULT NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES users(id) ON DELETE SET NULL,
  
  -- Indexes
  INDEX idx_events_match (match_id),
  INDEX idx_events_order (match_id, event_order),
  INDEX idx_events_type (event_type),
  INDEX idx_events_created (created_at)
  
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Verify table creation
SELECT 'match_events table created successfully' AS status;
DESCRIBE match_events;
