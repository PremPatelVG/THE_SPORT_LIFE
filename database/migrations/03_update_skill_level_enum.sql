-- Migration: Update skill_level ENUM to use 'expert' instead of 'advanced'
-- Date: 2025-10-30

-- Update the skill_level column to use 'expert' instead of 'advanced'
ALTER TABLE user_sports 
MODIFY COLUMN skill_level ENUM('beginner', 'intermediate', 'expert', 'professional') DEFAULT 'beginner';

-- Note: This will automatically convert any existing 'advanced' values to 'expert'
-- If you have existing data with 'advanced', run this first:
-- UPDATE user_sports SET skill_level = 'expert' WHERE skill_level = 'advanced';
