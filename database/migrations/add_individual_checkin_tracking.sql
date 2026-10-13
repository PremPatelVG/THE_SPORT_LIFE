-- Add table to track individual check-ins for doubles/teams
-- This ensures both players in doubles check in separately

CREATE TABLE IF NOT EXISTS match_participant_checkins (
  id INT PRIMARY KEY AUTO_INCREMENT,
  match_id INT NOT NULL,
  participant_id INT NOT NULL,  -- pair_id or team_id or registration_id
  user_id INT NOT NULL,          -- individual user who checked in
  checked_in_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_checkin (match_id, participant_id, user_id)
);

-- Add index for faster lookups
CREATE INDEX idx_match_participant ON match_participant_checkins(match_id, participant_id);
CREATE INDEX idx_user_checkin ON match_participant_checkins(user_id);

-- Verify the table
DESCRIBE match_participant_checkins;
