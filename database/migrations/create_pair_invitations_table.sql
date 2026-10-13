-- Create pair_invitations table for inviting players to existing pairs
-- This is different from partnership_invitations which creates NEW pairs

CREATE TABLE IF NOT EXISTS pair_invitations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  pair_id INT NOT NULL,
  inviter_id INT NOT NULL,
  invitee_id INT NOT NULL,
  status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
  metadata JSON DEFAULT NULL,
  invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (pair_id) REFERENCES pairs(id) ON DELETE CASCADE,
  FOREIGN KEY (inviter_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (invitee_id) REFERENCES users(id) ON DELETE CASCADE,
  
  INDEX idx_pair_id (pair_id),
  INDEX idx_invitee_id (invitee_id),
  INDEX idx_status (status)
);
