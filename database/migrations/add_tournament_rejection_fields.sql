-- Migration: Add rejection fields to tournaments table
-- Description: Add rejection status and reason tracking for admin rejection workflow

-- Add rejection_reason column to store admin's reason for rejection
ALTER TABLE tournaments 
ADD COLUMN rejection_reason TEXT NULL 
AFTER admin_approved;

-- Add rejected_at timestamp to track when tournament was rejected
ALTER TABLE tournaments 
ADD COLUMN rejected_at TIMESTAMP NULL 
AFTER rejection_reason;

-- Add rejected_by to track which admin rejected the tournament
ALTER TABLE tournaments 
ADD COLUMN rejected_by INT NULL 
AFTER rejected_at;

-- Add foreign key constraint for rejected_by
ALTER TABLE tournaments 
ADD CONSTRAINT fk_tournaments_rejected_by 
FOREIGN KEY (rejected_by) REFERENCES admins(id) ON DELETE SET NULL;

-- Add index for filtering rejected tournaments
CREATE INDEX idx_tournaments_rejected_at ON tournaments(rejected_at);

-- Update status enum to include 'rejected' status
ALTER TABLE tournaments 
MODIFY COLUMN status ENUM('draft', 'open', 'closed', 'ongoing', 'completed', 'cancelled', 'rejected') 
DEFAULT 'draft' NOT NULL;
