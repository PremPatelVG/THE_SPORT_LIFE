-- Migration: Add apple_id column to users table for Apple Sign-In support
-- Date: 2024-12-02
-- Description: Adds apple_id column to store Apple user identifier for Apple Sign-In authentication

-- Add apple_id column to users table
ALTER TABLE users 
ADD COLUMN apple_id VARCHAR(255) NULL UNIQUE AFTER facebook_id,
ADD INDEX idx_apple_id (apple_id);

-- Add comment to the column
ALTER TABLE users 
MODIFY COLUMN apple_id VARCHAR(255) NULL UNIQUE COMMENT 'Apple Sign-In user identifier';

-- Verification query (optional - run to verify the change)
-- SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_COMMENT 
-- FROM INFORMATION_SCHEMA.COLUMNS 
-- WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'apple_id';
