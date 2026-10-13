/**
 * Add phase-specific additional time columns to live_match_state
 * 
 * PURPOSE:
 * Track additional time separately for each phase (1st half, break, 2nd half)
 * This allows referee to add time to the CURRENT phase, extending its duration
 * 
 * EXAMPLE:
 * - 1st half: 1 minute (60s)
 * - At 45 seconds, referee adds 1 minute
 * - first_half_additional_seconds = 60
 * - 1st half now runs until: 60s + 60s = 120s (2 minutes total)
 */

USE sports_tournament_db_v3;

-- Add phase-specific additional time columns (ignore if already exists)
SET @sql1 = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = 'sports_tournament_db_v3' 
   AND TABLE_NAME = 'live_match_state' 
   AND COLUMN_NAME = 'first_half_additional_seconds') = 0,
  'ALTER TABLE live_match_state ADD COLUMN first_half_additional_seconds INT DEFAULT 0 COMMENT "Additional time added to first half"',
  'SELECT "Column first_half_additional_seconds already exists" AS info'
);
PREPARE stmt1 FROM @sql1;
EXECUTE stmt1;
DEALLOCATE PREPARE stmt1;

SET @sql2 = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = 'sports_tournament_db_v3' 
   AND TABLE_NAME = 'live_match_state' 
   AND COLUMN_NAME = 'break_additional_seconds') = 0,
  'ALTER TABLE live_match_state ADD COLUMN break_additional_seconds INT DEFAULT 0 COMMENT "Additional time added to break"',
  'SELECT "Column break_additional_seconds already exists" AS info'
);
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

SET @sql3 = IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = 'sports_tournament_db_v3' 
   AND TABLE_NAME = 'live_match_state' 
   AND COLUMN_NAME = 'second_half_additional_seconds') = 0,
  'ALTER TABLE live_match_state ADD COLUMN second_half_additional_seconds INT DEFAULT 0 COMMENT "Additional time added to second half"',
  'SELECT "Column second_half_additional_seconds already exists" AS info'
);
PREPARE stmt3 FROM @sql3;
EXECUTE stmt3;
DEALLOCATE PREPARE stmt3;

-- Update existing records to have 0 as default
UPDATE live_match_state 
SET first_half_additional_seconds = COALESCE(first_half_additional_seconds, 0),
    break_additional_seconds = COALESCE(break_additional_seconds, 0),
    second_half_additional_seconds = COALESCE(second_half_additional_seconds, 0);

SELECT 'Phase-specific additional time columns added successfully' AS status;
