-- =====================================================
-- SEED DATA FOR SPORTS
-- This migration adds initial sports data if not exists
-- =====================================================

-- Insert sports data (ignore if already exists)
INSERT IGNORE INTO sports (id, name, category, min_players_per_side, max_players_per_side, scoring_system, default_match_duration) VALUES
(1, 'Tennis', 'racquet', 1, 2, '{"sets":3,"games_per_set":6,"points":["0","15","30","40","game"]}', 120),
(2, 'Badminton', 'racquet', 1, 2, '{"sets":3,"points_per_set":21,"winning_margin":2}', 60),
(3, 'Table Tennis', 'racquet', 1, 2, '{"sets":5,"points_per_set":11,"winning_margin":2}', 45),
(4, 'Squash', 'racquet', 1, 1, '{"sets":5,"points_per_set":11,"winning_margin":2}', 60),
(5, 'Pickleball', 'racquet', 1, 2, '{"sets":3,"points_per_set":11,"winning_margin":2}', 45),
(6, 'Basketball', 'team', 5, 5, '{"quarters":4,"minutes_per_quarter":10}', 40),
(7, 'Volleyball', 'team', 6, 6, '{"sets":5,"points_per_set":25,"winning_margin":2}', 90),
(8, 'Football', 'team', 11, 11, '{"halves":2,"minutes_per_half":45}', 90),
(9, 'Cricket', 'team', 11, 11, '{"overs":20,"balls_per_over":6}', 180),
(10, 'Hockey', 'team', 11, 11, '{"halves":2,"minutes_per_half":35}', 70);

-- Verify insertion
SELECT COUNT(*) as total_sports FROM sports;
