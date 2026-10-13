# Authentication API Documentation

Complete authentication system with email/password, Google OAuth, OTP verification, and password management.

## Base URL
```
http://localhost:3000/api/v1/auth
```

---

## 📋 Table of Contents

1. [Registration & Login](#registration--login)
2. [Google OAuth](#google-oauth)
3. [OTP Verification](#otp-verification)
4. [Email Verification](#email-verification)
5. [Password Management](#password-management)
6. [Token Management](#token-management)
7. [Profile Management](#profile-management)
8. [Session Management](#session-management)

---

## Registration & Login

### Register New User

**Endpoint:** `POST /register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "phone": "+1234567890",
  "password": "SecurePass123",
  "first_name": "John",
  "last_name": "Doe",
  "gender": "male",
  "handedness": "right",
  "date_of_birth": "1995-05-15",
  "role": "player"
}
```

**Required Fields:**
- `email` - Valid email address
- `phone` - Phone number with country code
- `password` - Min 8 chars, must contain uppercase, lowercase, and number
- `first_name` - 2-100 characters
- `last_name` - 2-100 characters
- `gender` - One of: `male`, `female`, `other`

**Optional Fields:**
- `handedness` - One of: `left`, `right`, `ambidextrous`
- `date_of_birth` - ISO 8601 date (user must be 13+ years old)
- `role` - One of: `player`, `admin`, `scorer`, `spectator` (default: `player`)

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Registration successful. Please verify your email.",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "phone": "+1234567890",
      "first_name": "John",
      "last_name": "Doe",
      "gender": "male",
      "role": "player",
      "is_verified": false,
      "is_active": true,
      "created_at": "2024-10-15T10:30:00.000Z"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
    }
  }
}
```

---

### Login

**Endpoint:** `POST /login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "player",
      "is_verified": true
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
    }
  }
}
```

**Error Responses:**
- `401 Unauthorized` - Invalid credentials
- `401 Unauthorized` - Account deactivated

---

## Google OAuth

### Google Authentication

**Endpoint:** `POST /google`

**Request Body:**
```json
{
  "token": "google_id_token_here"
}
```

**Description:**
- Accepts Google ID token from client-side Google Sign-In
- Creates new user if doesn't exist
- Links Google account to existing email if found
- Auto-verifies email for Google users

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Google authentication successful",
  "data": {
    "user": {
      "id": 1,
      "email": "user@gmail.com",
      "first_name": "John",
      "last_name": "Doe",
      "google_id": "1234567890",
      "is_verified": true
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
    }
  }
}
```

---

## OTP Verification

### Send OTP

**Endpoint:** `POST /send-otp`

**Request Body:**
```json
{
  "phone": "+1234567890"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "data": {
    "expiresIn": 600
  }
}
```

**Notes:**
- OTP is 6 digits
- Valid for 10 minutes (configurable)
- Max 3 verification attempts
- In development mode, OTP is logged to console

---

### Verify OTP

**Endpoint:** `POST /verify-otp`

**Request Body:**
```json
{
  "phone": "+1234567890",
  "otp": "123456"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "OTP verified successfully"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid OTP
- `400 Bad Request` - OTP expired
- `400 Bad Request` - Max attempts exceeded

---

## Email Verification

### Verify Email

**Endpoint:** `GET /verify-email?token={token}`

**Query Parameters:**
- `token` - 64-character verification token (sent via email)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid or expired token

---

## Password Management

### Forgot Password

**Endpoint:** `POST /forgot-password`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "If the email exists, a password reset link has been sent."
}
```

**Notes:**
- Always returns success to prevent email enumeration
- Reset link valid for 1 hour
- Email contains reset instructions

---

### Reset Password

**Endpoint:** `POST /reset-password`

**Request Body:**
```json
{
  "token": "reset_token_from_email",
  "password": "NewSecurePass123",
  "confirmPassword": "NewSecurePass123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Password reset successful. Please login with your new password."
}
```

**Notes:**
- Invalidates all existing sessions
- User must login again with new password

---

### Change Password (Authenticated)

**Endpoint:** `POST /change-password`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "currentPassword": "OldPass123",
  "newPassword": "NewSecurePass123",
  "confirmPassword": "NewSecurePass123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Error Responses:**
- `400 Bad Request` - Current password incorrect
- `400 Bad Request` - New password same as current

---

## Token Management

### Refresh Access Token

**Endpoint:** `POST /refresh-token`

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Notes:**
- Access tokens expire in 24 hours
- Refresh tokens expire in 7 days
- Use this endpoint to get new access token without re-login

---

### Logout

**Endpoint:** `POST /logout`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### Logout All Devices

**Endpoint:** `POST /logout-all`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out from all devices"
}
```

**Notes:**
- Invalidates all refresh tokens for the user
- User must login again on all devices

---

## Profile Management

### Get Profile

**Endpoint:** `GET /profile`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "user@example.com",
    "phone": "+1234567890",
    "first_name": "John",
    "last_name": "Doe",
    "gender": "male",
    "handedness": "right",
    "date_of_birth": "1995-05-15",
    "profile_image": "https://...",
    "role": "player",
    "is_verified": true,
    "created_at": "2024-10-15T10:30:00.000Z",
    "sports": [
      {
        "id": 1,
        "name": "Tennis",
        "skill_level": "intermediate"
      }
    ]
  }
}
```

---

### Update Profile

**Endpoint:** `PUT /profile`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Smith",
  "phone": "+1234567890",
  "gender": "male",
  "handedness": "right",
  "date_of_birth": "1995-05-15"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "id": 1,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Smith"
  }
}
```

---

## Session Management

### Get Active Sessions

**Endpoint:** `GET /sessions`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "device_info": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
      "ip_address": "192.168.1.1",
      "created_at": "2024-10-15T10:30:00.000Z",
      "expires_at": "2024-10-22T10:30:00.000Z"
    },
    {
      "id": 2,
      "device_info": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)...",
      "ip_address": "192.168.1.2",
      "created_at": "2024-10-14T08:15:00.000Z",
      "expires_at": "2024-10-21T08:15:00.000Z"
    }
  ]
}
```

