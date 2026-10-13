# Google OAuth Authentication Flow

This document describes the Google OAuth authentication implementation in SportLife backend.

## Overview

The application supports **two Google OAuth flows**:

1. **Client-side flow** (using `@react-oauth/google` in frontend)
2. **Server-side flow** (using redirect URI callback)

## Configuration

### Environment Variables

Add these to your `.env` file:

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/v1/auth/google/callback
FRONTEND_URL=http://localhost:3000
```

### Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure OAuth consent screen
6. Add authorized redirect URIs:
   - `http://localhost:5000/api/v1/auth/google/callback` (development)
   - `https://yourdomain.com/api/v1/auth/google/callback` (production)
7. Copy Client ID and Client Secret to `.env`

## Flow 1: Client-Side OAuth (Current Implementation)

### How it works:

1. Frontend uses `@react-oauth/google` library
2. User clicks "Sign in with Google"
3. Google popup opens, user authenticates
4. Frontend receives access token
5. Frontend sends token to backend: `POST /api/v1/auth/google`
6. Backend verifies token and creates/authenticates user

### API Endpoint

**POST** `/api/v1/auth/google`

**Request Body:**
```json
{
  "token": "google_access_token",
  "userInfo": {
    "sub": "google_user_id",
    "email": "user@example.com",
    "given_name": "John",
    "family_name": "Doe",
    "picture": "https://..."
  }
}
```

**Response (Existing User):**
```json
{
  "success": true,
  "message": "Google authentication successful",
  "data": {
    "user": {
      "id": 1,
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "player"
    },
    "tokens": {
      "accessToken": "jwt_access_token",
      "refreshToken": "jwt_refresh_token"
    }
  }
}
```

**Response (New User - Needs Profile Completion):**
```json
{
  "success": true,
  "needsProfileCompletion": true,
  "googleData": {
    "googleId": "google_user_id",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "profile_image": "https://..."
  },
  "message": "Please verify your phone number and complete your profile"
}
```

## Flow 2: Server-Side OAuth (New Implementation)

### How it works:

1. User clicks "Sign in with Google" button
2. Frontend redirects to: `GET /api/v1/auth/google/login`
3. Backend redirects to Google OAuth consent screen
4. User authenticates with Google
5. Google redirects back to: `GET /api/v1/auth/google/callback?code=...`
6. Backend exchanges code for tokens
7. Backend redirects to frontend with user data

### API Endpoints

#### 1. Initiate OAuth

**GET** `/api/v1/auth/google/login`

Redirects user to Google OAuth consent screen.

**Usage:**
```html
<a href="http://localhost:5000/api/v1/auth/google/login">
  Sign in with Google
</a>
```

#### 2. OAuth Callback

**GET** `/api/v1/auth/google/callback?code=authorization_code`

Handles the callback from Google OAuth.

**Query Parameters:**
- `code`: Authorization code from Google

**Redirects:**

- **Existing User:**
  ```
  http://localhost:3000/auth/callback?tokens={...}&user={...}
  ```

- **New User (needs profile completion):**
  ```
  http://localhost:3000/register?googleData={...}
  ```

- **Error:**
  ```
  http://localhost:3000/login?error=error_message
  ```

## Frontend Integration

### For Client-Side Flow (Current)

```jsx
import { useGoogleLogin } from '@react-oauth/google';

const handleGoogleLogin = useGoogleLogin({
  onSuccess: async (tokenResponse) => {
    const userInfoResponse = await fetch(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      { headers: { Authorization: `Bearer ${tokenResponse.access_token}` } }
    );
    const userInfo = await userInfoResponse.json();

    const response = await apiClient.post('/auth/google', {
      token: tokenResponse.access_token,
      userInfo
    });

    if (response.data.needsProfileCompletion) {
      // Redirect to registration
      navigate('/register');
    } else {
      // Store tokens and login
      localStorage.setItem('accessToken', response.data.data.tokens.accessToken);
      navigate('/dashboard');
    }
  }
});
```

