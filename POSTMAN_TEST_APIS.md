# 🧪 Apple Sign-In - Postman Test APIs

## Quick Reference for Testing

---

## 📍 Base URL
```
http://localhost:5000
```

---

## 🔥 API 1: Apple Sign-In

**Endpoint:** `POST /api/v1/auth/apple`

**Full URL:** `http://localhost:5000/api/v1/auth/apple`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON) - Frontend Format (Recommended):**
```json
{
  "token": "eyJraWQiOiJZUXJxZE1ENGJxIiwiYWxnIjoiUlMyNTYifQ.eyJpc3MiOiJodHRwczovL2FwcGxlaWQuYXBwbGUuY29tIiwiYXVkIjoiY29tLnRoZXNwb3J0bGlmZSIsImV4cCI6MTc2NDc2NjY2MCwiaWF0IjoxNzY0NjgwMjYwLCJzdWIiOiIwMDA5OTAuMjdiZWM1Mjc3YzkxNDkzMTkyYjY4NDgwZmEwMGRhMjEuMDkyNyIsImNfaGFzaCI6ImhsaHh5QTVEVkRQOV9Cb1Q3TzNxNFEiLCJlbWFpbCI6ImdjbXF2OGN0ZHRAcHJpdmF0ZXJlbGF5LmFwcGxlaWQuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsImlzX3ByaXZhdGVfZW1haWwiOnRydWUsImF1dGhfdGltZSI6MTc2NDY4MDI2MCwibm9uY2Vfc3VwcG9ydGVkIjp0cnVlfQ.signature",
  "userInfo": {
    "sub": "g8GiNBNXuLY55pSYKaUzTOyQplH3",
    "email": "apple@communicationcrafts.com",
    "given_name": "John",
    "family_name": "Doe",
    "email_verified": true
  }
}
```

**Body (JSON) - Alternative Format:**
```json
{
  "identityToken": "eyJraWQiOiJlWGF1bm1MIiwiYWxnIjoiUlMyNTYifQ...",
  "userInfo": {
    "email": "testuser@privaterelay.appleid.com",
    "firstName": "Test",
    "lastName": "User"
  }
}
```

**Response (New User):**
```json
{
  "success": true,
  "needsProfileCompletion": true,
  "appleData": {
    "appleId": "001234.567890abcdef.1234",
    "email": "testuser@privaterelay.appleid.com",
    "first_name": "Test",
    "last_name": "User"
  },
  "message": "Please verify your phone number and complete your profile"
}
```

---

## 🔥 API 2: Send OTP

**Endpoint:** `POST /api/v1/auth/send-otp`

**Full URL:** `http://localhost:5000/api/v1/auth/send-otp`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "phone": "+919876543210",
  "purpose": "signup"
}
```

**Response:**
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

## 🔥 API 3: Verify OTP

**Endpoint:** `POST /api/v1/auth/verify-otp`

**Full URL:** `http://localhost:5000/api/v1/auth/verify-otp`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "phone": "+919876543210",
  "otp": "123456"
}
```

**Response:**
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

## 🔥 API 4: Complete Apple Registration

**Endpoint:** `POST /api/v1/auth/complete-apple-registration`

**Full URL:** `http://localhost:5000/api/v1/auth/complete-apple-registration`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON) - Minimal:**
```json
{
  "appleId": "001234.567890abcdef.1234",
  "email": "testuser@privaterelay.appleid.com",
  "phone": "+919876543210",
  "first_name": "Test",
  "last_name": "User",
  "gender": "male"
}
```

**Body (JSON) - With Sports:**
```json
{
  "appleId": "001234.567890abcdef.1234",
  "email": "testuser@privaterelay.appleid.com",
  "phone": "+919876543210",
  "first_name": "Test",
  "last_name": "User",
  "gender": "male",
  "date_of_birth": "1990-01-15",
  "handedness": "right",
  "sport_interests": [
    {
      "sport_id": 1,
      "skill_level": "intermediate"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Apple registration completed successfully!",
  "data": {
    "user": {
      "id": 124,
      "email": "testuser@privaterelay.appleid.com",
      "phone": "+919876543210",
      "first_name": "Test",
      "last_name": "User",
      "gender": "male",
      "role": "player",
      "auth_method": "apple",
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

## 📝 Testing Steps

### New User Flow:
1. **POST** `/api/v1/auth/apple` → Get `appleData`
2. **POST** `/api/v1/auth/send-otp` → Send OTP
3. **POST** `/api/v1/auth/verify-otp` → Verify OTP
4. **POST** `/api/v1/auth/complete-apple-registration` → Create user

### Existing User Flow:
1. **POST** `/api/v1/auth/apple` → Get user + tokens ✅

---

## 📦 Import Postman Collection

**File:** `Apple_SignIn_API.postman_collection.json`

**Steps:**
1. Open Postman
2. Click "Import"
3. Select the JSON file
4. All 6 requests will be imported

---

## 🎯 Field Validations

| Field | Type | Required | Values |
|-------|------|----------|--------|
| identityToken | string | ✅ Yes | Apple JWT token |
| phone | string | ✅ Yes | E.164 format (+919876543210) |
| first_name | string | ✅ Yes | 2-100 characters |
| last_name | string | ✅ Yes | 2-100 characters |
| gender | string | ✅ Yes | male, female, other |
| email | string | ❌ No | Valid email |
| date_of_birth | string | ❌ No | ISO 8601 (YYYY-MM-DD) |
| handedness | string | ❌ No | left, right, ambidextrous |
| sport_interests | array | ❌ No | Array of {sport_id, skill_level} |

---

## ⚠️ Important Notes

1. **Token Expiry:** Apple tokens expire in ~10 minutes
2. **Phone Format:** Must include country code (+91...)
3. **OTP Required:** Must verify OTP before completing registration
4. **Unique Constraint:** Each apple_id can only be used once

---

## 🐛 Common Errors

| Error | Reason | Fix |
|-------|--------|-----|
| "Invalid token" | Token verification failed | Use real Apple token or mock mode |
| "Phone not verified" | OTP not verified | Call verify-otp first |
| "Phone already registered" | User exists | Use different phone |
| "Missing required fields" | Incomplete data | Check all required fields |

---

**Ready to test in Postman!** 🚀

Import the collection or copy-paste the API details above.
