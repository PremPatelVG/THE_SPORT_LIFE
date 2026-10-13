-- Add referee_ratings table if it doesn't exist
CREATE TABLE IF NOT EXISTS referee_ratings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    match_id INT NOT NULL,
    referee_id INT NOT NULL,
    rating DECIMAL(3,2) NOT NULL CHECK (rating >= 1.0 AND rating <= 5.0),
    feedback TEXT,
    rated_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE KEY unique_match_rating (match_id),
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    FOREIGN KEY (referee_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (rated_by) REFERENCES users(id),
    
    INDEX idx_referee_ratings_referee (referee_id),
    INDEX idx_referee_ratings_rating (rating)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
