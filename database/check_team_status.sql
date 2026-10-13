-- Check team status and table structure
USE sports_tournament_db_v3;

-- Show current status column definition
SHOW COLUMNS FROM teams LIKE 'status';

-- Check team 6 specifically
SELECT id, name, status, locked_at FROM teams WHERE id = 6;

-- Check all teams
SELECT id, name, status, locked_at FROM teams;
