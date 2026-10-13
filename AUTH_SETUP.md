# 🔐 Authentication Module - Quick Setup Guide

## Prerequisites

- Node.js >= 16.0.0
- MySQL >= 8.0
- npm >= 8.0.0

## Step-by-Step Setup

### 1️⃣ Install Dependencies

```bash
cd sportlife-backend
npm install
```

This will install all required packages including:
- `google-auth-library` - Google OAuth
- `twilio` - SMS/OTP service
- `nodemailer` - Email service
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT tokens
- `express-validator` - Input validation

### 2️⃣ Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your credentials
nano .env  # or use your preferred editor
```

**Minimum Required Configuration:**

```env
# Database (REQUIRED)
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=sportlife

# JWT (REQUIRED)
JWT_SECRET=your_super_secret_jwt_key_change_this
JWT_REFRESH_SECRET=your_refresh_token_secret_change_this
JWT_EXPIRE=24h
JWT_REFRESH_EXPIRE=7d

# Server
PORT=3000
NODE_ENV=development
```

**Optional (for full functionality):**

```env
# Google OAuth (Optional - for Google Sign-In)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Twilio (Optional - for SMS OTP)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Email (Optional - for email verification)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
EMAIL_FROM=noreply@sportlife.com
```

### 3️⃣ Setup Database

**Option A: Import Complete Schema**

```bash
# Login to MySQL
mysql -u root -p

# Create database
CREATE DATABASE sportlife;

# Import schema
mysql -u root -p sportlife < ProjectScope/COMPLETE_UPDATED_SCHEMA.sql
```

**Option B: Create Required Tables Only**

If you only want to test authentication, create these tables:

```sql
-- Users table
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    google_id VARCHAR(255) UNIQUE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    gender ENUM('male', 'female', 'other') NOT NULL,
    handedness ENUM('left', 'right', 'ambidextrous'),
    date_of_birth DATE,
    profile_image VARCHAR(255),
    role ENUM('player', 'admin', 'scorer', 'spectator') DEFAULT 'player',
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_email (email),
    INDEX idx_users_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- OTP verifications table
CREATE TABLE otp_verifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    phone VARCHAR(20) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    expires_at DATETIME NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    attempts INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_otp_phone (phone),
    INDEX idx_otp_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User sessions table
CREATE TABLE user_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token VARCHAR(500) NOT NULL UNIQUE,
    device_info VARCHAR(255),
    ip_address VARCHAR(45),
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_sessions_user (user_id),
    INDEX idx_sessions_token (token),
    INDEX idx_sessions_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sports table (optional, for user profile)
CREATE TABLE sports (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) UNIQUE NOT NULL,
    category ENUM('racquet', 'team') NOT NULL,
    min_players_per_side INT NOT NULL,
    max_players_per_side INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User sports table (optional, for user profile)
CREATE TABLE user_sports (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    sport_id INT NOT NULL,
    skill_level ENUM('beginner', 'intermediate', 'advanced', 'professional') DEFAULT 'beginner',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_sport (user_id, sport_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (sport_id) REFERENCES sports(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample sports
INSERT INTO sports (name, category, min_players_per_side, max_players_per_side) VALUES
('Tennis', 'racquet', 1, 2),
('Badminton', 'racquet', 1, 2),
('Football', 'team', 11, 11),
('Volleyball', 'team', 6, 6);
```

### 4️⃣ Start the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

You should see:
```
✅ Database connected successfully
🚀 Server running on port 3000
```

### 5️⃣ Test the API

**Option A: Use the Test Script**

```bash
node test-auth.js
```

This will run automated tests for all authentication endpoints.

**Option B: Manual Testing with cURL**

```bash
# Register a new user
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "phone": "+1234567890",
    "password": "TestPass123",
    "first_name": "Test",
    "last_name": "User",
    "gender": "male"
  }'

# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123"
  }'

# Get profile (replace TOKEN with the access token from login)
curl -X GET http://localhost:3000/api/v1/auth/profile \
  -H "Authorization: Bearer TOKEN"
```

**Option C: Use Postman**

1. Import the API documentation from `docs/AUTH_API.md`
2. Create a new environment
3. Test each endpoint

---

## 🔧 Troubleshooting

### Database Connection Failed

**Error:** `❌ Database connection failed`

**Solution:**
1. Check MySQL is running: `sudo systemctl status mysql`
2. Verify credentials in `.env`
3. Ensure database exists: `mysql -u root -p -e "SHOW DATABASES;"`
4. Check user permissions: `GRANT ALL PRIVILEGES ON sportlife.* TO 'root'@'localhost';`

### Port Already in Use

**Error:** `EADDRINUSE: address already in use :::3000`

**Solution:**
```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port in .env
PORT=3001
```

### JWT Secret Not Set

**Error:** `JWT_SECRET is not defined`

**Solution:**
Add to `.env`:
```env
JWT_SECRET=your_super_secret_key_at_least_32_characters_long
JWT_REFRESH_SECRET=your_refresh_secret_also_32_characters_long
```

### Email/SMS Not Working

**Note:** In development mode, emails and SMS are logged to console instead of being sent.

**For Production:**
- **Email:** Configure SMTP settings in `.env`
- **SMS:** Sign up for Twilio and add credentials to `.env`

---

## 🎯 Quick Test Checklist

After setup, verify these work:

- [ ] Server starts without errors
- [ ] Database connection successful
- [ ] Can register a new user
- [ ] Can login with email/password
- [ ] Can get user profile
- [ ] Can update profile
- [ ] Can refresh token
- [ ] Can logout

---

## 📚 Next Steps

1. **Read the API Documentation:**
   - `docs/AUTH_API.md` - Complete API reference

2. **Review Implementation:**
   - `AUTH_MODULE_SUMMARY.md` - Feature overview

3. **Configure Optional Services:**
   - Google OAuth for social login
   - Twilio for SMS OTP
   - SMTP for email verification

4. **Implement Frontend:**
   - Use the API endpoints in your frontend
   - Store tokens securely
   - Implement token refresh logic

---

## 🔒 Security Checklist

Before going to production:

- [ ] Change all default secrets in `.env`
- [ ] Use strong JWT secrets (32+ characters)
- [ ] Enable HTTPS
- [ ] Configure CORS properly
- [ ] Implement rate limiting
- [ ] Set up monitoring and logging
- [ ] Enable email verification
- [ ] Configure proper SMTP settings
- [ ] Review and test all endpoints
- [ ] Set up backup and recovery

---

## 🆘 Getting Help

If you encounter issues:

1. Check the console logs for error messages
2. Review the `.env` configuration
3. Verify database tables exist
4. Test with the automated test script
5. Check the API documentation

---

## 📝 Development Mode Features

When `NODE_ENV=development`:

- Emails are logged to console (no SMTP needed)
- OTP codes are logged to console (no Twilio needed)
- Detailed error messages
- Auto-reload on file changes (with nodemon)

---

## ✅ Success Indicators

You'll know everything is working when:

1. **Server starts successfully:**
   ```
   ✅ Database connected successfully
   🚀 Server running on port 3000
   ```

2. **Test script passes:**
   ```
   📊 TEST SUMMARY
   Total Tests: 10
   ✓ Passed: 10
   Success Rate: 100%
   🎉 All tests passed!
   ```

3. **API responds correctly:**
   ```json
   {
     "success": true,
     "message": "Login successful",
     "data": { ... }
   }
   ```

---

**Ready to go!** 🚀

Your authentication module is now set up and ready to use.
