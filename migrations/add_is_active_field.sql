-- Migration: Add is_active field to tournaments and matches tables
-- Date: 2026-07-20
-- Description: Add is_active BOOLEAN field to control visibility of tournaments and matches

-- Add is_active to tournaments table
ALTER TABLE tournaments 
ADD COLUMN is_active BOOLEAN DEFAULT TRUE NOT NULL AFTER status,
ADD INDEX idx_tournaments_is_active (is_active);

-- Add is_active to matches table
ALTER TABLE matches 
ADD COLUMN is_active BOOLEAN DEFAULT TRUE NOT NULL AFTER status,
ADD INDEX idx_matches_is_active (is_active);

-- Update existing records to be active by default
UPDATE tournaments SET is_active = TRUE WHERE is_active IS NULL;
UPDATE matches SET is_active = TRUE WHERE is_active IS NULL;
