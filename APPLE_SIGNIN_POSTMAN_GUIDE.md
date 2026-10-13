# Apple Sign-In API - Postman Testing Guide

## 🧪 Complete Postman Test Examples

---

## API Endpoint 1: Apple Sign-In Authentication

### **POST** `/api/v1/auth/apple`

**URL:** `http://localhost:5000/api/v1/auth/apple`

### Headers:
```
Content-Type: application/json
```

### Request Body (New User):
```json
{
  "identityToken": "eyJraWQiOiJlWGF1bm1MIiwiYWxnIjoiUlMyNTYifQ.eyJpc3MiOiJodHRwczovL2FwcGxlaWQuYXBwbGUuY29tIiwiYXVkIjoiY29tLnlvdXJhcHAuYnVuZGxlaWQiLCJleHAiOjE3MzMxNDU2MDAsImlhdCI6MTczMzA1OTIwMCwic3ViIjoiMDAxMjM0LjU2Nzg5MGFiY2RlZi4xMjM0IiwiZW1haWwiOiJ1c2VyQHByaXZhdGVyZWxheS5hcHBsZWlkLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjoidHJ1ZSJ9.signature",
  "userInfo": {
    "email": "user@privaterelay.appleid.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

### Expected Response (New User - Needs Profile Completion):
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

### Expected Response (Existing User - Direct Login):
```json
{
  "success": true,
  "message": "Apple authentication successful",
  "data": {
    "user": {
      "id": 123,
      "email": "user@privaterelay.appleid.com",
      "phone": "+919876543210",
      "first_name": "John",
      "last_name": "Doe",
      "gender": "male",
      "role": "player",
      "auth_method": "apple",
      "is_verified": true,
      "phone_verified": true
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

---

## API Endpoint 2: Send OTP (Required for New Users)

### **POST** `/api/v1/auth/send-otp`

**URL:** `http://localhost:5000/api/v1/auth/send-otp`

### Headers:
```
Content-Type: application/json
```

### Request Body:
```json
{
  "phone": "+919876543210",
  "purpose": "signup"
}
```

### Expected Response:
```json
{
  "success": true,
  "message": "OTP sent successfully via WhatsApp",
  "data": {
    "phone": "+919876543210",
    "expiresIn": "10 minutes"
  }
}
```

---

## API Endpoint 3: Verify OTP

### **POST** `/api/v1/auth/verify-otp`

**URL:** `http://localhost:5000/api/v1/auth/verify-otp`

### Headers:
```
Content-Type: application/json
```

### Request Body:
```json
{
  "phone": "+919876543210",
  "otp": "123456"
}
```

### Expected Response:
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "phone": "+919876543210",
    "verified": true
  }
}
```

---

## API Endpoint 4: Complete Apple Registration

### **POST** `/api/v1/auth/complete-apple-registration`

**URL:** `http://localhost:5000/api/v1/auth/complete-apple-registration`

### Headers:
```
Content-Type: application/json
```

### Request Body (Minimal):
```json
{
  "appleId": "001234.567890abcdef.1234",
  "email": "user@privaterelay.appleid.com",
  "phone": "+919876543210",
  "first_name": "John",
  "last_name": "Doe",
  "gender": "male"
}
```

### Request Body (Complete with Sports):
```json
{
  "appleId": "001234.567890abcdef.1234",
  "email": "user@privaterelay.appleid.com",
  "phone": "+919876543210",
  "first_name": "John",
  "last_name": "Doe",
  "gender": "male",
  "date_of_birth": "1990-01-15",
  "handedness": "right",
  "sport_interests": [
    {
      "sport_id": 1,
      "skill_level": "intermediate"
    },
    {
      "sport_id": 3,
      "skill_level": "beginner"
    }
  ]
}
```

### Expected Response:
```json
{
  "success": true,
  "message": "Apple registration completed successfully!",
  "data": {
    "user": {
      "id": 124,
      "email": "user@privaterelay.appleid.com",
      "phone": "+919876543210",
      "first_name": "John",
      "last_name": "Doe",
      "gender": "male",
      "date_of_birth": "1990-01-15",
      "handedness": "right",
      "role": "player",
      "auth_method": "apple",
      "is_verified": true,
      "phone_verified": true,
      "apple_id": "001234.567890abcdef.1234"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

---

## 🧪 Complete Testing Flow in Postman

### **Test Scenario 1: New User Registration**

**Step 1:** Apple Sign-In (New User)
```
POST http://localhost:5000/api/v1/auth/apple
Body: {
  "identityToken": "MOCK_TOKEN_FOR_TESTING",
  "userInfo": {
    "email": "testuser@privaterelay.appleid.com",
    "firstName": "Test",
    "lastName": "User"
  }
}
```
**Expected:** `needsProfileCompletion: true`

**Step 2:** Send OTP
```
POST http://localhost:5000/api/v1/auth/send-otp
Body: {
  "phone": "+919876543210",
  "purpose": "signup"
}
```
**Expected:** OTP sent message

**Step 3:** Verify OTP
```
POST http://localhost:5000/api/v1/auth/verify-otp
Body: {
  "phone": "+919876543210",
  "otp": "123456"
}
```
**Expected:** OTP verified

**Step 4:** Complete Registration
```
POST http://localhost:5000/api/v1/auth/complete-apple-registration
Body: {
  "appleId": "001234.567890abcdef.1234",
  "email": "testuser@privaterelay.appleid.com",
  "phone": "+919876543210",
  "first_name": "Test",
  "last_name": "User",
  "gender": "male"
}
```
**Expected:** User created + tokens returned

---

### **Test Scenario 2: Returning User Login**

**Step 1:** Apple Sign-In (Existing User)
```
POST http://localhost:5000/api/v1/auth/apple
Body: {
  "identityToken": "MOCK_TOKEN_FOR_EXISTING_USER",
  "userInfo": {
    "email": "testuser@privaterelay.appleid.com"
  }
}
```
**Expected:** User data + tokens (immediate login)

---

## 🔧 Testing Without Real Apple Token

Since you're testing in Postman without a real mobile app, the token verification will fail. Here are two options:

### Option 1: Mock Testing (Recommended for Development)

Temporarily modify `src/services/authService.js` for testing:

```javascript
// TEMPORARY: For Postman testing only
const appleAuth = async (identityToken, userInfo = null, deviceInfo = null, ipAddress = null) => {
  try {
    // MOCK MODE: Skip token verification for testing
    if (identityToken === 'MOCK_TOKEN_FOR_TESTING') {
      const appleId = '001234.567890abcdef.1234';
      const email = userInfo?.email || 'testuser@privaterelay.appleid.com';
      
      // Rest of the logic remains the same...
      let user = await User.findByAppleId(appleId);
      // ... continue with normal flow
    }
    
    // PRODUCTION: Real token verification
    const appleVerify = require('apple-signin-auth');
    const appleData = await appleVerify.verifyIdToken(identityToken, {
      audience: process.env.APPLE_CLIENT_ID || process.env.APPLE_BUNDLE_ID,
      ignoreExpiration: false
    });
    // ... rest of production code
  } catch (error) {
    logger.error('Apple auth error:', error);
    throw error;
  }
};
```

### Option 2: Use Real Apple Token (Production Testing)

1. Get a real identity token from your iOS app
2. Copy the token immediately (it expires in ~10 minutes)
3. Use it in Postman
4. Test the real flow

---

## 📋 Postman Collection JSON

Save this as `Apple_SignIn_API.postman_collection.json`:

```json
{
  "info": {
    "name": "Apple Sign-In API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "1. Apple Sign-In (New User)",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"identityToken\": \"MOCK_TOKEN_FOR_TESTING\",\n  \"userInfo\": {\n    \"email\": \"testuser@privaterelay.appleid.com\",\n    \"firstName\": \"Test\",\n    \"lastName\": \"User\"\n  }\n}"
        },
        "url": {
          "raw": "http://localhost:5000/api/v1/auth/apple",
          "protocol": "http",
          "host": ["localhost"],
          "port": "5000",
          "path": ["api", "v1", "auth", "apple"]
        }
      }
    },
    {
      "name": "2. Send OTP",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"phone\": \"+919876543210\",\n  \"purpose\": \"signup\"\n}"
        },
        "url": {
          "raw": "http://localhost:5000/api/v1/auth/send-otp",
          "protocol": "http",
          "host": ["localhost"],
          "port": "5000",
          "path": ["api", "v1", "auth", "send-otp"]
        }
      }
    },
    {
      "name": "3. Verify OTP",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"phone\": \"+919876543210\",\n  \"otp\": \"123456\"\n}"
        },
        "url": {
          "raw": "http://localhost:5000/api/v1/auth/verify-otp",
          "protocol": "http",
          "host": ["localhost"],
          "port": "5000",
          "path": ["api", "v1", "auth", "verify-otp"]
        }
      }
    },
    {
      "name": "4. Complete Apple Registration",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"appleId\": \"001234.567890abcdef.1234\",\n  \"email\": \"testuser@privaterelay.appleid.com\",\n  \"phone\": \"+919876543210\",\n  \"first_name\": \"Test\",\n  \"last_name\": \"User\",\n  \"gender\": \"male\",\n  \"date_of_birth\": \"1990-01-15\",\n  \"handedness\": \"right\"\n}"
        },
        "url": {
          "raw": "http://localhost:5000/api/v1/auth/complete-apple-registration",
          "protocol": "http",
          "host": ["localhost"],
          "port": "5000",
          "path": ["api", "v1", "auth", "complete-apple-registration"]
        }
      }
    }
  ]
}
```

---

## 🎯 Quick Test Commands (cURL)

### Test 1: Apple Sign-In
```bash
curl -X POST http://localhost:5000/api/v1/auth/apple \
  -H "Content-Type: application/json" \
  -d '{
    "identityToken": "MOCK_TOKEN_FOR_TESTING",
    "userInfo": {
      "email": "testuser@privaterelay.appleid.com",
      "firstName": "Test",
      "lastName": "User"
    }
  }'
