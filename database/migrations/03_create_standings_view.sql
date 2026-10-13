-- =====================================================
-- Migration: Create Comprehensive Standings View
-- Purpose: Create a view for easy querying of tournament standings with participant details
-- Date: 2025-12-03
-- Impact: ZERO - Only creates a view, no table changes
-- =====================================================

-- Note: This migration is SAFE to run on production
-- - Creates a VIEW (virtual table) - no data storage
-- - Does not modify any existing tables
-- - Can be dropped anytime without data loss
-- - Makes querying standings much easier

USE sports_tournament_db_v3;

-- Drop view if it exists (safe to re-run migration)
DROP VIEW IF EXISTS v_tournament_standings;

-- Create comprehensive standings view
CREATE VIEW v_tournament_standings AS
SELECT 
  -- Standings fields
  ts.id,
  ts.tournament_id,
  ts.group_id,
  ts.participant_id,
  ts.matches_played,
  ts.matches_won,
  ts.matches_lost,
  ts.matches_drawn,
  ts.points,
  ts.sets_won,
  ts.sets_lost,
  ts.games_won,
  ts.games_lost,
  ts.goals_for,
  ts.goals_against,
  ts.goal_difference,
  ts.clean_sheets,
  ts.avg_goals_for,
  ts.avg_goals_against,
  ts.winning_streak,
  ts.losing_streak,
  ts.form AS last_5_form,
  ts.head_to_head,
  ts.position,
  ts.is_eliminated,
  ts.updated_at,
  
  -- Participant details (name based on type)
  CASE 
    WHEN tp.user_id IS NOT NULL THEN CONCAT(u.first_name, ' ', u.last_name)
    WHEN tp.partnership_id IS NOT NULL THEN p.partnership_name
    WHEN tp.team_id IS NOT NULL THEN tm.name
    ELSE 'Unknown'
  END as participant_name,
  
  -- Participant image/logo
  CASE 
    WHEN tp.user_id IS NOT NULL THEN u.profile_image
    WHEN tp.team_id IS NOT NULL THEN tm.logo
    ELSE NULL
  END as participant_image,
  
  -- Participant type
  CASE 
    WHEN tp.user_id IS NOT NULL THEN 'user'
    WHEN tp.partnership_id IS NOT NULL THEN 'partnership'
    WHEN tp.team_id IS NOT NULL THEN 'team'
    ELSE 'unknown'
  END as participant_type,
  
  -- Calculated fields
  CASE 
    WHEN ts.matches_played > 0 THEN ROUND((ts.matches_won / ts.matches_played) * 100, 2)
    ELSE 0
  END as win_percentage,
  
  CASE 
    WHEN ts.matches_played > 0 THEN ROUND((ts.matches_lost / ts.matches_played) * 100, 2)
    ELSE 0
  END as loss_percentage,
  
  CASE 
    WHEN ts.matches_played > 0 THEN ROUND((ts.matches_drawn / ts.matches_played) * 100, 2)
    ELSE 0
  END as draw_percentage,
  
  -- Points per game
  CASE 
    WHEN ts.matches_played > 0 THEN ROUND(ts.points / ts.matches_played, 2)
    ELSE 0
  END as points_per_game,
  
  -- Group details (if applicable)
  tg.group_name,
  
  -- Tournament details
  t.name as tournament_name,
  t.format_type,
  t.category as tournament_category,
  t.status as tournament_status,
  
  -- Sport details
  s.name as sport_name,
  s.category as sport_category

FROM tournament_standings ts
JOIN tournament_participants tp ON ts.participant_id = tp.id
JOIN tournaments t ON ts.tournament_id = t.id
JOIN sports s ON t.sport_id = s.id
LEFT JOIN users u ON tp.user_id = u.id
LEFT JOIN partnerships p ON tp.partnership_id = p.id
LEFT JOIN teams tm ON tp.team_id = tm.id
LEFT JOIN tournament_groups tg ON ts.group_id = tg.id;

-- Verification: Show view structure
DESCRIBE v_tournament_standings;

-- Test query: Show sample data (if any exists)
SELECT 
  tournament_name,
  participant_name,
  matches_played,
  matches_won,
  points,
  goal_difference,
  position,
  win_percentage
FROM v_tournament_standings
LIMIT 5;

-- Success message
SELECT 'Comprehensive standings view created successfully! ✅' AS status,
       'Use: SELECT * FROM v_tournament_standings WHERE tournament_id = ?' AS usage_example,
       'This view makes querying standings much easier and cleaner.' AS benefit;
