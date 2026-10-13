-- Migration: Add Custom Groups Support for Groups+Knockout Format
-- This allows organizers to manually configure groups with variable sizes

-- Add flag to track if groups are custom or auto-generated
ALTER TABLE tournament_groups 
ADD COLUMN is_custom BOOLEAN DEFAULT FALSE COMMENT 'TRUE if organizer manually configured this group',
ADD COLUMN max_participants INT DEFAULT NULL COMMENT 'Maximum participants allowed in this group (NULL = no limit)',
ADD COLUMN display_order INT DEFAULT 0 COMMENT 'Display order for groups';

-- Add index for custom groups
CREATE INDEX idx_groups_custom ON tournament_groups(tournament_id, is_custom);

-- Add created_by field to track who created the group
ALTER TABLE tournament_groups
ADD COLUMN created_by INT DEFAULT NULL COMMENT 'User ID of organizer who created custom group',
ADD FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- Update group_participants to track manual assignment
ALTER TABLE group_participants
ADD COLUMN assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'When participant was assigned to group',
ADD COLUMN assigned_by INT DEFAULT NULL COMMENT 'User ID who assigned this participant',
ADD FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX idx_group_participants_participant ON group_participants(participant_id);

SELECT 'Migration: Custom Groups Support Added Successfully!' as status;
