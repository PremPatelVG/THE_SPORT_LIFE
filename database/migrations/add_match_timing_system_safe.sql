-- ============================================
-- Match Timing System Migration (SAFE VERSION)
-- ============================================
-- Only adds missing columns and tables
-- Checks for existence before creating

-- ============================================
-- 1. Add missing timing columns to matches table (if not exist)
-- ============================================

-- Check and add total_duration_seconds
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'sports_tournament_db_v3' 
  AND TABLE_NAME = 'matches' 
  AND COLUMN_NAME = 'total_duration_seconds';

SET @sql = IF(@col_exists = 0, 
  'ALTER TABLE matches ADD COLUMN total_duration_seconds INT NULL COMMENT "Total match duration in seconds"',
  'SELECT "Column total_duration_seconds already exists" AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add total_duration_formatted
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'sports_tournament_db_v3' 
  AND TABLE_NAME = 'matches' 
  AND COLUMN_NAME = 'total_duration_formatted';

SET @sql = IF(@col_exists = 0, 
  'ALTER TABLE matches ADD COLUMN total_duration_formatted VARCHAR(20) NULL COMMENT "Formatted duration (HH:MM:SS)"',
  'SELECT "Column total_duration_formatted already exists" AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- 2. Create match_segment_timings table (if not exists)
-- ============================================
CREATE TABLE IF NOT EXISTS match_segment_timings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  match_id INT NOT NULL,
  segment_type ENUM('set', 'game', 'half', 'period', 'quarter') NOT NULL COMMENT 'Type of segment',
  segment_number INT NOT NULL COMMENT 'Segment number (1, 2, 3, etc.)',
  start_time DATETIME NOT NULL COMMENT 'When segment started',
  end_time DATETIME NULL COMMENT 'When segment ended',
  duration_seconds INT NULL COMMENT 'Segment duration in seconds',
  duration_formatted VARCHAR(20) NULL COMMENT 'Formatted duration (MM:SS)',
  additional_time_seconds INT DEFAULT 0 COMMENT 'Injury/stoppage time in seconds',
  status ENUM('in_progress', 'completed', 'paused', 'cancelled') DEFAULT 'in_progress',
  notes TEXT NULL COMMENT 'Additional notes (e.g., reason for pause)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  INDEX idx_match_segment (match_id, segment_type, segment_number),
  INDEX idx_match_status (match_id, status),
  UNIQUE KEY unique_match_segment (match_id, segment_type, segment_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 3. Create match_timing_events table (if not exists)
-- ============================================
CREATE TABLE IF NOT EXISTS match_timing_events (
  id INT PRIMARY KEY AUTO_INCREMENT,
  match_id INT NOT NULL,
  segment_timing_id INT NULL COMMENT 'Reference to segment if applicable',
  event_type ENUM('match_start', 'match_end', 'segment_start', 'segment_end', 'pause', 'resume', 'injury_time_added') NOT NULL,
  event_time DATETIME NOT NULL,
  event_data JSON NULL COMMENT 'Additional event data',
  created_by INT NULL COMMENT 'User who triggered the event (referee)',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (segment_timing_id) REFERENCES match_segment_timings(id) ON DELETE SET NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_match_event (match_id, event_type),
  INDEX idx_event_time (event_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 4. Add indexes for performance (if not exist)
-- ============================================
-- Check and add index for match timing
SET @index_exists = 0;
SELECT COUNT(*) INTO @index_exists 
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = 'sports_tournament_db_v3' 
  AND TABLE_NAME = 'matches' 
  AND INDEX_NAME = 'idx_match_timing';

SET @sql = IF(@index_exists = 0, 
  'ALTER TABLE matches ADD INDEX idx_match_timing (actual_start_time, actual_end_time)',
  'SELECT "Index idx_match_timing already exists" AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and add index for match duration
SET @index_exists = 0;
SELECT COUNT(*) INTO @index_exists 
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = 'sports_tournament_db_v3' 
  AND TABLE_NAME = 'matches' 
  AND INDEX_NAME = 'idx_match_duration';

SET @sql = IF(@index_exists = 0, 
  'ALTER TABLE matches ADD INDEX idx_match_duration (total_duration_seconds)',
  'SELECT "Index idx_match_duration already exists" AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- 5. Create views for easy querying
-- ============================================

-- View: Match timing summary
CREATE OR REPLACE VIEW v_match_timing_summary AS
SELECT 
  m.id as match_id,
  m.tournament_id,
  m.actual_start_time,
  m.actual_end_time,
  m.total_duration_seconds,
  m.total_duration_formatted,
  COUNT(mst.id) as total_segments,
  SUM(CASE WHEN mst.status = 'completed' THEN 1 ELSE 0 END) as completed_segments,
  SUM(mst.duration_seconds) as total_segment_duration,
  SUM(mst.additional_time_seconds) as total_additional_time,
  MIN(mst.start_time) as first_segment_start,
  MAX(mst.end_time) as last_segment_end
FROM matches m
LEFT JOIN match_segment_timings mst ON m.id = mst.match_id
GROUP BY m.id;

-- View: Segment timing details
CREATE OR REPLACE VIEW v_segment_timing_details AS
SELECT 
  mst.id,
  mst.match_id,
  m.tournament_id,
  t.name as tournament_name,
  s.name as sport_name,
  mst.segment_type,
  mst.segment_number,
  mst.start_time,
  mst.end_time,
  mst.duration_seconds,
  mst.duration_formatted,
  mst.additional_time_seconds,
  mst.status,
  CASE 
    WHEN mst.segment_type = 'set' THEN CONCAT('Set ', mst.segment_number)
    WHEN mst.segment_type = 'game' THEN CONCAT('Game ', mst.segment_number)
    WHEN mst.segment_type = 'half' THEN CONCAT('Half ', mst.segment_number)
    WHEN mst.segment_type = 'period' THEN CONCAT('Period ', mst.segment_number)
    WHEN mst.segment_type = 'quarter' THEN CONCAT('Quarter ', mst.segment_number)
  END as segment_label
FROM match_segment_timings mst
JOIN matches m ON mst.match_id = m.id
JOIN tournaments t ON m.tournament_id = t.id
JOIN sports s ON t.sport_id = s.id;

-- ============================================
-- 6. Create stored procedures
-- ============================================

DELIMITER //

-- Drop procedures if they exist
DROP PROCEDURE IF EXISTS sp_start_match//
DROP PROCEDURE IF EXISTS sp_end_match//
DROP PROCEDURE IF EXISTS sp_start_segment//
DROP PROCEDURE IF EXISTS sp_end_segment//
DROP PROCEDURE IF EXISTS sp_add_injury_time//

-- Procedure: Start a match
CREATE PROCEDURE sp_start_match(
  IN p_match_id INT
)
BEGIN
  UPDATE matches 
  SET 
    actual_start_time = NOW(),
    status = 'in_progress'
  WHERE id = p_match_id;
  
  -- Log event
  INSERT INTO match_timing_events (match_id, event_type, event_time)
  VALUES (p_match_id, 'match_start', NOW());
END//

-- Procedure: End a match
CREATE PROCEDURE sp_end_match(
  IN p_match_id INT
)
BEGIN
  DECLARE v_start_time DATETIME;
  DECLARE v_duration INT;
  
  SELECT actual_start_time INTO v_start_time
  FROM matches WHERE id = p_match_id;
  
  SET v_duration = TIMESTAMPDIFF(SECOND, v_start_time, NOW());
  
  UPDATE matches 
  SET 
    actual_end_time = NOW(),
    total_duration_seconds = v_duration,
    total_duration_formatted = SEC_TO_TIME(v_duration),
    status = 'completed'
  WHERE id = p_match_id;
  
  -- Log event
  INSERT INTO match_timing_events (match_id, event_type, event_time)
  VALUES (p_match_id, 'match_end', NOW());
END//

-- Procedure: Start a segment
CREATE PROCEDURE sp_start_segment(
  IN p_match_id INT,
  IN p_segment_type VARCHAR(20),
  IN p_segment_number INT
)
BEGIN
  INSERT INTO match_segment_timings (
    match_id, 
    segment_type, 
    segment_number, 
    start_time, 
    status
  ) VALUES (
    p_match_id, 
    p_segment_type, 
    p_segment_number, 
    NOW(), 
    'in_progress'
  )
  ON DUPLICATE KEY UPDATE
    start_time = NOW(),
    status = 'in_progress';
  
  -- Log event
  INSERT INTO match_timing_events (
    match_id, 
    segment_timing_id,
    event_type, 
    event_time,
    event_data
  ) VALUES (
    p_match_id,
    LAST_INSERT_ID(),
    'segment_start', 
    NOW(),
    JSON_OBJECT('segment_type', p_segment_type, 'segment_number', p_segment_number)
  );
END//

-- Procedure: End a segment
CREATE PROCEDURE sp_end_segment(
  IN p_match_id INT,
  IN p_segment_type VARCHAR(20),
  IN p_segment_number INT
)
BEGIN
  DECLARE v_start_time DATETIME;
  DECLARE v_duration INT;
  DECLARE v_segment_id INT;
  
  SELECT id, start_time INTO v_segment_id, v_start_time
  FROM match_segment_timings
  WHERE match_id = p_match_id 
    AND segment_type = p_segment_type 
    AND segment_number = p_segment_number;
  
  SET v_duration = TIMESTAMPDIFF(SECOND, v_start_time, NOW());
  
  UPDATE match_segment_timings 
  SET 
    end_time = NOW(),
    duration_seconds = v_duration,
    duration_formatted = SEC_TO_TIME(v_duration),
    status = 'completed'
  WHERE id = v_segment_id;
  
  -- Log event
  INSERT INTO match_timing_events (
    match_id, 
    segment_timing_id,
    event_type, 
    event_time
  ) VALUES (
    p_match_id,
    v_segment_id,
    'segment_end', 
    NOW()
  );
END//

-- Procedure: Add injury time
CREATE PROCEDURE sp_add_injury_time(
  IN p_match_id INT,
  IN p_segment_type VARCHAR(20),
  IN p_segment_number INT,
  IN p_additional_seconds INT
)
BEGIN
  DECLARE v_segment_id INT;
  
  SELECT id INTO v_segment_id
  FROM match_segment_timings
  WHERE match_id = p_match_id 
    AND segment_type = p_segment_type 
    AND segment_number = p_segment_number;
  
  UPDATE match_segment_timings 
  SET additional_time_seconds = p_additional_seconds
  WHERE id = v_segment_id;
  
  -- Log event
  INSERT INTO match_timing_events (
    match_id, 
    segment_timing_id,
    event_type, 
    event_time,
    event_data
  ) VALUES (
    p_match_id,
    v_segment_id,
    'injury_time_added', 
    NOW(),
    JSON_OBJECT('additional_seconds', p_additional_seconds)
  );
END//

DELIMITER ;

-- ============================================
-- Migration Complete!
-- ============================================
SELECT 'Match Timing System migration completed successfully!' AS status;
