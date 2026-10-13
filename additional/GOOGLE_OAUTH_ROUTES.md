# Google OAuth Routes - Quick Reference

## Available Routes

### 1. Client-Side OAuth (Existing)
**POST** `/api/v1/auth/google`
- Used by frontend with `@react-oauth/google`
- Accepts Google access token
- Returns user data and JWT tokens

### 2. Server-Side OAuth (New)

#### Initiate Login
**GET** `/api/v1/auth/google/login`
- Redirects to Google OAuth consent screen
- No parameters required

#### Callback Handler
**GET** `/api/v1/auth/google/callback`
- Receives authorization code from Google
- Exchanges code for tokens
- Redirects to frontend with user data

## Environment Variables Required

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/v1/auth/google/callback
FRONTEND_URL=http://localhost:3000
```

## Usage Examples

### Server-Side Flow (Recommended for Web Apps)

**HTML/JSX:**
```html
<a href="http://localhost:5000/api/v1/auth/google/login">
  <button>Sign in with Google</button>
</a>
```

**React:**
```jsx
const handleGoogleLogin = () => {
  window.location.href = `${API_BASE_URL}/auth/google/login`;
};

<button onClick={handleGoogleLogin}>Sign in with Google</button>
```

### Callback Handling

Create a route in your frontend to handle the callback:

```jsx
// Route: /auth/callback
import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const tokens = searchParams.get('tokens');
    const user = searchParams.get('user');
    
    if (tokens && user) {
      const tokensData = JSON.parse(decodeURIComponent(tokens));
      const userData = JSON.parse(decodeURIComponent(user));
      
      localStorage.setItem('accessToken', tokensData.accessToken);
      localStorage.setItem('refreshToken', tokensData.refreshToken);
      localStorage.setItem('user', JSON.stringify(userData));
      
      navigate('/dashboard');
    }
  }, []);

  return <div>Processing...</div>;
}
```

## Flow Diagram

```
User clicks "Sign in with Google"
         ↓
GET /api/v1/auth/google/login
         ↓
Redirect to Google OAuth
         ↓
User authenticates with Google
         ↓
Google redirects to: /api/v1/auth/google/callback?code=...
         ↓
Backend exchanges code for tokens
         ↓
Backend verifies user
         ↓
Redirect to frontend with tokens
         ↓
Frontend stores tokens and redirects to dashboard
```

## Testing

### Quick Test:
1. Open browser
2. Navigate to: `http://localhost:5000/api/v1/auth/google/login`
3. Sign in with Google
4. Check redirect to frontend

### cURL Test (Client-Side Flow):
```bash
curl -X POST http://localhost:5000/api/v1/auth/google \
  -H "Content-Type: application/json" \
  -d '{
    "token": "ya29.a0...",
    "userInfo": {
      "sub": "123456789",
      "email": "user@example.com",
      "given_name": "John",
      "family_name": "Doe"
    }
  }'
```

## Redirect URLs

### For Existing Users:
```
http://localhost:3000/auth/callback?tokens={...}&user={...}
```

### For New Users:
```
http://localhost:3000/register?googleData={...}
```

### On Error:
```
http://localhost:3000/login?error=error_message
```

## Notes

- Both flows work simultaneously
- Server-side flow is more secure for web applications
- Client-side flow is better for mobile apps
- Ensure `GOOGLE_REDIRECT_URI` matches exactly in Google Console
