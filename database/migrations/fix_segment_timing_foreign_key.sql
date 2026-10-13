/**
 * Fix: Foreign key constraint error in sp_start_segment
 * 
 * ERROR:
 * Cannot add or update a child row: a foreign key constraint fails 
 * (`sports_tournament_db_v3`.`match_timing_events`, 
 * CONSTRAINT `match_timing_events_ibfk_2` FOREIGN KEY (`segment_timing_id`) 
 * REFERENCES `match_segment_timings` (`id`) ON DELETE SET NULL)
 * 
 * ROOT CAUSE:
 * LAST_INSERT_ID() returns 0 when ON DUPLICATE KEY UPDATE is triggered
 * This causes match_timing_events to try to insert with segment_timing_id = 0
 * Which violates the foreign key constraint
 * 
 * SOLUTION:
 * Explicitly retrieve the segment_id after INSERT/UPDATE using SELECT
 * This works for both new inserts and updates
 */

USE sports_tournament_db_v3;

DELIMITER //

-- Drop and recreate the procedure with fix
DROP PROCEDURE IF EXISTS sp_start_segment//

CREATE PROCEDURE sp_start_segment(
  IN p_match_id INT,
  IN p_segment_type VARCHAR(20),
  IN p_segment_number INT
)
BEGIN
  DECLARE v_segment_id INT;
  
  -- Insert or update segment timing
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
  
  -- ✅ FIX: Get the segment_id explicitly (works for both INSERT and UPDATE)
  SELECT id INTO v_segment_id
  FROM match_segment_timings
  WHERE match_id = p_match_id 
    AND segment_type = p_segment_type 
    AND segment_number = p_segment_number
  LIMIT 1;
  
  -- Log event with correct segment_timing_id
  INSERT INTO match_timing_events (
    match_id, 
    segment_timing_id,
    event_type, 
    event_time,
    event_data
  ) VALUES (
    p_match_id,
    v_segment_id,  -- ✅ Use the retrieved segment_id (not LAST_INSERT_ID())
    'segment_start', 
    NOW(),
    JSON_OBJECT('segment_type', p_segment_type, 'segment_number', p_segment_number)
  );
END//

DELIMITER ;

-- Verify the fix
SELECT 'sp_start_segment procedure fixed successfully' AS status;
SELECT 'Foreign key constraint error should now be resolved' AS message;

-- Test query (optional - comment out if not needed)
-- CALL sp_start_segment(77, 'half', 1);
