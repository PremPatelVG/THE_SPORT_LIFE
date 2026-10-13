-- =====================================================
-- CREATE ADMINS TABLE
-- Separate table for admin users with same structure as users table
-- This allows same email/phone to exist as both admin and player
-- =====================================================

CREATE TABLE IF NOT EXISTS admins (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    
    -- Personal Info
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    gender ENUM('male', 'female', 'other'),
    profile_image VARCHAR(255),
    
    -- System Fields
    role ENUM('super_admin', 'admin', 'moderator') DEFAULT 'admin' NOT NULL,
    is_verified BOOLEAN DEFAULT TRUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    
    -- Permissions (JSON for flexible permission management)
    permissions JSON COMMENT 'Admin-specific permissions',
    
    -- Last Login Tracking
    last_login_at TIMESTAMP NULL,
    last_login_ip VARCHAR(45),
    
    -- Soft Delete
    deleted_at TIMESTAMP NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    
    INDEX idx_admins_email (email),
    INDEX idx_admins_phone (phone),
    INDEX idx_admins_role (role),
    INDEX idx_admins_active (is_active),
    INDEX idx_admins_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Admin Sessions Table (separate from user sessions)
CREATE TABLE IF NOT EXISTS admin_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    admin_id INT NOT NULL,
    refresh_token VARCHAR(500) NOT NULL,
    device_info TEXT,
    ip_address VARCHAR(45),
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE,
    
    INDEX idx_admin_sessions_admin (admin_id),
    INDEX idx_admin_sessions_token (refresh_token(255)),
    INDEX idx_admin_sessions_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migrate existing admin users from users table to admins table
INSERT INTO admins (
    email, 
    phone, 
    password_hash, 
    first_name, 
    last_name, 
    gender, 
    profile_image, 
    role,
    is_verified, 
    is_active, 
    created_at, 
    updated_at
)
SELECT 
    email,
    phone,
    password_hash,
    first_name,
    last_name,
    gender,
    profile_image,
    'admin' as role,
    is_verified,
    is_active,
    created_at,
    updated_at
FROM users 
WHERE role = 'admin' 
AND deleted_at IS NULL
ON DUPLICATE KEY UPDATE 
    email = VALUES(email);

-- Optional: Update users table to remove admin role from enum
-- Note: This requires recreating the column, so we'll keep it for backward compatibility
-- ALTER TABLE users MODIFY COLUMN role ENUM('player', 'scorer', 'spectator') DEFAULT 'player' NOT NULL;

-- Create default super admin if no admins exist
INSERT INTO admins (
    email,
    phone,
    password_hash,
    first_name,
    last_name,
    role,
    is_verified,
    is_active
)
SELECT 
    'admin@sportlife.com',
    '+919999999999',
    '$2a$10$YourHashedPasswordHere',
    'Super',
    'Admin',
    'super_admin',
    TRUE,
    TRUE
WHERE NOT EXISTS (SELECT 1 FROM admins WHERE role = 'super_admin')
LIMIT 1;
