# Redux State Management Documentation

## Overview
The SportLife frontend uses **Redux Toolkit** with **Redux Thunk** for centralized state management. This provides predictable state updates, better debugging, and improved code organization.

## Architecture

### Store Structure
```
store/
├── index.js              # Store configuration
└── slices/
    ├── authSlice.js      # Authentication state
    └── userSlice.js      # User profile state
```

## State Slices

### 1. Auth Slice (`authSlice.js`)

**Purpose:** Manages authentication state, user session, and auth-related operations.

**State Shape:**
```javascript
{
  user: Object | null,           // Current authenticated user
  isAuthenticated: boolean,      // Authentication status
  loading: boolean,              // Loading state for async operations
  error: string | null,          // Error messages
  success: string | null         // Success messages
}
```

**Async Thunks:**
- `login({ email, password })` - User login
- `register(userData)` - User registration
- `logout()` - User logout
- `googleAuth(token)` - Google OAuth authentication
- `changePassword({ currentPassword, newPassword })` - Change password
- `forgotPassword(email)` - Request password reset
- `resetPassword({ token, password })` - Reset password with token
- `sendOTP(phone)` - Send OTP to phone
- `verifyOTP({ phone, otp })` - Verify OTP code

**Reducers:**
- `clearError()` - Clear error message
- `clearSuccess()` - Clear success message
- `setUser(user)` - Manually set user data

**Usage Example:**
```javascript
import { useDispatch, useSelector } from 'react-redux';
import { login, clearError } from '../store/slices/authSlice';

const LoginComponent = () => {
  const dispatch = useDispatch();
  const { loading, error, isAuthenticated } = useSelector((state) => state.auth);

  const handleLogin = async (email, password) => {
    const result = await dispatch(login({ email, password }));
    if (login.fulfilled.match(result)) {
      // Login successful
      navigate('/dashboard');
    }
  };

  return (
    // Component JSX
  );
};
```

### 2. User Slice (`userSlice.js`)

**Purpose:** Manages user profile data, sessions, and profile-related operations.

**State Shape:**
```javascript
{
  profile: Object | null,        // User profile with sports
  sessions: Array,               // Active user sessions
  loading: boolean,              // Loading state
  error: string | null,          // Error messages
  success: string | null         // Success messages
}
```

**Async Thunks:**
- `fetchProfile()` - Get user profile with sports
- `updateProfile(profileData)` - Update user profile
- `fetchSessions()` - Get all active sessions
- `revokeSession(sessionId)` - Revoke specific session
- `logoutAll()` - Logout from all devices

**Reducers:**
- `clearError()` - Clear error message
- `clearSuccess()` - Clear success message
- `clearProfile()` - Clear profile data

**Usage Example:**
```javascript
import { useDispatch, useSelector } from 'react-redux';
import { fetchProfile, updateProfile } from '../store/slices/userSlice';

const ProfileComponent = () => {
  const dispatch = useDispatch();
  const { profile, loading, error } = useSelector((state) => state.user);

  useEffect(() => {
    dispatch(fetchProfile());
  }, [dispatch]);

  const handleUpdate = async (data) => {
    const result = await dispatch(updateProfile(data));
    if (updateProfile.fulfilled.match(result)) {
      // Update successful
    }
  };

  return (
    // Component JSX
  );
};
```

## Redux Thunk Middleware

Redux Thunk is automatically included in Redux Toolkit and allows us to write async logic that interacts with the store.

### Benefits:
1. **Async Operations** - Handle API calls seamlessly
2. **Action Creators** - Return functions instead of plain objects
3. **Access to State** - Can read current state in thunks
4. **Dispatch Multiple Actions** - Chain multiple dispatches

### Thunk Lifecycle:
1. **Pending** - Action dispatched, loading starts
2. **Fulfilled** - Success, update state with data
3. **Rejected** - Error, update state with error message

## Best Practices

### 1. Component Integration
```javascript
// Always use hooks at component level
const dispatch = useDispatch();
const { data, loading, error } = useSelector((state) => state.sliceName);

// Dispatch actions in event handlers or useEffect
useEffect(() => {
  dispatch(fetchData());
}, [dispatch]);
```

### 2. Error Handling
```javascript
// Clear errors on component unmount
useEffect(() => {
  return () => {
    dispatch(clearError());
  };
}, [dispatch]);

// Check action result
const result = await dispatch(someAction(data));
if (someAction.fulfilled.match(result)) {
  // Success handling
} else if (someAction.rejected.match(result)) {
  // Error handling
}
```

### 3. Loading States
```javascript
// Use loading state for UI feedback
{loading && <Spinner />}
{!loading && data && <DataDisplay data={data} />}

// Disable buttons during loading
<button disabled={loading}>
  {loading ? 'Loading...' : 'Submit'}
</button>
```

