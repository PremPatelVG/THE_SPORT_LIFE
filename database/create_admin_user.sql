-- Create Admin User
-- Username: admin@sportlife.com
-- Password: Admin@123

-- First, check if admin user already exists
SELECT 'Checking for existing admin user...' as status;

-- Insert admin user (password hash for 'Admin@123')
INSERT INTO users (
  email,
  phone,
  password_hash,
  first_name,
  last_name,
  role,
  is_verified,
  phone_verified,
  auth_method,
  created_at
) VALUES (
  'admin@sportlife.com',
  '+919999999999',
  '$2b$10$YourHashedPasswordHere',  -- This will be replaced with actual hash
  'Admin',
  'User',
  'admin',
  TRUE,
  TRUE,
  'email',
  NOW()
) ON DUPLICATE KEY UPDATE
  role = 'admin',
  is_verified = TRUE;

SELECT 'Admin user created/updated successfully!' as status;
SELECT id, email, first_name, last_name, role FROM users WHERE email = 'admin@sportlife.com';
