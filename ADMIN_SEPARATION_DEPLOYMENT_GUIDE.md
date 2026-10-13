# Admin & Player Separation Deployment Guide

## Overview
This guide walks you through deploying the separated admin and player authentication system. The new system uses separate tables (`admins` and `users`) allowing the same email/phone to exist as both admin and player.

## What Changed

### Backend Changes
1. **New `admins` table** - Separate table for admin users
2. **New `admin_sessions` table** - Separate session management for admins
3. **New Admin Model** - `src/models/Admin.js`
4. **New Admin Auth Service** - `src/services/adminAuthService.js`
5. **New Admin Auth Controller** - `src/controllers/adminAuthController.js`
6. **New Admin Auth Routes** - `src/routes/adminAuth.routes.js`
7. **Updated Admin Middleware** - Now uses JWT tokens and admins table
8. **New API Endpoints** - `/api/v1/admin/auth/*`

### Frontend Changes
1. **Updated AdminLogin** - Uses new admin auth endpoints
2. **Updated adminApi** - Handles admin tokens separately with auto-refresh
3. **New AdminManagement Component** - For creating/managing admins

## Pre-Deployment Checklist

- [ ] Backup your database
- [ ] Note down existing admin users
- [ ] Ensure you have database access
- [ ] Backend server can be restarted
- [ ] Frontend can be rebuilt

## Deployment Steps

### Step 1: Backup Database

```bash
# Backup your database
mysqldump -u your_username -p your_database > backup_before_admin_separation_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Run Database Migration

```bash
cd tournament-scheduler-be

# Run the migration SQL file
mysql -u your_username -p your_database < database/migrations/create_admins_table.sql
```

**What this does:**
- Creates `admins` table
- Creates `admin_sessions` table
- Migrates existing admin users from `users` to `admins` table
- Creates a default super admin (if none exists)

### Step 3: Update Default Super Admin Password

The migration creates a default super admin. You MUST update the password:

```sql
-- Connect to your database
mysql -u your_username -p your_database

-- Update super admin password
-- Replace 'YourSecurePassword123!' with your actual password
UPDATE admins 
SET password_hash = '$2a$10$...' -- Use bcrypt to hash your password
WHERE role = 'super_admin' 
AND email = 'admin@sportlife.com';
```

**To generate a bcrypt hash:**

```javascript
// Run this in Node.js
const bcrypt = require('bcryptjs');
const password = 'YourSecurePassword123!';
bcrypt.hash(password, 10).then(hash => console.log(hash));
```

Or use the provided script:

```bash
cd tournament-scheduler-be
node scripts/hash-password.js "YourSecurePassword123!"
```

### Step 4: Verify Migration

```sql
-- Check admins were migrated
SELECT id, email, first_name, last_name, role, is_active 
FROM admins;

-- Check admin sessions table exists
SHOW TABLES LIKE 'admin_sessions';
```

### Step 5: Update Backend Code

All backend code is already in place. Just ensure:

```bash
cd tournament-scheduler-be

# Install dependencies (if any new ones)
npm install

# Restart the server
npm restart
# or
pm2 restart tournament-scheduler-be
```

### Step 6: Update Frontend Code

```bash
cd tournament-scheduler-fe

# Install dependencies (if any new ones)
npm install

# Build for production
npm run build

# Or restart dev server
npm run dev
```

### Step 7: Test Admin Login

1. Navigate to `/admin/login`
2. Login with super admin credentials:
   - Email: `admin@sportlife.com`
   - Password: (the one you set in Step 3)
3. Verify you can access admin dashboard
4. Check admin token is stored in localStorage as `adminAccessToken`

### Step 8: Test Player Login

1. Navigate to `/login`
2. Login with a player account
3. Verify player login still works
4. Verify player token is stored separately

### Step 9: Create Additional Admins (Optional)

1. Login as super admin
2. Navigate to Admin Management (add route in your admin panel)
3. Create new admin users as needed

## API Endpoint Changes

### Old Admin Login (Deprecated)
```
POST /api/v1/admin/login
```

### New Admin Login
```
POST /api/v1/admin/auth/login
```

### New Admin Endpoints
```
POST   /api/v1/admin/auth/login              - Admin login
POST   /api/v1/admin/auth/refresh-token      - Refresh access token
POST   /api/v1/admin/auth/logout             - Logout
POST   /api/v1/admin/auth/logout-all         - Logout all devices
GET    /api/v1/admin/auth/profile            - Get admin profile
PUT    /api/v1/admin/auth/profile            - Update admin profile
POST   /api/v1/admin/auth/change-password    - Change password
GET    /api/v1/admin/auth/sessions           - Get active sessions
DELETE /api/v1/admin/auth/sessions/:id       - Revoke session

