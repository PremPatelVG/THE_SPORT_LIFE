# Facebook OAuth Setup Guide

This guide will help you set up Facebook OAuth authentication for the SportLife application.

## Prerequisites

- Facebook Developer Account
- SportLife application running locally or deployed

## Step 1: Create a Facebook App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Click on **"My Apps"** in the top right corner
3. Click **"Create App"**
4. Select **"Consumer"** as the app type
5. Fill in the app details:
   - **App Name**: SportLife (or your preferred name)
   - **App Contact Email**: Your email address
6. Click **"Create App"**

## Step 2: Configure Facebook Login

1. In your app dashboard, click **"Add Product"**
2. Find **"Facebook Login"** and click **"Set Up"**
3. Select **"Web"** as the platform
4. Enter your **Site URL**:
   - For local development: `http://localhost:5173`
   - For production: Your production URL (e.g., `https://yourdomain.com`)
5. Click **"Save"** and **"Continue"**

## Step 3: Configure OAuth Settings

1. In the left sidebar, go to **"Facebook Login"** → **"Settings"**
2. Add the following **Valid OAuth Redirect URIs**:
   - For local development: `http://localhost:5173`
   - For production: Your production URL
3. Enable **"Client OAuth Login"**: Yes
4. Enable **"Web OAuth Login"**: Yes
5. Click **"Save Changes"**

## Step 4: Get Your App Credentials

1. In the left sidebar, go to **"Settings"** → **"Basic"**
2. Copy your **App ID** (this is your `FACEBOOK_APP_ID`)
3. Click **"Show"** next to **App Secret** and copy it (this is your `FACEBOOK_APP_SECRET`)

## Step 5: Configure Backend Environment Variables

1. Open `/sportlife-backend/.env` file
2. Add the following variables:

```env
# Facebook OAuth
FACEBOOK_APP_ID=your_facebook_app_id_here
FACEBOOK_APP_SECRET=your_facebook_app_secret_here
```

Replace `your_facebook_app_id_here` and `your_facebook_app_secret_here` with the actual values from Step 4.

## Step 6: Configure Frontend Environment Variables

1. Open `/sportlife-frontend/.env` file
2. Add the following variable:

```env
# Facebook OAuth (Get from: https://developers.facebook.com/)
VITE_FACEBOOK_APP_ID=your_facebook_app_id_here
```

Replace `your_facebook_app_id_here` with your actual Facebook App ID.

## Step 7: Update Facebook SDK in index.html

1. Open `/sportlife-frontend/index.html`
2. Update the Facebook App ID in the SDK initialization:

```javascript
window.fbAsyncInit = function() {
  FB.init({
    appId      : 'YOUR_FACEBOOK_APP_ID', // Replace with your actual App ID
    cookie     : true,
    xfbml      : true,
    version    : 'v18.0'
  });
  FB.AppEvents.logPageView();   
};
```

## Step 8: Run Database Migration

Run the migration to add the `facebook_id` column to the users table:

```bash
cd sportlife-backend
mysql -u root -p sportlife < database/migrations/add_facebook_id.sql
```

Or manually run this SQL:

```sql
ALTER TABLE users 
ADD COLUMN facebook_id VARCHAR(255) UNIQUE AFTER google_id;

CREATE INDEX idx_users_facebook_id ON users(facebook_id);
```

## Step 9: Test Facebook Login

1. Start your backend server:
```bash
cd sportlife-backend
npm run dev
```

2. Start your frontend server:
```bash
cd sportlife-frontend
npm run dev
```

3. Navigate to the login or register page
4. Click the **"Facebook"** button
5. Authorize the app with your Facebook account
6. Complete your profile (phone verification required for new users)

## Facebook App Review (For Production)

For production use, you need to submit your app for Facebook review:

1. Go to **"App Review"** in your Facebook app dashboard
2. Request permissions for:
   - `public_profile` (automatically approved)
   - `email` (requires review)
3. Fill in the required information about your app
4. Submit for review

**Note**: Until your app is approved, only you and other developers/testers added to your app can use Facebook Login.

## Adding Test Users

During development, you can add test users:

1. Go to **"Roles"** → **"Test Users"** in your app dashboard
2. Click **"Add"** to create test users
3. Use these test accounts to test Facebook login

## Troubleshooting

### "App Not Setup" Error
- Make sure Facebook Login product is added to your app
- Verify OAuth redirect URIs are correctly configured

### "Invalid OAuth Access Token"
- Check that your App ID and App Secret are correct in `.env` files
- Ensure the Facebook SDK is properly initialized

### "This app is in development mode"
- This is normal during development
- Only developers and test users can log in
- Submit for App Review to make it public

### CORS Errors
- Ensure your frontend URL is added to Valid OAuth Redirect URIs
- Check CORS configuration in your backend

## Security Best Practices

1. **Never commit** `.env` files to version control
2. **Rotate** your App Secret regularly
3. **Use HTTPS** in production
4. **Validate** all user data on the backend
5. **Implement rate limiting** to prevent abuse

## API Endpoints

### Facebook OAuth Login
```
POST /api/v1/auth/facebook
Body: {
  "accessToken": "facebook_access_token",
  "userInfo": {
    "id": "facebook_user_id",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "picture": { "data": { "url": "profile_pic_url" } }
  }
}
```

### Complete Facebook Registration
```
POST /api/v1/auth/complete-facebook-registration
Body: {
  "facebookId": "facebook_user_id",
  "email": "user@example.com",
  "phone": "+919876543210",
  "first_name": "John",
  "last_name": "Doe",
  "gender": "male",
  "date_of_birth": "1990-01-01",
  "handedness": "right",
  "sport_interests": [
    { "sport_id": 1, "skill_level": "beginner" }
  ],
  "profile_image": "profile_pic_url"
}
```

## Support

For more information, visit:
- [Facebook Login Documentation](https://developers.facebook.com/docs/facebook-login)
- [Facebook JavaScript SDK](https://developers.facebook.com/docs/javascript)
