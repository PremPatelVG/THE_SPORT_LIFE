-- =====================================================
-- Fix Player Names with Jersey Numbers Concatenated
-- Purpose: Remove jersey numbers from last_name field
-- Date: 2025-12-08
-- =====================================================

USE sports_tournament_db_v3;

-- Show affected users (last_name ends with a digit)
SELECT 'Users with jersey numbers in last_name:' AS info;
SELECT id, first_name, last_name, email
FROM users
WHERE last_name REGEXP '[0-9]$'
ORDER BY id;

-- Remove trailing digits from last_name
-- This will remove "0" from "Khan0", "Kumar0", "Patil0", etc.
UPDATE users
SET last_name = TRIM(TRAILING '0123456789' FROM last_name)
WHERE last_name REGEXP '[0-9]$';

-- Show fixed users
SELECT 'Fixed users:' AS info;
SELECT id, first_name, last_name, email
FROM users
WHERE id IN (
  SELECT DISTINCT user_id 
  FROM match_squads
)
ORDER BY id;

SELECT '✅ Player names fixed!' AS status;
