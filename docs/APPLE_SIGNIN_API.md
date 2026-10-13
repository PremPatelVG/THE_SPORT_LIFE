# Apple Sign-In API Documentation

## Overview
This API enables Apple Sign-In authentication for your mobile app. The mobile app sends the Apple identity token, and the backend verifies it and authenticates the user.

## Setup Instructions

### 1. Install Required Package
```bash
npm install apple-signin-auth
```

### 2. Configure Environment Variables
Add the following to your `.env` file:

```env
# Apple Sign-In Configuration
APPLE_CLIENT_ID=com.yourapp.bundleid
APPLE_BUNDLE_ID=com.yourapp.bundleid
```

**Where to get these values:**
- `APPLE_CLIENT_ID`: Your app's bundle identifier (e.g., `com.sportlife.app`)
- `APPLE_BUNDLE_ID`: Same as APPLE_CLIENT_ID for mobile apps

### 3. Run Database Migration
```bash
mysql -u your_db_user -p your_db_name < database/migrations/add_apple_id_to_users.sql
```

This adds the `apple_id` column to the `users` table.

---

## API Endpoints

### 1. Apple Sign-In Authentication
**Endpoint:** `POST /api/v1/auth/apple`

**Description:** Authenticates user with Apple identity token from mobile app.

**Request Body:**
```json
{
  "identityToken": "eyJraWQiOiJlWGF1bm1MIiwiYWxnIjoiUlMyNTYifQ...",
  "userInfo": {
    "email": "user@privaterelay.appleid.com",
    "firstName": "John",
    "lastName": "Doe"
  }
}
```

**Parameters:**
- `identityToken` (required): The identity token received from Apple Sign-In
- `userInfo` (optional): User information from Apple (only provided on first sign-in)
  - `email`: User's email (may be private relay email)
  - `firstName`: User's first name
  - `lastName`: User's last name

**Response - Existing User:**
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
      "auth_method": "apple"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

**Response - New User (Needs Profile Completion):**
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

**Error Response:**
```json
{
  "success": false,
  "error": "Apple authentication failed: Invalid token"
}
```

---

### 2. Complete Apple Registration
**Endpoint:** `POST /api/v1/auth/complete-apple-registration`

**Description:** Complete registration for new Apple users after phone verification.

**Request Body:**
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

**Parameters:**
- `appleId` (required): Apple user identifier from previous step
- `email` (optional): User's email (can be Apple private relay)
- `phone` (required): User's phone number (must be verified via OTP first)
- `first_name` (required): User's first name
- `last_name` (required): User's last name
- `gender` (required): `male`, `female`, or `other`
- `date_of_birth` (optional): ISO 8601 date format
- `handedness` (optional): `left`, `right`, or `ambidextrous`
- `sport_interests` (optional): Array of sport preferences

**Response:**
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
      "role": "player",
      "auth_method": "apple",
      "phone_verified": true
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Phone number not verified. Please verify OTP first."
}
```

---

## Mobile App Integration Flow

### First-Time User Flow
1. **User taps "Sign in with Apple" in your mobile app**
2. **App receives Apple credentials** (identity token, user info)
3. **App sends to backend:** `POST /api/v1/auth/apple`
4. **Backend responds:** `needsProfileCompletion: true`
5. **App requests phone number** from user
6. **App sends OTP:** `POST /api/v1/auth/send-otp`
7. **User enters OTP**
8. **App verifies OTP:** `POST /api/v1/auth/verify-otp`
9. **App collects additional info** (gender, sports, etc.)
10. **App completes registration:** `POST /api/v1/auth/complete-apple-registration`
11. **Backend returns user + tokens**
12. **App stores tokens and logs user in**

### Returning User Flow
1. **User taps "Sign in with Apple"**
2. **App receives Apple credentials**
3. **App sends to backend:** `POST /api/v1/auth/apple`
4. **Backend responds:** User data + tokens
5. **App stores tokens and logs user in**

---

## Mobile App Code Example (React Native)

### Install Apple Authentication
```bash
npm install @invertase/react-native-apple-authentication
```

### Implementation
```javascript
import appleAuth from '@invertase/react-native-apple-authentication';
import axios from 'axios';

const handleAppleSignIn = async () => {
  try {
    // 1. Perform Apple Sign-In request
    const appleAuthRequestResponse = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
    });

    // 2. Extract credentials
    const { identityToken, fullName, email } = appleAuthRequestResponse;

    // 3. Send to backend
    const response = await axios.post('https://your-api.com/api/v1/auth/apple', {
      identityToken,
      userInfo: {
        email: email,
        firstName: fullName?.givenName,
        lastName: fullName?.familyName,
      },
    });

    // 4. Check if profile completion is needed
    if (response.data.needsProfileCompletion) {
      // Navigate to phone verification screen
      navigation.navigate('PhoneVerification', {
        appleData: response.data.appleData,
      });
    } else {
      // User exists - save tokens and login
      await saveTokens(response.data.data.tokens);
      navigation.navigate('Home');
    }
  } catch (error) {
    console.error('Apple Sign-In error:', error);
    Alert.alert('Error', 'Failed to sign in with Apple');
  }
};
```

---

## Security Notes

### Token Verification
- The backend uses `apple-signin-auth` package to verify the identity token
- Token is verified against Apple's public keys
- Ensures the token is valid and not expired
- Validates the audience (your app's bundle ID)

### Privacy
- Apple may provide a private relay email (e.g., `xyz@privaterelay.appleid.com`)
- Users can hide their real email address
- Phone verification is required to ensure user authenticity
- Email is optional if user chooses to hide it

### Account Linking
- If a user already exists with the same email, the Apple ID is linked to that account
- Prevents duplicate accounts
- Users can sign in with either Apple or their original method

---

## Testing

### Test with Apple Sandbox
1. Use Apple's sandbox environment for testing
2. Create test Apple IDs in App Store Connect
3. Test both first-time and returning user flows

### Verify Database
```sql
-- Check if apple_id column exists
SELECT * FROM users WHERE apple_id IS NOT NULL;

-- Verify user was created with Apple auth
SELECT id, email, phone, first_name, last_name, apple_id, auth_method 
FROM users 
WHERE auth_method = 'apple';
```

---

## Troubleshooting

### "Apple authentication failed: Invalid token"
- Check that `APPLE_CLIENT_ID` matches your app's bundle ID
- Ensure the identity token is fresh (not expired)
- Verify your app is properly configured in Apple Developer Portal

### "Phone number not verified"
- User must complete OTP verification before completing registration
- Check that `POST /api/v1/auth/verify-otp` was called successfully

### "Phone number already registered"
- User already has an account with that phone number
- Consider implementing account linking or recovery flow

---

## Related Endpoints

- `POST /api/v1/auth/send-otp` - Send OTP to phone
- `POST /api/v1/auth/verify-otp` - Verify OTP code
- `POST /api/v1/auth/refresh-token` - Refresh access token
- `POST /api/v1/auth/logout` - Logout user
- `GET /api/v1/auth/profile` - Get user profile

---

## Support

For issues or questions:
1. Check the error message in the API response
2. Verify your environment variables are set correctly
3. Ensure database migration was run successfully
4. Check server logs for detailed error information