### 4. Optimistic Updates
```javascript
// Update UI immediately, revert on error
const handleUpdate = async (data) => {
  const originalData = currentData;
  setLocalData(data); // Optimistic update
  
  const result = await dispatch(updateData(data));
  if (updateData.rejected.match(result)) {
    setLocalData(originalData); // Revert on error
  }
};
```

## Store Configuration

### Middleware Setup
```javascript
// store/index.js
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import userReducer from './slices/userSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    user: userReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['auth/login/fulfilled', 'auth/register/fulfilled'],
      },
    }),
});
```

### Provider Setup
```javascript
// App.jsx
import { Provider } from 'react-redux';
import store from './store';

function App() {
  return (
    <Provider store={store}>
      {/* App components */}
    </Provider>
  );
}
```

## Debugging

### Redux DevTools
Redux Toolkit automatically enables Redux DevTools in development mode.

**Features:**
- View all dispatched actions
- Inspect state changes
- Time-travel debugging
- Action replay

**Usage:**
1. Install Redux DevTools browser extension
2. Open browser DevTools
3. Navigate to Redux tab
4. Inspect actions and state

### Logging
```javascript
// Add custom logging in thunks
export const fetchData = createAsyncThunk(
  'slice/fetchData',
  async (params, { rejectWithValue }) => {
    try {
      console.log('Fetching data with params:', params);
      const response = await api.getData(params);
      console.log('Data fetched successfully:', response);
      return response.data;
    } catch (error) {
      console.error('Fetch failed:', error);
      return rejectWithValue(error.message);
    }
  }
);
```

## Testing

### Testing Thunks
```javascript
import { configureStore } from '@reduxjs/toolkit';
import authReducer, { login } from './authSlice';

describe('Auth Slice', () => {
  let store;

  beforeEach(() => {
    store = configureStore({ reducer: { auth: authReducer } });
  });

  it('should handle login success', async () => {
    const result = await store.dispatch(login({ email: 'test@test.com', password: 'password' }));
    expect(login.fulfilled.match(result)).toBe(true);
    expect(store.getState().auth.isAuthenticated).toBe(true);
  });
});
```

### Testing Components
```javascript
import { Provider } from 'react-redux';
import { render } from '@testing-library/react';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';

const renderWithRedux = (component, initialState = {}) => {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: initialState,
  });

  return render(<Provider store={store}>{component}</Provider>);
};

test('renders login form', () => {
  const { getByText } = renderWithRedux(<LoginForm />);
  expect(getByText('Login')).toBeInTheDocument();
});
```

## Performance Optimization

### 1. Selector Memoization
```javascript
import { createSelector } from '@reduxjs/toolkit';

// Memoized selector
const selectUserProfile = createSelector(
  (state) => state.user.profile,
  (profile) => profile
);

// Use in component
const profile = useSelector(selectUserProfile);
```

### 2. Avoid Unnecessary Re-renders
```javascript
// Use specific selectors instead of entire state
const { loading } = useSelector((state) => state.auth);
// Instead of: const auth = useSelector((state) => state.auth);
```

### 3. Batch Updates
```javascript
// Redux Toolkit automatically batches updates
dispatch(action1());
dispatch(action2());
dispatch(action3());
// Only one re-render
```

## Migration from Context API

The application previously used Context API. Here's what changed:

### Before (Context API):
```javascript
const { user, login, logout } = useAuth();
await login(email, password);
```

### After (Redux):
```javascript
const dispatch = useDispatch();
const { user, loading, error } = useSelector((state) => state.auth);
await dispatch(login({ email, password }));
```

### Benefits of Migration:
1. **Better Performance** - Optimized re-renders
2. **DevTools** - Advanced debugging capabilities
3. **Middleware** - Thunk for async operations
4. **Scalability** - Easier to add new features
5. **Testing** - Better testability
6. **Time Travel** - Debug state changes over time

## Future Enhancements

### Planned Features:
1. **RTK Query** - For advanced API caching
2. **Persist State** - Save state to localStorage
3. **Normalized State** - For complex data structures
4. **Entity Adapters** - For CRUD operations
5. **Slice Splitting** - Code splitting for large apps

### Additional Slices to Create:
- `tournamentSlice` - Tournament management
- `teamSlice` - Team operations
- `matchSlice` - Match scheduling
- `scoringSlice` - Live scoring
- `notificationSlice` - Real-time notifications
- `venueSlice` - Venue management
- `paymentSlice` - Payment processing

## Resources

- [Redux Toolkit Documentation](https://redux-toolkit.js.org/)
- [Redux Thunk Guide](https://redux.js.org/usage/writing-logic-thunks)
- [React-Redux Hooks](https://react-redux.js.org/api/hooks)
- [Redux DevTools](https://github.com/reduxjs/redux-devtools)

## Support

For issues or questions:
1. Check Redux DevTools for state inspection
2. Review action logs in console
3. Verify API responses in Network tab
4. Check slice reducers for proper state updates
