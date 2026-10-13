-- Migration: Allow NULL values for player1_id and player2_id in pairs table
-- This allows creating pairs without players initially, then inviting them later
-- Date: 2026-01-21

ALTER TABLE pairs 
  MODIFY COLUMN player1_id INT NULL,
  MODIFY COLUMN player2_id INT NULL;

-- Add comment to document the change
ALTER TABLE pairs 
  MODIFY COLUMN player1_id INT NULL COMMENT 'Player 1 ID - NULL until invitation accepted',
  MODIFY COLUMN player2_id INT NULL COMMENT 'Player 2 ID - NULL until invitation accepted';
