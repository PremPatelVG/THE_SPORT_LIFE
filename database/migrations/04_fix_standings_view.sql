-- =====================================================
-- Migration: Fix Tournament Standings View
-- Purpose: Handle different participant types (teams, pairs, singles)
-- Date: 2025-12-04
-- =====================================================

USE sports_tournament_db_v3;

-- Drop old view
DROP VIEW IF EXISTS v_tournament_standings;

-- Create new comprehensive standings view
-- Handles: teams (category='teams'), doubles (category='doubles'), singles (category='singles')
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
  
  -- Participant name (based on tournament category)
  CASE 
    WHEN t.category = 'teams' THEN tm.name
    WHEN t.category = 'doubles' THEN CONCAT(
      COALESCE(u1.first_name, ''), ' ', COALESCE(u1.last_name, ''),
      ' & ',
      COALESCE(u2.first_name, ''), ' ', COALESCE(u2.last_name, '')
    )
    WHEN t.category = 'singles' THEN CONCAT(u.first_name, ' ', u.last_name)
    ELSE 'Unknown'
  END as participant_name,
  
  -- Participant image/logo
  CASE 
    WHEN t.category = 'teams' THEN tm.logo
    WHEN t.category = 'singles' THEN u.profile_image
    ELSE NULL
  END as participant_image,
  
  -- Participant type
  t.category as participant_type,
  
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
JOIN tournaments t ON ts.tournament_id = t.id
JOIN sports s ON t.sport_id = s.id

-- LEFT JOIN for TEAMS (when category = 'teams')
LEFT JOIN teams tm ON t.category = 'teams' AND ts.participant_id = tm.id

-- LEFT JOIN for DOUBLES/PAIRS (when category = 'doubles')
LEFT JOIN pairs pr ON t.category = 'doubles' AND ts.participant_id = pr.id
LEFT JOIN users u1 ON pr.player1_id = u1.id
LEFT JOIN users u2 ON pr.player2_id = u2.id

-- LEFT JOIN for SINGLES (when category = 'singles')
LEFT JOIN tournament_registrations tr ON t.category = 'singles' AND ts.participant_id = tr.id
LEFT JOIN users u ON tr.user_id = u.id

-- LEFT JOIN for groups
LEFT JOIN tournament_groups tg ON ts.group_id = tg.id;

-- Verification: Show view structure
DESCRIBE v_tournament_standings;

-- Test query: Show sample data
SELECT 
  tournament_name,
  tournament_category,
  participant_name,
  participant_type,
  matches_played,
  matches_won,
  points,
  goals_for,
  goals_against,
  goal_difference,
  position
FROM v_tournament_standings
LIMIT 10;

-- Success message
SELECT '✅ Fixed standings view created successfully!' AS status,
       'Now handles: teams, doubles (pairs), and singles' AS feature,
       'Use: SELECT * FROM v_tournament_standings WHERE tournament_id = ?' AS usage;
