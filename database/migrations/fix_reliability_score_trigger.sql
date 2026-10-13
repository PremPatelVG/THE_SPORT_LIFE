-- Fix reliability_score calculation in trigger
-- This prevents "Out of range value for column 'reliability_score'" error

USE sports_tournament_db_v3;

DELIMITER //

DROP TRIGGER IF EXISTS trg_update_referee_performance //

CREATE TRIGGER trg_update_referee_performance
AFTER UPDATE ON matches
FOR EACH ROW
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.referee_id IS NOT NULL THEN
        INSERT IGNORE INTO referee_performance (referee_id, total_matches_assigned, matches_completed)
        VALUES (NEW.referee_id, 1, 1)
        ON DUPLICATE KEY UPDATE
            matches_completed = matches_completed + 1,
            total_matches_assigned = GREATEST(total_matches_assigned, matches_completed + 1),
            reliability_score = LEAST(100.00, (matches_completed + 1) * 100.0 / GREATEST(total_matches_assigned, matches_completed + 1)),
            last_match_date = NEW.match_date;
    END IF;
END //

DELIMITER ;

-- Fix any existing invalid reliability_score values
UPDATE referee_performance 
SET reliability_score = 100.00 
WHERE reliability_score > 100.00 OR reliability_score < 0.00;

SELECT 'Trigger fixed successfully!' AS status;
