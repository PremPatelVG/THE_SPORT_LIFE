-- Add check-in columns to matches table
-- This allows participants to check in before a match starts

ALTER TABLE matches 
ADD COLUMN participant1_checkin BOOLEAN DEFAULT FALSE AFTER participant2_id,
ADD COLUMN participant2_checkin BOOLEAN DEFAULT FALSE AFTER participant1_checkin;

-- Verify the changes
DESCRIBE matches;
