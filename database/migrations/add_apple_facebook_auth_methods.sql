-- Migration: Add 'apple' and 'facebook' to auth_method enum
-- Date: 2024-12-03
-- Description: Updates auth_method column to support Apple Sign-In and Facebook authentication

-- Add 'apple' and 'facebook' to the auth_method enum
ALTER TABLE users 
MODIFY COLUMN auth_method ENUM('mobile', 'google', 'email', 'facebook', 'apple') NOT NULL DEFAULT 'mobile';

-- Verification query (optional - run to verify the change)
-- SHOW COLUMNS FROM users WHERE Field = 'auth_method';
