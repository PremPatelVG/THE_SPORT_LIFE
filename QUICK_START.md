# SportLife Frontend - Quick Start Guide

## Prerequisites
- Node.js >= 16.0.0
- npm >= 8.0.0
- Backend server running on port 3000

## Installation

### 1. Navigate to Frontend Directory
```bash
cd sportlife-frontend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
The `.env` file is already created with default settings:
```env
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

If your backend runs on a different port, update this file.

### 4. Start Development Server
```bash
npm run dev
```

The application will start on `http://localhost:5173`

## Start Backend Server

In a separate terminal:
```bash
cd ../sportlife-backend
npm run dev
```

Backend should run on `http://localhost:3000`

## Testing the Application

### 1. Register a New User
- Navigate to `http://localhost:5173/register`
- Fill in the registration form
- Submit to create account
- You'll be automatically logged in and redirected to dashboard

### 2. Login
- Navigate to `http://localhost:5173/login`
- Enter your email and password
- Click "Sign In"
- Redirected to dashboard on success

### 3. View Dashboard
- See your profile information
- View stats (tournaments, matches, teams)
- Access quick actions

### 4. Edit Profile
- Click "Edit Profile" button
- Update your information
- Click "Save Changes"
- Redirected back to dashboard

### 5. Change Password
- Click "Change Password" from dashboard
- Enter current password
- Enter new password (min 8 characters)
- Confirm new password
- Submit to update

### 6. Logout
- Click "Logout" button in header
- Redirected to login page
- Session cleared

## Redux DevTools

### Installation
1. Install Redux DevTools browser extension:
   - [Chrome](https://chrome.google.com/webstore/detail/redux-devtools/lmhkpmbekcpmknklioeibfkpmmfibljd)
   - [Firefox](https://addons.mozilla.org/en-US/firefox/addon/reduxdevtools/)

### Usage
1. Open browser DevTools (F12)
2. Navigate to "Redux" tab
3. View dispatched actions
4. Inspect state changes
5. Time-travel through state history

## Available Scripts

### Development
```bash
npm run dev          # Start dev server with hot reload
```

### Production
```bash
npm run build        # Build for production
npm run preview      # Preview production build
```

### Linting
```bash
npm run lint         # Run ESLint
```

## Project Features

### ✅ Implemented
- User Registration
- User Login
- User Dashboard
- Profile Management
- Change Password
- Protected Routes
- Redux State Management
- Token Auto-Refresh
- Error Handling
- Loading States
- Responsive Design

### 🚧 To Be Implemented
- Forgot Password Flow
- Email Verification
- Phone OTP Verification
- Google OAuth
- Session Management
- Profile Image Upload
- Sports Management
- Tournament Module
- Team Module
- Match Module
- Scoring Module

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 5173
npx kill-port 5173

# Or use different port
npm run dev -- --port 3001
```

### Backend Connection Error
- Ensure backend is running on port 3000
- Check `.env` file for correct API URL
- Verify CORS is enabled in backend

### Token Expired
- Clear browser localStorage
- Login again
- Token will auto-refresh on 401 errors

### Styles Not Loading
```bash
# Restart dev server
npm run dev
```

### Module Not Found
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## API Endpoints Used

### Authentication
- `POST /api/v1/auth/register` - Register user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/logout` - Logout user
- `POST /api/v1/auth/refresh-token` - Refresh access token
- `GET /api/v1/auth/profile` - Get user profile
- `PUT /api/v1/auth/profile` - Update profile
- `POST /api/v1/auth/change-password` - Change password

## Redux State Structure

### Auth State
```javascript
{
  user: {
    id: 1,
    email: "user@example.com",
    first_name: "John",
    last_name: "Doe",
    role: "player",
    is_verified: true
  },
  isAuthenticated: true,
  loading: false,
  error: null,
  success: null
}
```

### User State
```javascript
{
  profile: {
    id: 1,
    email: "user@example.com",
    first_name: "John",
    last_name: "Doe",
    phone: "+91 1234567890",
    gender: "male",
    date_of_birth: "1990-01-01",
    handedness: "right",
    sports: [
      { id: 1, name: "Tennis", skill_level: "intermediate" }
    ]
  },
  sessions: [],
  loading: false,
  error: null,
  success: null
}
```

## Component Usage Examples

### Using Redux in Components
```javascript
import { useDispatch, useSelector } from 'react-redux';
import { login } from '../store/slices/authSlice';

const MyComponent = () => {
  const dispatch = useDispatch();
  const { user, loading, error } = useSelector((state) => state.auth);

  const handleLogin = async (email, password) => {
    const result = await dispatch(login({ email, password }));
    if (login.fulfilled.match(result)) {
      // Success
    }
  };

  return (
    // JSX
  );
};
```

### Protected Routes
```javascript
import ProtectedRoute from './components/ProtectedRoute';

<Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  }
/>
```

## File Structure Overview

```
sportlife-frontend/
├── public/              # Static assets
├── src/
│   ├── store/          # Redux store and slices
│   ├── config/         # Configuration files
│   ├── services/       # API services
│   ├── components/     # Reusable components
│   ├── pages/          # Page components
│   ├── App.jsx         # Main app component
│   ├── main.jsx        # Entry point
│   └── index.css       # Global styles
├── .env                # Environment variables
├── package.json        # Dependencies
├── vite.config.js      # Vite configuration
├── tailwind.config.js  # Tailwind configuration
└── postcss.config.js   # PostCSS configuration
```

## Next Steps

1. **Test all features** - Register, login, update profile, change password
2. **Check Redux DevTools** - Inspect state and actions
3. **Review documentation** - Read `REDUX_DOCUMENTATION.md` for details
4. **Start building** - Add new features module by module
5. **Integrate more APIs** - Tournament, Team, Match modules

## Support & Documentation

- **User Module README**: `USER_MODULE_README.md`
- **Redux Documentation**: `REDUX_DOCUMENTATION.md`
- **Backend API Docs**: Check backend `README.md`

## Common Issues & Solutions

### Issue: "Cannot find module"
**Solution**: Run `npm install` to install all dependencies

### Issue: "Network Error"
**Solution**: Ensure backend is running and CORS is configured

### Issue: "Token expired"
**Solution**: Token auto-refreshes. If issues persist, clear localStorage and login again

### Issue: "Styles not applying"
**Solution**: Restart dev server, check Tailwind configuration

### Issue: "Redux state not updating"
**Solution**: Check Redux DevTools, ensure actions are dispatched correctly

## Performance Tips

1. Use Redux DevTools only in development
2. Lazy load routes for better performance
3. Memoize expensive computations
4. Use proper selectors to avoid re-renders
5. Optimize images and assets

## Security Notes

- Tokens stored in localStorage (consider HttpOnly cookies for production)
- HTTPS required in production
- Implement rate limiting on backend
- Validate all user inputs
- Sanitize data before rendering

## Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Deploy dist/ folder to hosting service
```

## Environment Variables

```env
# Development
VITE_API_BASE_URL=http://localhost:3000/api/v1

# Production
VITE_API_BASE_URL=https://api.sportlife.com/api/v1
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers

## Contributing

1. Create feature branch
2. Make changes
3. Test thoroughly
4. Submit pull request

## License

© 2024 SportLife. All rights reserved.