---

### Revoke Session

**Endpoint:** `DELETE /sessions/:sessionId`

**Headers:**
```
Authorization: Bearer {accessToken}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Session revoked successfully"
}
```

---

## Error Responses

All endpoints may return the following error format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

### Validation Errors

```json
{
  "success": false,
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email address"
    },
    {
      "field": "password",
      "message": "Password must be at least 8 characters long"
    }
  ]
}
```

### Common HTTP Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `400 Bad Request` - Validation error or invalid input
- `401 Unauthorized` - Authentication required or invalid credentials
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## Authentication Flow Examples

### 1. Email/Password Registration Flow

```
1. POST /register
   → Returns tokens + user data
   → Email verification sent

2. GET /verify-email?token=xxx
   → Email verified
   → Welcome email sent

3. User can now access protected endpoints
```

### 2. Google OAuth Flow

```
1. Client obtains Google ID token
2. POST /google with token
   → User created/logged in
   → Returns tokens + user data
3. User can access protected endpoints
```

### 3. Password Reset Flow

```
1. POST /forgot-password
   → Reset email sent

2. User clicks link in email
   → Frontend shows reset form

3. POST /reset-password
   → Password updated
   → All sessions invalidated

4. User must login again
```

### 4. Token Refresh Flow

```
1. Access token expires (24h)
2. POST /refresh-token with refreshToken
   → New access token returned
3. Continue using new access token
```

---

## Security Best Practices

1. **Store tokens securely**
   - Access token: Memory or secure httpOnly cookie
   - Refresh token: Secure httpOnly cookie only

2. **HTTPS only in production**
   - All authentication endpoints must use HTTPS

3. **Token expiration**
   - Access tokens: 24 hours
   - Refresh tokens: 7 days
   - Verification tokens: 24 hours
   - Reset tokens: 1 hour

4. **Rate limiting**
   - Login attempts: 5 per 15 minutes
   - OTP requests: 3 per hour
   - Password reset: 3 per hour

5. **Password requirements**
   - Minimum 8 characters
   - At least one uppercase letter
   - At least one lowercase letter
   - At least one number

---

## Testing

### Using cURL

**Register:**
```bash
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
```

**Login:**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123"
  }'
```

**Get Profile:**
```bash
curl -X GET http://localhost:3000/api/v1/auth/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Environment Variables

Required configuration in `.env`:

```env
# JWT
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
JWT_EXPIRE=24h
JWT_REFRESH_EXPIRE=7d

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Twilio (OTP)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890
OTP_EXPIRY_MINUTES=10
OTP_MAX_ATTEMPTS=3

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_email_password
EMAIL_FROM=noreply@sportlife.com

# Frontend
FRONTEND_URL=http://localhost:3000
```

---

**Last Updated:** October 15, 2024  
**API Version:** v1
