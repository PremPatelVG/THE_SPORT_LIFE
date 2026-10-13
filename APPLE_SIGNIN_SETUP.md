# Apple Sign-In Setup Guide

## Quick Setup Steps

### 1. Install Required NPM Package
```bash
cd sportlife-backend
npm install apple-signin-auth
```

### 2. Run Database Migration
```bash
mysql -u your_db_user -p your_db_name < database/migrations/add_apple_id_to_users.sql
```

### 3. Configure Environment Variables
Add these to your `.env` file:
```env
# Apple Sign-In
APPLE_CLIENT_ID=com.yourapp.bundleid
APPLE_BUNDLE_ID=com.yourapp.bundleid
```

Replace `com.yourapp.bundleid` with your actual iOS app bundle identifier.

### 4. Restart Backend Server
```bash
npm start
```

---

## API Endpoints Created

### ✅ POST /api/v1/auth/apple
Authenticate user with Apple identity token from mobile app.

### ✅ POST /api/v1/auth/complete-apple-registration
Complete registration for new Apple users after phone verification.

---

## How It Works

### For New Users:
1. Mobile app sends Apple identity token to `/api/v1/auth/apple`
2. Backend verifies token and returns `needsProfileCompletion: true`
3. Mobile app collects phone number and sends OTP
4. User verifies OTP
5. Mobile app sends complete profile to `/api/v1/auth/complete-apple-registration`
6. Backend creates user account and returns tokens

### For Existing Users:
1. Mobile app sends Apple identity token to `/api/v1/auth/apple`
2. Backend verifies token and returns user + tokens immediately
3. User is logged in

---

## Files Modified/Created

### Modified Files:
- ✅ `src/models/User.js` - Added `apple_id` field support
- ✅ `src/services/authService.js` - Added `appleAuth()` and `completeAppleRegistration()`
- ✅ `src/controllers/authController.js` - Added `appleAuth()` and `completeAppleRegistration()`
- ✅ `src/validators/authValidator.js` - Added validation rules
- ✅ `src/routes/auth.routes.js` - Added Apple auth routes
- ✅ `.env.example` - Added Apple configuration

### Created Files:
- ✅ `database/migrations/add_apple_id_to_users.sql` - Database migration
- ✅ `docs/APPLE_SIGNIN_API.md` - Complete API documentation
- ✅ `APPLE_SIGNIN_SETUP.md` - This setup guide

---

## Testing the API

### Using Postman/cURL:

**1. Test Apple Sign-In (New User):**
```bash
curl -X POST http://localhost:5000/api/v1/auth/apple \
  -H "Content-Type: application/json" \
  -d '{
    "identityToken": "YOUR_APPLE_IDENTITY_TOKEN",
    "userInfo": {
      "email": "user@privaterelay.appleid.com",
      "firstName": "John",
      "lastName": "Doe"
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "needsProfileCompletion": true,
  "appleData": {
    "appleId": "001234.567890abcdef.1234",
    "email": "user@privaterelay.appleid.com",
    "first_name": "John",
    "last_name": "Doe"
  },
  "message": "Please verify your phone number and complete your profile"
}
```

**2. Complete Registration:**
```bash
# First send OTP
curl -X POST http://localhost:5000/api/v1/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210", "purpose": "signup"}'

# Verify OTP
curl -X POST http://localhost:5000/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210", "otp": "123456"}'

# Complete registration
curl -X POST http://localhost:5000/api/v1/auth/complete-apple-registration \
  -H "Content-Type: application/json" \
  -d '{
    "appleId": "001234.567890abcdef.1234",
    "email": "user@privaterelay.appleid.com",
    "phone": "+919876543210",
    "first_name": "John",
    "last_name": "Doe",
    "gender": "male"
  }'
```

---

## Mobile App Integration

See `docs/APPLE_SIGNIN_API.md` for complete mobile app integration guide with React Native examples.

---

## Verification

### Check Database:
```sql
-- Verify apple_id column was added
DESCRIBE users;

-- Check for Apple users
SELECT id, email, phone, first_name, last_name, apple_id, auth_method 
FROM users 
WHERE auth_method = 'apple';
```

### Check Server Logs:
```bash
# Start server and watch for Apple auth logs
npm start

# Look for:
# - "Apple auth error:" (if there are issues)
# - "Complete Apple registration error:" (if registration fails)
```

---

## Important Notes

⚠️ **Apple Identity Token:**
- The identity token is a JWT issued by Apple
- It's only valid for a short time (typically 10 minutes)
- Your mobile app must send it to the backend immediately after receiving it

⚠️ **Email Privacy:**
- Apple users can hide their email using private relay
- Email may be in format: `xyz@privaterelay.appleid.com`
- Phone verification is mandatory to ensure user authenticity

⚠️ **User Info:**
- Apple only provides user info (name, email) on the FIRST sign-in
- Store this information when you receive it
- Subsequent sign-ins only provide the identity token

---

## Next Steps

1. ✅ Install `apple-signin-auth` package
2. ✅ Run database migration
3. ✅ Configure environment variables
4. ✅ Restart backend server
5. 📱 Integrate with your mobile app
6. 🧪 Test the flow end-to-end
7. 🚀 Deploy to production

For detailed API documentation, see: `docs/APPLE_SIGNIN_API.md`
