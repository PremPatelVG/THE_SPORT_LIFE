# ✅ Apple Sign-In - Frontend Format Updated

## Your Frontend Format is Now Supported!

The API now accepts your frontend format with `token` instead of `identityToken`.

---

## 📡 API Endpoint: Apple Sign-In

**POST** `http://localhost:5000/api/v1/auth/apple`

### ✅ Your Frontend Format (Now Supported):
```json
{
  "token": "eyJraWQiOiJZUXJxZE1ENGJxIiwiYWxnIjoiUlMyNTYifQ.eyJpc3MiOiJodHRwczovL2FwcGxlaWQuYXBwbGUuY29tIiwiYXVkIjoiY29tLnRoZXNwb3J0bGlmZSIsImV4cCI6MTc2NDc2NjY2MCwiaWF0IjoxNzY0NjgwMjYwLCJzdWIiOiIwMDA5OTAuMjdiZWM1Mjc3YzkxNDkzMTkyYjY4NDgwZmEwMGRhMjEuMDkyNyIsImNfaGFzaCI6ImhsaHh5QTVEVkRQOV9Cb1Q3TzNxNFEiLCJlbWFpbCI6ImdjbXF2OGN0ZHRAcHJpdmF0ZXJlbGF5LmFwcGxlaWQuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImlzX3ByaXZhdGVfZW1haWwiOnRydWUsImF1dGhfdGltZSI6MTc2NDY4MDI2MCwibm9uY2Vfc3VwcG9ydGVkIjp0cnVlfQ.1RluMngfT9yhhfzuaqd9Dt8_jHkiYiGJE-Fha7uc04C9NmVRr3rb0Qy03hjvv0ebJIY70WNXYl5xFbCGrMs0PgjMUNDufngaLdTgKIgoTcAKG4jqzITBDynpbDxTGDAAjIwFafwMHGCFAktY2dOBTSirapT8WTDgJ18dJ99JFk8G2P9OdP2tcrVw96I3m77r1bSnxSRozVVFHuI4_B0ORp8VBezjEo_1-rDDTVk9q66uaeA7AStS0UcXrQNXlu3LbIM4WB-_GXAkf0oHAuU_Xu-kL6G44dlTTFTe3ENcaVgziAxj25fL36Or41U44koR8DfmmrhTV3833e31eqBttw",
  "userInfo": {
    "sub": "g8GiNBNXuLY55pSYKaUzTOyQplH3",
    "email": "apple@communicationcrafts.com",
    "name": "",
    "given_name": "",
    "family_name": "",
    "email_verified": true
  }
}
```

### ✅ Alternative Format (Also Supported):
```json
{
  "identityToken": "eyJraWQiOiJZUXJxZE1ENGJxIi...",
  "userInfo": {
    "email": "apple@communicationcrafts.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

---

## 🔄 What Changed

### Backend Updates:

**1. Controller (`src/controllers/authController.js`):**
```javascript
// Now accepts BOTH formats
const identityToken = req.body.identityToken || req.body.token;
const userInfo = req.body.userInfo;
```

**2. Validator (`src/validators/authValidator.js`):**
```javascript
// Validates either field exists
if (!req.body.token && !req.body.identityToken) {
  throw new Error('Token required');
}
```

---

## 📝 UserInfo Field Mapping

Your frontend sends:
```json
{
  "sub": "g8GiNBNXuLY55pSYKaUzTOyQplH3",
  "email": "apple@communicationcrafts.com",
  "name": "",
  "given_name": "",
  "family_name": "",
  "email_verified": true
}
```

Backend extracts:
- `email` → User's email
- `given_name` or `firstName` → First name
- `family_name` or `lastName` → Last name
- `sub` → Apple user ID (from token verification)

---

## 🧪 Test in Postman

### Request:
```
POST http://localhost:5000/api/v1/auth/apple
Content-Type: application/json

