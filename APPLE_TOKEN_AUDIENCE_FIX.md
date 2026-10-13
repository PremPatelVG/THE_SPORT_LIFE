# ✅ Apple Token Audience Error - FIXED

## Problem

**Error:**
```
jwt audience invalid. expected: com.thesportlife.login
```

**Root Cause:**
- Your Apple token has audience: `com.thesportlife`
- Backend `.env` was set to: `APPLE_CLIENT_ID=com.thesportlife.login`
- Mismatch caused token verification to fail

---

## Solution Applied

### Updated `.env` file:

**Before:**
```env
APPLE_CLIENT_ID=com.thesportlife.login
APPLE_BUNDLE_ID=com.thesportlife
```

**After:**
```env
APPLE_CLIENT_ID=com.thesportlife
APPLE_BUNDLE_ID=com.thesportlife
```

---

## ✅ Next Steps

### 1. Restart Backend Server
```bash
cd sportlife-backend
npm start
```

### 2. Test Again in Postman

**Request:**
```
POST http://localhost:5000/api/v1/auth/apple
Content-Type: application/json

{
  "token": "YOUR_APPLE_TOKEN",
  "userInfo": {
    "sub": "g8GiNBNXuLY55pSYKaUzTOyQplH3",
    "email": "apple@communicationcrafts.com",
    "given_name": "John",
    "family_name": "Doe",
    "email_verified": true
  }
}
```

**Expected Response:**
```json
{
  "success": true,
  "needsProfileCompletion": true,
  "appleData": {
    "appleId": "000990.27bec5277c9149192b68480fa00da21.0927",
    "email": "gcmqv8ctdt@privaterelay.appleid.com",
    "first_name": "John",
    "last_name": "Doe"
  },
  "message": "Please verify your phone number and complete your profile"
}
```

---

## 🔍 Understanding the Issue

### Your Apple Token Contains:
```json
{
  "iss": "https://appleid.apple.com",
  "aud": "com.thesportlife",  ← This is your app's bundle ID
  "sub": "000990.27bec5277c9149192b68480fa00da21.0927",
  "email": "gcmqv8ctdt@privaterelay.appleid.com"
}
```

### Token Verification:
The `apple-signin-auth` package verifies:
1. ✅ Token signature (against Apple's public keys)
2. ✅ Token expiration
3. ✅ **Audience matches your APPLE_CLIENT_ID** ← This was failing

Now the audience matches: `com.thesportlife` = `com.thesportlife` ✅

---

## 📝 Important Notes

**Bundle ID vs Service ID:**
- **Bundle ID:** `com.thesportlife` (for mobile apps)
- **Service ID:** `com.thesportlife.login` (for web apps)

Your mobile app uses the **Bundle ID**, so that's what should be in your `.env` file.

**If you have both mobile and web:**
- Mobile app tokens will have `aud: com.thesportlife`
- Web app tokens will have `aud: com.thesportlife.login`
- You may need to handle both audiences in the future

---

## ✅ Fixed!

**Restart your backend and test again. The token should now verify successfully!** 🚀
