# SportLife Frontend - User Module

## Overview
Professional React-based frontend for the SportLife user authentication and profile management system. Built with modern UI/UX practices using React, TailwindCSS, and Lucide icons.

## Features Implemented

### 🔐 Authentication
- **Login** - Email/password authentication with validation
- **Register** - Complete user registration with form validation
- **Protected Routes** - Automatic redirection for unauthorized access
- **Token Management** - Automatic token refresh and session handling
- **Logout** - Secure logout with token cleanup

### 👤 User Profile
- **Dashboard** - Personalized user dashboard with stats and quick actions
- **Profile Management** - Update personal information (name, phone, gender, DOB, handedness)
- **Change Password** - Secure password change with strength indicator
- **Profile Display** - View user details, verification status, and sports

## Tech Stack

- **React 19** - Latest React with hooks
- **Redux Toolkit** - State management with Redux Thunk
- **React-Redux** - Official React bindings for Redux
- **React Router DOM** - Client-side routing
- **Axios** - HTTP client with interceptors
- **TailwindCSS** - Utility-first CSS framework
- **Lucide React** - Beautiful icon library
- **Vite** - Fast build tool and dev server

## Project Structure

```
src/
├── store/
│   ├── index.js               # Redux store configuration
│   └── slices/
│       ├── authSlice.js       # Auth state & thunks
│       └── userSlice.js       # User profile state & thunks
├── config/
│   └── api.js                 # Axios configuration with interceptors
├── services/
│   └── authService.js         # Authentication API service layer
├── components/
│   └── ProtectedRoute.jsx     # Route protection wrapper
├── pages/
│   ├── Login.jsx              # Login page
│   ├── Register.jsx           # Registration page
│   ├── Dashboard.jsx          # User dashboard
│   ├── Profile.jsx            # Profile edit page
│   └── ChangePassword.jsx     # Password change page
├── App.jsx                    # Main app with Redux Provider
└── index.css                  # Global styles with Tailwind
```

## API Integration

All backend APIs are fully integrated:

### Authentication Endpoints
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout
- `POST /api/v1/auth/refresh-token` - Token refresh (automatic)
- `GET /api/v1/auth/profile` - Get user profile
- `PUT /api/v1/auth/profile` - Update user profile
- `POST /api/v1/auth/change-password` - Change password

### Features
- **Automatic Token Refresh** - Seamless token renewal on 401 errors
- **Request Interceptors** - Auto-attach auth tokens to requests
- **Error Handling** - Comprehensive error messages and user feedback
- **Local Storage** - Secure token and user data persistence

## Setup Instructions

### 1. Install Dependencies
```bash
cd sportlife-frontend
npm install
```

### 2. Configure Environment
Create `.env` file (already created):
```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

### 3. Start Development Server
```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

### 4. Start Backend Server
Make sure the backend is running:
```bash
cd ../sportlife-backend
npm run dev
```

Backend should be running on `http://localhost:3000`

## Usage Guide

### Registration Flow
1. Navigate to `/register`
2. Fill in required fields (first name, last name, email, password)
3. Optional fields: phone, gender, date of birth
4. Submit to create account
5. Automatically logged in and redirected to dashboard

### Login Flow
1. Navigate to `/login`
2. Enter email and password
3. Submit to authenticate
4. Redirected to dashboard on success

### Dashboard
- View profile summary with avatar
- See verification status and role
- View sports and skill levels
- Quick access to profile edit and password change
- Stats overview (tournaments, matches, teams)

### Profile Management
1. Click "Edit Profile" from dashboard
2. Update personal information
3. Save changes
4. Automatically updates local user state

### Change Password
1. Navigate to change password page
2. Enter current password
3. Enter new password (with strength indicator)
4. Confirm new password
5. Submit to update

## UI/UX Features

### Design System
- **Color Scheme** - Primary blue with professional gradients
- **Typography** - Clean, readable font hierarchy
- **Spacing** - Consistent padding and margins
- **Responsive** - Mobile-first design, works on all devices

### Components
- **Input Fields** - Icon-prefixed inputs with focus states
- **Buttons** - Primary and secondary variants with loading states
- **Cards** - Elevated containers with shadows
- **Alerts** - Success and error notifications
- **Loading States** - Spinners for async operations

### User Experience
- **Form Validation** - Real-time validation with error messages
- **Password Visibility Toggle** - Show/hide password functionality
- **Password Strength Meter** - Visual feedback for password security
- **Loading Indicators** - Clear feedback during API calls
- **Success Messages** - Confirmation of successful actions
- **Error Handling** - User-friendly error messages

## Security Features

- **JWT Authentication** - Secure token-based auth
- **Token Refresh** - Automatic renewal without user intervention
- **Protected Routes** - Unauthorized access prevention
- **Password Requirements** - Minimum 8 characters validation
- **Secure Storage** - LocalStorage for tokens (consider HttpOnly cookies for production)
- **HTTPS Ready** - Production-ready security configuration

## Next Steps

### Additional User Features to Implement
1. **Forgot Password** - Password reset flow
2. **Email Verification** - Verify email with token
3. **Phone OTP** - SMS verification
4. **Google OAuth** - Social login integration
5. **Session Management** - View and revoke active sessions
6. **Profile Image Upload** - Avatar upload functionality
7. **Sports Management** - Add/remove sports and skill levels

### Other Modules to Build
1. **Tournament Module** - Create, manage, and view tournaments
2. **Team Module** - Team creation and management
3. **Match Module** - Match scheduling and details
4. **Scoring Module** - Live scoring interface
5. **Venue Module** - Venue management
6. **Payment Module** - Payment processing
7. **Referee Module** - Referee assignment and management
8. **Notifications Module** - Real-time notifications

## Testing

### Manual Testing Checklist
- [ ] Register new user with valid data
- [ ] Register with invalid data (validation errors)
- [ ] Login with correct credentials
- [ ] Login with incorrect credentials
- [ ] Access protected route without auth (should redirect)
- [ ] View dashboard after login
- [ ] Update profile information
- [ ] Change password successfully
- [ ] Change password with wrong current password
- [ ] Logout and verify token cleanup
- [ ] Token refresh on expired access token

## Troubleshooting

### Common Issues

**1. API Connection Failed**
- Ensure backend is running on port 3000
- Check VITE_API_BASE_URL in .env file
- Verify CORS is enabled in backend

**2. Token Refresh Loop**
- Clear localStorage and login again
- Check refresh token expiry in backend

**3. Styles Not Loading**
- Restart dev server after Tailwind config changes
- Check PostCSS configuration

**4. Route Not Found**
- Verify React Router setup in App.jsx
- Check route paths match navigation links

## Performance Optimizations

- **Code Splitting** - Lazy load routes for faster initial load
- **Memoization** - Use React.memo for expensive components
- **Debouncing** - Debounce search and input handlers
- **Image Optimization** - Compress and lazy load images
- **Bundle Size** - Tree-shaking and minification in production

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Contributing

When adding new features:
1. Follow existing code structure
2. Use TailwindCSS utility classes
3. Implement proper error handling
4. Add loading states for async operations
5. Ensure responsive design
6. Test on multiple devices

## License

© 2024 SportLife. All rights reserved.