{
  "token": "eyJraWQiOiJZUXJxZE1ENGJxIiwiYWxnIjoiUlMyNTYifQ...",
  "userInfo": {
    "sub": "g8GiNBNXuLY55pSYKaUzTOyQplH3",
    "email": "apple@communicationcrafts.com",
    "given_name": "John",
    "family_name": "Doe",
    "email_verified": true
  }
}
```

### Response (New User):
```json
{
  "success": true,
  "needsProfileCompletion": true,
  "appleData": {
    "appleId": "000990.27bec5277c9149192b68480fa00da21.0927",
    "email": "apple@communicationcrafts.com",
    "first_name": "John",
    "last_name": "Doe"
  },
  "message": "Please verify your phone number and complete your profile"
}
```

### Response (Existing User):
```json
{
  "success": true,
  "message": "Apple authentication successful",
  "data": {
    "user": {
      "id": 123,
      "email": "apple@communicationcrafts.com",
      "phone": "+919876543210",
      "first_name": "John",
      "last_name": "Doe",
      "apple_id": "000990.27bec5277c9149192b68480fa00da21.0927",
      "auth_method": "apple"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

---

## 🎯 Complete Flow Example

### Step 1: Apple Sign-In (Your Format)
```bash
curl -X POST http://localhost:5000/api/v1/auth/apple \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YOUR_APPLE_TOKEN",
    "userInfo": {
      "sub": "g8GiNBNXuLY55pSYKaUzTOyQplH3",
      "email": "apple@communicationcrafts.com",
      "given_name": "John",
      "family_name": "Doe",
      "email_verified": true
    }
  }'
```

### Step 2: If New User - Send OTP
```bash
curl -X POST http://localhost:5000/api/v1/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919876543210",
    "purpose": "signup"
  }'
```

### Step 3: Verify OTP
```bash
curl -X POST http://localhost:5000/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919876543210",
    "otp": "123456"
  }'
```

### Step 4: Complete Registration
```bash
curl -X POST http://localhost:5000/api/v1/auth/complete-apple-registration \
  -H "Content-Type: application/json" \
  -d '{
    "appleId": "000990.27bec5277c9149192b68480fa00da21.0927",
    "email": "apple@communicationcrafts.com",
    "phone": "+919876543210",
    "first_name": "John",
    "last_name": "Doe",
    "gender": "male"
  }'
```

---

## 📱 Frontend Integration

Your frontend can now send data directly:

```javascript
// Your frontend code
const handleAppleSignIn = async (appleResponse) => {
  try {
    const response = await fetch('http://localhost:5000/api/v1/auth/apple', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: appleResponse.token,  // ✅ Now supported!
        userInfo: appleResponse.userInfo
      })
    });
    
    const data = await response.json();
    
    if (data.needsProfileCompletion) {
      // Navigate to phone verification
      navigateToPhoneVerification(data.appleData);
    } else {
      // User exists - save tokens and login
      saveTokens(data.data.tokens);
      navigateToHome();
    }
  } catch (error) {
    console.error('Apple sign-in failed:', error);
  }
};
```

---

## ✅ Summary

**What's Supported:**
- ✅ `token` field (your format)
- ✅ `identityToken` field (alternative format)
- ✅ `userInfo.given_name` and `userInfo.family_name`
- ✅ `userInfo.firstName` and `userInfo.lastName`
- ✅ `userInfo.email`
- ✅ `userInfo.sub` (Apple user ID)

**Your exact frontend format now works without any changes!** 🎉

---

## 🔍 Token Details

Your token contains:
```json
{
  "iss": "https://appleid.apple.com",
  "aud": "com.thesportlife",
  "exp": 1764766660,
  "iat": 1764680260,
  "sub": "000990.27bec5277c9149192b68480fa00da21.0927",
  "email": "gcmqv8ctdt@privaterelay.appleid.com",
  "email_verified": true,
  "is_private_email": true
}
```

- `sub` → Apple User ID (unique identifier)
- `email` → User's email (may be private relay)
- `aud` → Your app bundle ID (`com.thesportlife`)
- `exp` → Token expiration timestamp

---

**Ready to test with your frontend format!** 🚀
