-- Migration: Add time support to tournament dates
-- Purpose: Change start_date and end_date from DATE to DATETIME to preserve time information

-- Step 1: Drop constraints that reference the columns we're modifying
ALTER TABLE tournaments 
DROP CONSTRAINT check_registration_dates,
DROP CONSTRAINT check_tournament_dates;

-- Step 2: Backup existing data (create temporary columns)
ALTER TABLE tournaments 
ADD COLUMN start_date_backup DATETIME NULL,
ADD COLUMN end_date_backup DATETIME NULL;

-- Step 3: Copy existing data to backup columns (convert DATE to DATETIME at midnight)
UPDATE tournaments 
SET 
  start_date_backup = CAST(CONCAT(start_date, ' 00:00:00') AS DATETIME),
  end_date_backup = CAST(CONCAT(end_date, ' 00:00:00') AS DATETIME);

-- Step 4: Drop the old DATE columns
ALTER TABLE tournaments 
DROP COLUMN start_date,
DROP COLUMN end_date;

-- Step 5: Rename backup columns to original names
ALTER TABLE tournaments 
CHANGE COLUMN start_date_backup start_date DATETIME NOT NULL,
CHANGE COLUMN end_date_backup end_date DATETIME NOT NULL;

-- Step 6: Re-create the CHECK constraints
ALTER TABLE tournaments 
ADD CONSTRAINT check_tournament_dates CHECK (end_date >= start_date),
ADD CONSTRAINT check_registration_dates CHECK (registration_end <= start_date);

-- Verification query
SELECT id, name, start_date, end_date, registration_start, registration_end 
FROM tournaments 
LIMIT 5;
