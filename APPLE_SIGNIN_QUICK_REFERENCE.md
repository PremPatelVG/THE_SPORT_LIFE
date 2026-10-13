# Apple Sign-In Quick Reference

## 🚀 Quick Setup (3 Steps)

```bash
# 1. Install package
npm install apple-signin-auth

# 2. Run migration
mysql -u user -p database < database/migrations/add_apple_id_to_users.sql

# 3. Configure .env
APPLE_CLIENT_ID=com.yourapp.bundleid
APPLE_BUNDLE_ID=com.yourapp.bundleid
```

**Or use the automated script:**
```bash
./setup_apple_signin.sh
```

---

## 📡 API Endpoints

### 1. Apple Sign-In
```http
POST /api/v1/auth/apple
Content-Type: application/json

{
  "identityToken": "eyJraWQiOiJlWGF1bm1MIi...",
  "userInfo": {
    "email": "user@privaterelay.appleid.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

### 2. Complete Registration
```http
POST /api/v1/auth/complete-apple-registration
Content-Type: application/json

{
  "appleId": "001234.567890abcdef.1234",
  "phone": "+919876543210",
  "first_name": "John",
  "last_name": "Doe",
  "gender": "male"
}
```

---

## 📱 Mobile App Code (React Native)

```javascript
import appleAuth from '@invertase/react-native-apple-authentication';
import axios from 'axios';

// Sign in with Apple
const handleAppleSignIn = async () => {
  const { identityToken, fullName, email } = await appleAuth.performRequest({
    requestedOperation: appleAuth.Operation.LOGIN,
    requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
  });

  const response = await axios.post('https://api.com/api/v1/auth/apple', {
    identityToken,
    userInfo: {
      email,
      firstName: fullName?.givenName,
      lastName: fullName?.familyName,
    },
  });

  if (response.data.needsProfileCompletion) {
    // Navigate to phone verification
    navigation.navigate('PhoneVerification', {
      appleData: response.data.appleData,
    });
  } else {
    // Save tokens and login
    await saveTokens(response.data.data.tokens);
    navigation.navigate('Home');
  }
};
```

---

## 🔄 Authentication Flow

**New User:**
1. App → `POST /api/v1/auth/apple` → `needsProfileCompletion: true`
2. App → `POST /api/v1/auth/send-otp` → OTP sent
3. User enters OTP
4. App → `POST /api/v1/auth/verify-otp` → OTP verified
5. App → `POST /api/v1/auth/complete-apple-registration` → User created + tokens

**Returning User:**
1. App → `POST /api/v1/auth/apple` → User + tokens ✅

---

## 🗂️ Files Modified

- ✅ `src/models/User.js` - Added apple_id support
- ✅ `src/services/authService.js` - Added appleAuth()
- ✅ `src/controllers/authController.js` - Added controllers
- ✅ `src/validators/authValidator.js` - Added validators
- ✅ `src/routes/auth.routes.js` - Added routes
- ✅ `.env.example` - Added config
- ✅ `database/migrations/add_apple_id_to_users.sql` - Migration

---

## 🔍 Verification

```sql
-- Check apple_id column
DESCRIBE users;

-- Find Apple users
SELECT * FROM users WHERE auth_method = 'apple';
```

```bash
# Test API
curl -X POST http://localhost:5000/api/v1/auth/apple \
  -H "Content-Type: application/json" \
  -d '{"identityToken": "YOUR_TOKEN"}'
```

---

## 📚 Documentation

- **Complete API Guide:** `docs/APPLE_SIGNIN_API.md`
- **Setup Instructions:** `APPLE_SIGNIN_SETUP.md`
- **Implementation Summary:** `APPLE_SIGNIN_IMPLEMENTATION_SUMMARY.md`
- **This Quick Reference:** `APPLE_SIGNIN_QUICK_REFERENCE.md`

---

## ⚡ Common Commands

```bash
# Install package
npm install apple-signin-auth

# Run setup script
./setup_apple_signin.sh

# Start server
npm start

# Check logs
tail -f logs/app.log
```

---

## 🆘 Troubleshooting

| Error | Solution |
|-------|----------|
| "Invalid token" | Check APPLE_CLIENT_ID matches bundle ID |
| "Phone not verified" | Call /api/v1/auth/verify-otp first |
| "Phone already registered" | User exists, implement recovery flow |

---

## 🎯 Environment Variables

```env
# Required
APPLE_CLIENT_ID=com.yourapp.bundleid
APPLE_BUNDLE_ID=com.yourapp.bundleid

# Optional (if different from client ID)
# APPLE_TEAM_ID=ABC123DEF4
```

---

**Status:** ✅ Ready to Use  
**Last Updated:** December 2, 2024