### For Server-Side Flow (New)

#### Login Button
```jsx
<a href={`${API_BASE_URL}/auth/google/login`}>
  <button>Sign in with Google</button>
</a>
```

#### Callback Handler Page
```jsx
// src/pages/AuthCallback.jsx
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const tokens = searchParams.get('tokens');
    const user = searchParams.get('user');
    const error = searchParams.get('error');

    if (error) {
      toast.error(error);
      navigate('/login');
      return;
    }

    if (tokens && user) {
      const tokensData = JSON.parse(decodeURIComponent(tokens));
      const userData = JSON.parse(decodeURIComponent(user));

      localStorage.setItem('accessToken', tokensData.accessToken);
      localStorage.setItem('refreshToken', tokensData.refreshToken);
      localStorage.setItem('user', JSON.stringify(userData));

      navigate('/dashboard');
    }
  }, [searchParams, navigate]);

  return <div>Processing login...</div>;
}
```

## User Registration Flow with Google

### For New Users:

1. User authenticates with Google
2. Backend returns `needsProfileCompletion: true`
3. Frontend redirects to registration page with Google data
4. User provides:
   - Phone number
   - Gender
   - Date of birth
   - Sport interests
5. User verifies phone with OTP
6. Frontend calls: `POST /api/v1/auth/complete-google-registration`

### Complete Google Registration

**POST** `/api/v1/auth/complete-google-registration`

**Request Body:**
```json
{
  "googleId": "google_user_id",
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+919876543210",
  "gender": "male",
  "date_of_birth": "1990-01-01",
  "profile_image": "https://...",
  "sport_interests": [
    { "sport_id": 1, "skill_level": "intermediate" },
    { "sport_id": 2, "skill_level": "beginner" }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Google registration completed successfully!",
  "data": {
    "user": { ... },
    "tokens": {
      "accessToken": "...",
      "refreshToken": "..."
    }
  }
}
```

## Security Considerations

1. **Token Verification**: Backend verifies Google ID tokens using `google-auth-library`
2. **HTTPS Required**: Use HTTPS in production for OAuth callbacks
3. **State Parameter**: Consider adding state parameter for CSRF protection
4. **Token Storage**: Store JWT tokens securely (httpOnly cookies recommended for production)
5. **Refresh Tokens**: Implement token refresh mechanism for long-lived sessions

## Testing

### Test Client-Side Flow:
```bash
curl -X POST http://localhost:5000/api/v1/auth/google \
  -H "Content-Type: application/json" \
  -d '{
    "token": "google_access_token",
    "userInfo": {
      "sub": "123456",
      "email": "test@example.com",
      "given_name": "Test",
      "family_name": "User"
    }
  }'
```

### Test Server-Side Flow:
1. Open browser: `http://localhost:5000/api/v1/auth/google/login`
2. Authenticate with Google
3. Verify redirect to frontend with tokens

## Troubleshooting

### Common Issues:

1. **"redirect_uri_mismatch" error**
   - Ensure `GOOGLE_REDIRECT_URI` in `.env` matches Google Console settings
   - Check for trailing slashes

2. **"invalid_client" error**
   - Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct

3. **Token verification fails**
   - Ensure token is fresh (not expired)
   - Check Google API is enabled in Cloud Console

4. **CORS errors**
   - Configure CORS in backend to allow frontend origin
   - Check `FRONTEND_URL` environment variable

## Migration Guide

### From Client-Side to Server-Side Flow:

1. Update frontend button to use redirect:
   ```jsx
   // Before
   <button onClick={handleGoogleLogin}>Sign in</button>
   
   // After
   <a href={`${API_URL}/auth/google/login`}>
     <button>Sign in</button>
   </a>
   ```

2. Add callback handler page in frontend
3. Update environment variables
4. Test the flow thoroughly

## References

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [google-auth-library NPM](https://www.npmjs.com/package/google-auth-library)
- [@react-oauth/google](https://www.npmjs.com/package/@react-oauth/google)
