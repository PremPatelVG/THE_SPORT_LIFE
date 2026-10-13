/**
 * Revert: Remove fixed phase columns (wrong approach)
 * 
 * REASON:
 * Periods are dynamic based on match config, not fixed to 2 halves
 * Should use match_segment_timings table instead (already exists)
 */

USE sports_tournament_db_v3;

-- Remove the incorrectly added columns (one at a time for MySQL compatibility)
ALTER TABLE live_match_state DROP COLUMN first_half_additional_seconds;
ALTER TABLE live_match_state DROP COLUMN break_additional_seconds;
ALTER TABLE live_match_state DROP COLUMN second_half_additional_seconds;

SELECT 'Fixed phase columns removed - will use match_segment_timings instead' AS status;
