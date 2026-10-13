-- Add custom_venue_name field to tournaments table
-- This allows users to specify a custom venue name when the venue is not in the predefined list

ALTER TABLE tournaments 
ADD COLUMN custom_venue_name VARCHAR(255) DEFAULT NULL AFTER venue_id;

-- Make venue_id nullable since custom venue can be used instead
ALTER TABLE tournaments 
MODIFY COLUMN venue_id INT DEFAULT NULL;

-- Add index for custom venue name for better search performance
CREATE INDEX idx_tournaments_custom_venue ON tournaments(custom_venue_name);
