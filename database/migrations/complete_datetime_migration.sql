-- Complete the DATETIME migration (backup columns already exist with data)

-- Step 1: Drop the old DATE columns
ALTER TABLE tournaments 
DROP COLUMN start_date,
DROP COLUMN end_date;

-- Step 2: Rename backup columns to original names
ALTER TABLE tournaments 
CHANGE COLUMN start_date_backup start_date DATETIME NOT NULL,
CHANGE COLUMN end_date_backup end_date DATETIME NOT NULL;

-- Step 3: Re-create the CHECK constraints
ALTER TABLE tournaments 
ADD CONSTRAINT check_tournament_dates CHECK (end_date >= start_date),
ADD CONSTRAINT check_registration_dates CHECK (registration_end <= start_date);

-- Verification: Show sample data (all data preserved!)
SELECT id, name, start_date, end_date, registration_start, registration_end 
FROM tournaments 
LIMIT 10;
