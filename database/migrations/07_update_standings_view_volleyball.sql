-- =====================================================
-- Migration: Update v_tournament_standings View for Volleyball
-- =====================================================
-- Purpose: Add volleyball stats (set_ratio, points_won, points_lost, point_ratio) to the view
-- =====================================================

USE sports_tournament_db_v3;

-- Drop and recreate the view with volleyball stats
DROP VIEW IF EXISTS v_tournament_standings;

CREATE VIEW v_tournament_standings AS
SELECT 
  ts.id,
  ts.tournament_id,
  ts.group_id,
  ts.participant_id,
  ts.matches_played,
  ts.matches_won,
  ts.matches_lost,
  ts.matches_drawn,
  ts.points,
  
  -- Volleyball stats (NEW) ✅
  ts.sets_won,
  ts.sets_lost,
  ts.set_ratio,
  ts.points_won,
  ts.points_lost,
  ts.point_ratio,
  
  -- Tennis/Badminton stats
  ts.games_won,
  ts.games_lost,
  
  -- Football stats
  ts.goals_for,
  ts.goals_against,
  ts.goal_difference,
  ts.clean_sheets,
  ts.avg_goals_for,
  ts.avg_goals_against,
  
  -- Streaks and form
  ts.winning_streak,
  ts.losing_streak,
  ts.form AS last_5_form,
  ts.head_to_head,
  
  -- Position and status
  ts.position,
  ts.is_eliminated,
  ts.updated_at,
  
  -- Participant details (based on tournament category)
  CASE 
    WHEN t.category = 'teams' THEN tm.name
    WHEN t.category = 'doubles' THEN CONCAT(
      COALESCE(u1.first_name, ''), ' ', COALESCE(u1.last_name, ''),
      ' & ',
      COALESCE(u2.first_name, ''), ' ', COALESCE(u2.last_name, '')
    )
    WHEN t.category = 'singles' THEN CONCAT(u.first_name, ' ', u.last_name)
    ELSE 'Unknown'
  END AS participant_name,
  
  CASE 
    WHEN t.category = 'teams' THEN tm.logo
    WHEN t.category = 'singles' THEN u.profile_image
    ELSE NULL
  END AS participant_image,
  
  t.category AS participant_type,
  
  -- Calculated percentages
  CASE 
    WHEN ts.matches_played > 0 THEN ROUND((ts.matches_won / ts.matches_played) * 100, 2)
    ELSE 0
  END AS win_percentage,
  
  CASE 
    WHEN ts.matches_played > 0 THEN ROUND((ts.matches_lost / ts.matches_played) * 100, 2)
    ELSE 0
  END AS loss_percentage,
  
  CASE 
    WHEN ts.matches_played > 0 THEN ROUND((ts.matches_drawn / ts.matches_played) * 100, 2)
    ELSE 0
  END AS draw_percentage,
  
  CASE 
    WHEN ts.matches_played > 0 THEN ROUND(ts.points / ts.matches_played, 2)
    ELSE 0
  END AS points_per_game,
  
  -- Group and tournament details
  tg.group_name,
  t.name AS tournament_name,
  t.format_type,
  t.category AS tournament_category,
  t.status AS tournament_status,
  s.name AS sport_name,
  s.category AS sport_category

FROM tournament_standings ts
JOIN tournaments t ON ts.tournament_id = t.id
JOIN sports s ON t.sport_id = s.id

-- Join for teams
LEFT JOIN teams tm ON t.category = 'teams' AND ts.participant_id = tm.id

-- Join for doubles
LEFT JOIN pairs pr ON t.category = 'doubles' AND ts.participant_id = pr.id
LEFT JOIN users u1 ON pr.player1_id = u1.id
LEFT JOIN users u2 ON pr.player2_id = u2.id

-- Join for singles
LEFT JOIN tournament_registrations tr ON t.category = 'singles' AND ts.participant_id = tr.id
LEFT JOIN users u ON tr.user_id = u.id

-- Join for groups
LEFT JOIN tournament_groups tg ON ts.group_id = tg.id;

SELECT 'Migration 07: v_tournament_standings view updated with volleyball stats!' as status;
