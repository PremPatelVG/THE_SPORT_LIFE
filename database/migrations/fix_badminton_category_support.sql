-- =====================================================
-- FIX BADMINTON CATEGORY SUPPORT
-- Remove Teams category from Badminton (racquet sport)
-- =====================================================

-- Update Badminton to disable Teams category
UPDATE sport_match_configs
SET category_support = JSON_OBJECT(
    'singles', true,
    'doubles', true,
    'teams', false
)
WHERE sport_name = 'Badminton';

-- Verify the change
SELECT 
    sport_name,
    category_support
FROM sport_match_configs
WHERE sport_name IN ('Badminton', 'Tennis', 'Padel', 'Table Tennis', 'Pickleball', 'Squash', 'Football', 'Volleyball');

-- =====================================================
-- SUMMARY OF CATEGORY SUPPORT BY SPORT TYPE
-- =====================================================

-- RACQUET SPORTS (Singles & Doubles only):
-- - Badminton: Singles ✓, Doubles ✓, Teams ✗
-- - Tennis: Singles ✓, Doubles ✓, Teams ✗
-- - Padel: Singles ✓, Doubles ✓, Teams ✗
-- - Table Tennis: Singles ✓, Doubles ✓, Teams ✗
-- - Pickleball: Singles ✓, Doubles ✓, Teams ✗
-- - Squash: Singles ✓, Doubles ✗, Teams ✗

-- TEAM SPORTS (Teams only):
-- - Football: Singles ✗, Doubles ✗, Teams ✓
-- - Volleyball: Singles ✗, Doubles ✗, Teams ✓