```

### Test 2: Send OTP
```bash
curl -X POST http://localhost:5000/api/v1/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919876543210",
    "purpose": "signup"
  }'
```

### Test 3: Verify OTP
```bash
curl -X POST http://localhost:5000/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+919876543210",
    "otp": "123456"
  }'
```

### Test 4: Complete Registration
```bash
curl -X POST http://localhost:5000/api/v1/auth/complete-apple-registration \
  -H "Content-Type: application/json" \
  -d '{
    "appleId": "001234.567890abcdef.1234",
    "email": "testuser@privaterelay.appleid.com",
    "phone": "+919876543210",
    "first_name": "Test",
    "last_name": "User",
    "gender": "male"
  }'
```

---

## ⚠️ Important Notes

1. **Token Verification:** Real Apple tokens expire in ~10 minutes
2. **Phone Format:** Must be in E.164 format (e.g., +919876543210)
3. **OTP Verification:** Must verify OTP before completing registration
4. **Gender Values:** `male`, `female`, or `other`
5. **Skill Levels:** `beginner`, `intermediate`, `advanced`, or `professional`

---

## 🐛 Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "Apple authentication failed: Invalid token" | Token verification failed | Use mock mode or real token |
| "Phone number not verified" | OTP not verified | Call verify-otp first |
| "Phone number already registered" | User exists | Use different phone or test login |
| "Missing required fields" | Incomplete data | Check all required fields |

---

**Ready to test! Import the Postman collection or use the cURL commands above.** 🚀
