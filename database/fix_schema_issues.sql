-- =====================================================
-- SCHEMA FIX SCRIPT
-- Fixes foreign key dependencies and missing columns
-- Run this BEFORE running the main schema.sql
-- =====================================================

-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

-- =====================================================
-- STEP 1: Add missing columns to users table
-- =====================================================

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS profile_completion_percentage INT DEFAULT 0 AFTER is_active,
ADD COLUMN IF NOT EXISTS payment_method_verified BOOLEAN DEFAULT FALSE AFTER profile_completion_percentage,
ADD COLUMN IF NOT EXISTS account_age_days INT DEFAULT 0 AFTER payment_method_verified;

-- =====================================================
-- STEP 2: Add missing columns to matches table  
-- =====================================================

ALTER TABLE matches
ADD COLUMN IF NOT EXISTS actual_start_time DATETIME AFTER notes,
ADD COLUMN IF NOT EXISTS actual_end_time DATETIME AFTER actual_start_time;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;
