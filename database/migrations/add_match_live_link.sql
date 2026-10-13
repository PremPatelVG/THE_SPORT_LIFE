-- =====================================================
-- Add match_live_link field to matches table
-- This allows admins to add YouTube live stream links
-- =====================================================

ALTER TABLE matches 
ADD COLUMN match_live_link VARCHAR(500) NULL COMMENT 'YouTube or streaming link for live match' 
AFTER notes;

-- Add index for quick lookup of matches with live links
CREATE INDEX idx_matches_live_link ON matches(match_live_link(255));
