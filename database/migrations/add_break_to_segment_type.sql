/**
 * Add 'break' to segment_type ENUM
 * 
 * PURPOSE:
 * Allow tracking additional time for break periods
 * Currently only supports: set, game, half, period, quarter
 * Need to add: break
 */

USE sports_tournament_db_v3;

-- Add 'break' to segment_type ENUM
ALTER TABLE match_segment_timings 
MODIFY COLUMN segment_type ENUM('set','game','half','period','quarter','break') NOT NULL;

SELECT 'Break added to segment_type ENUM successfully' AS status;
