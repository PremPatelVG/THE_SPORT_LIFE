-- Add facebook_id column to users table
-- Migration: Add Facebook OAuth support

ALTER TABLE users 
ADD COLUMN facebook_id VARCHAR(255) UNIQUE AFTER google_id;

-- Add index for facebook_id
CREATE INDEX idx_users_facebook_id ON users(facebook_id);
