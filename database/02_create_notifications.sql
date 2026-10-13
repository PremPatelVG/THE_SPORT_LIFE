-- Notifications System Tables

-- Main notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    type ENUM('match', 'tournament', 'team', 'payment', 'referee', 'system', 'weather', 'message') NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSON,
    
    -- Related entities
    related_id INT COMMENT 'ID of related entity (match_id, tournament_id, etc.)',
    related_type VARCHAR(50) COMMENT 'Type of related entity',
    
    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    
    -- Priority
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    
    -- Delivery
    sent_via JSON COMMENT 'Channels: email, push, sms, in_app',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    INDEX idx_notifications_user (user_id),
    INDEX idx_notifications_read (user_id, is_read),
    INDEX idx_notifications_type (type),
    INDEX idx_notifications_created (created_at),
    INDEX idx_notifications_priority (priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notification preferences
CREATE TABLE IF NOT EXISTS notification_preferences (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    
    -- Channel preferences
    email_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT TRUE,
    sms_enabled BOOLEAN DEFAULT FALSE,
    in_app_enabled BOOLEAN DEFAULT TRUE,
    
    -- Type preferences (JSON for flexibility)
    match_notifications BOOLEAN DEFAULT TRUE,
    tournament_notifications BOOLEAN DEFAULT TRUE,
    team_notifications BOOLEAN DEFAULT TRUE,
    payment_notifications BOOLEAN DEFAULT TRUE,
    referee_notifications BOOLEAN DEFAULT TRUE,
    system_notifications BOOLEAN DEFAULT TRUE,
    weather_notifications BOOLEAN DEFAULT TRUE,
    message_notifications BOOLEAN DEFAULT TRUE,
    
    -- Quiet hours
    quiet_hours_enabled BOOLEAN DEFAULT FALSE,
    quiet_hours_start TIME DEFAULT '22:00:00',
    quiet_hours_end TIME DEFAULT '08:00:00',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_preferences_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Push notification tokens (for mobile/web push)
CREATE TABLE IF NOT EXISTS push_tokens (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token VARCHAR(500) NOT NULL,
    device_type ENUM('ios', 'android', 'web') NOT NULL,
    device_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_token (user_id, token(255)),
    INDEX idx_push_tokens_user (user_id),
    INDEX idx_push_tokens_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notification templates
CREATE TABLE IF NOT EXISTS notification_templates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    template_key VARCHAR(100) NOT NULL UNIQUE,
    type ENUM('match', 'tournament', 'team', 'payment', 'referee', 'system', 'weather', 'message') NOT NULL,
    title_template VARCHAR(255) NOT NULL,
    message_template TEXT NOT NULL,
    variables JSON COMMENT 'Available template variables',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_templates_type (type),
    INDEX idx_templates_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default notification templates
INSERT INTO notification_templates (template_key, type, title_template, message_template, variables) VALUES
('match_starting_soon', 'match', 'Match Starting Soon', 'Your match {{match_name}} starts in {{minutes}} minutes at {{venue_name}}.', '["match_name", "minutes", "venue_name"]'),
('match_result', 'match', 'Match Result', 'Match {{match_name}} has been completed. {{result_message}}', '["match_name", "result_message"]'),
('tournament_registration_confirmed', 'tournament', 'Registration Confirmed', 'Your registration for {{tournament_name}} has been confirmed. Entry fee: {{entry_fee}}', '["tournament_name", "entry_fee"]'),
('tournament_starting_soon', 'tournament', 'Tournament Starting Soon', '{{tournament_name}} starts on {{start_date}}. Get ready!', '["tournament_name", "start_date"]'),
('team_invitation', 'team', 'Team Invitation', 'You have been invited to join {{team_name}} for {{tournament_name}}.', '["team_name", "tournament_name"]'),
('payment_successful', 'payment', 'Payment Successful', 'Your payment of {{amount}} for {{tournament_name}} was successful.', '["amount", "tournament_name"]'),
('payment_refunded', 'payment', 'Payment Refunded', 'Your payment of {{amount}} has been refunded. Reason: {{reason}}', '["amount", "reason"]'),
('referee_assignment', 'referee', 'Match Assignment', 'You have been assigned as referee for {{match_name}} on {{match_date}} at {{match_time}}.', '["match_name", "match_date", "match_time"]'),
('weather_alert', 'weather', 'Weather Alert', 'Weather alert for {{venue_name}}: {{condition}}. {{action_message}}', '["venue_name", "condition", "action_message"]'),
('system_announcement', 'system', 'System Announcement', '{{message}}', '["message"]')
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;
