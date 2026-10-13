-- Migration: Add admin_approved field to tournaments table
-- Description: Add admin approval flag to control tournament publishing

-- Add admin_approved column (default FALSE)
ALTER TABLE tournaments 
ADD COLUMN admin_approved BOOLEAN NOT NULL DEFAULT FALSE 
AFTER status;

-- Add comment for clarity
ALTER TABLE tournaments 
MODIFY COLUMN admin_approved BOOLEAN NOT NULL DEFAULT FALSE 
COMMENT 'Admin approval required before tournament can be published';

-- Update existing tournaments to be approved (backward compatibility)
-- This allows existing tournaments to be published without admin approval
UPDATE tournaments 
SET admin_approved = TRUE 
WHERE status IN ('open', 'closed', 'ongoing', 'completed');

-- Add index for filtering by admin approval status
CREATE INDEX idx_tournaments_admin_approved ON tournaments(admin_approved);