# Super Admin Only
POST   /api/v1/admin/auth/create-admin       - Create new admin
GET    /api/v1/admin/auth/admins             - Get all admins
PATCH  /api/v1/admin/auth/admins/:id/status  - Update admin status
DELETE /api/v1/admin/auth/admins/:id         - Delete admin
```

## Token Storage Changes

### Before
```javascript
localStorage.setItem('adminToken', token);
```

### After
```javascript
localStorage.setItem('adminAccessToken', accessToken);
localStorage.setItem('adminRefreshToken', refreshToken);
localStorage.setItem('adminUser', JSON.stringify(admin));
```

## Rollback Plan

If something goes wrong:

### Step 1: Restore Database
```bash
mysql -u your_username -p your_database < backup_before_admin_separation_YYYYMMDD_HHMMSS.sql
```

### Step 2: Revert Code Changes
```bash
cd tournament-scheduler-be
git checkout HEAD~1  # Or your previous commit

cd tournament-scheduler-fe
git checkout HEAD~1
```

### Step 3: Restart Services
```bash
npm restart
```

## Verification Checklist

After deployment, verify:

- [ ] Admin login works at `/admin/login`
- [ ] Player login works at `/login`
- [ ] Admin can access admin dashboard
- [ ] Player can access player dashboard
- [ ] Same email can exist as both admin and player
- [ ] Admin tokens refresh automatically
- [ ] Admin logout works
- [ ] Super admin can create new admins
- [ ] Super admin can manage admin status

## Troubleshooting

### Issue: Admin login fails with "Invalid email or password"

**Solution:**
- Verify admin exists in `admins` table
- Check password hash is correct
- Ensure `is_active = 1`

### Issue: "Admin account not found"

**Solution:**
- Check migration ran successfully
- Verify admin exists: `SELECT * FROM admins WHERE email = 'your@email.com'`

### Issue: Token expired immediately

**Solution:**
- Check JWT_SECRET in .env
- Verify JWT_EXPIRES_IN is set (default: 1h)
- Check system time is correct

### Issue: Frontend shows CORS error

**Solution:**
- Ensure CORS_ORIGIN includes frontend URL
- Restart backend server
- Clear browser cache

### Issue: "Access denied. Admin privileges required"

**Solution:**
- Check token type is 'admin' in JWT payload
- Verify using admin token, not player token
- Clear localStorage and login again

## Security Recommendations

1. **Change default super admin password immediately**
2. **Use strong passwords** (minimum 12 characters)
3. **Enable 2FA** (future enhancement)
4. **Regularly audit admin accounts**
5. **Monitor admin login attempts**
6. **Set appropriate JWT expiration times**
7. **Use HTTPS in production**
8. **Rotate JWT secrets periodically**

## Support

If you encounter issues:
1. Check server logs: `pm2 logs tournament-scheduler-be`
2. Check browser console for errors
3. Verify database migration completed
4. Review this guide's troubleshooting section

## Next Steps

After successful deployment:

1. **Add Admin Management to Navigation**
   - Add route to admin panel sidebar
   - Import AdminManagement component

2. **Configure Admin Permissions** (Future)
   - Define granular permissions
   - Implement permission-based access control

3. **Add Admin Activity Logging** (Future)
   - Track admin actions
   - Audit trail for compliance

4. **Implement 2FA** (Future)
   - Add two-factor authentication
   - Enhance security

---

**Deployment Date:** _____________

**Deployed By:** _____________

**Verified By:** _____________
