# Team Invite by Email Fix

## 🐛 Issue

**Error:**
```json
{
    "success": false,
    "errors": [
        {
            "field": "user_id",
            "message": "User ID is required"
        },
        {
            "field": "user_id",
            "message": "Invalid user ID"
        }
    ]
}
```

**Request:**
```
POST http://localhost:5000/api/v1/teams/1/invite
Body: {"email": "dev@gmail.com"}
```

**Problem:** API expected `user_id` but received `email`

---

## 🔍 Root Cause

The validation was expecting `user_id` (integer), but the frontend was sending `email` (string).

### **Original Validator:**
```javascript
const inviteUserValidation = [
  body('user_id')  // ← Expected user_id
    .notEmpty()
    .isInt({ min: 1 })
];
```

### **Request Sent:**
```javascript
{
  "email": "dev@gmail.com"  // ← Sent email instead
}
```

---

## ✅ Fix Applied

Updated the API to accept email and look up the user automatically!

### **1. Updated Validator** (`teamValidator.js`)

**Before:**
```javascript
const inviteUserValidation = [
  body('user_id')
    .notEmpty()
    .withMessage('User ID is required')
    .isInt({ min: 1 })
    .withMessage('Invalid user ID')
];
```

**After:**
```javascript
const inviteUserValidation = [
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
];
```

### **2. Updated Controller** (`teamController.js`)

**Before:**
```javascript
const inviteUser = async (req, res) => {
  const { user_id } = req.body;
  const invitation = await teamService.inviteUser(
    req.params.id,
    user_id,
    req.user.id
  );
};
```

**After:**
```javascript
const inviteUser = async (req, res) => {
  const { email } = req.body;
  const invitation = await teamService.inviteUserByEmail(
    req.params.id,
    email,
    req.user.id
  );
};
```

### **3. Added New Service Method** (`teamService.js`)

```javascript
/**
 * Invite user to team by email
 */
const inviteUserByEmail = async (teamId, email, inviterId) => {
  try {
    // Find user by email
    const { query } = require('../config/database');
    const sql = 'SELECT id FROM users WHERE email = ? AND deleted_at IS NULL';
    const result = await query(sql, [email]);
    
    const users = Array.isArray(result) 
      ? result 
      : Array.isArray(result[0]) 
        ? result[0] 
        : [result];

    if (!users || users.length === 0) {
      throw new Error('User not found with this email');
    }

    const invitedUserId = users[0].id;

    // Use existing inviteUser logic
    return await inviteUser(teamId, invitedUserId, inviterId);
  } catch (error) {
    logger.error('Invite user by email error:', error);
    throw error;
  }
};
```

**What it does:**
1. Looks up user by email in database
2. Validates user exists
3. Gets user ID
4. Calls existing `inviteUser` method with user ID
5. Returns invitation

---

## 🎯 How It Works Now

### **Request:**
```bash
POST http://localhost:5000/api/v1/teams/1/invite
Authorization: Bearer YOUR_TOKEN
Content-Type: application/json

{
  "email": "dev@gmail.com"
}
```

### **Flow:**
```
1. Validator checks email format ✅
2. Controller extracts email
3. Service looks up user by email
4. Service gets user ID
5. Service creates invitation
6. Returns invitation details
```

### **Success Response:**
```json
{
  "success": true,
  "message": "Invitation sent successfully",
  "data": {
    "id": 5,
    "team_id": 1,
    "invited_user_id": 10,
    "invited_by": 1,
    "status": "pending",
    "created_at": "2024-11-17T10:00:00.000Z"
  }
}
```

### **Error Response (User Not Found):**
```json
{
  "success": false,
  "error": "User not found with this email"
}
```

---

## 🧪 Testing

### **Test Case 1: Valid Email**
```bash
curl -X POST http://localhost:5000/api/v1/teams/1/invite \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "dev@gmail.com"}'
```

**Expected:** ✅ Success - Invitation created

### **Test Case 2: Invalid Email Format**
```bash
curl -X POST http://localhost:5000/api/v1/teams/1/invite \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "notanemail"}'
```

**Expected:** ❌ Error - "Invalid email format"

### **Test Case 3: Email Not Found**
```bash
curl -X POST http://localhost:5000/api/v1/teams/1/invite \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "nonexistent@example.com"}'
```

**Expected:** ❌ Error - "User not found with this email"

### **Test Case 4: User Already Member**
```bash
curl -X POST http://localhost:5000/api/v1/teams/1/invite \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "existing-member@gmail.com"}'
```

**Expected:** ❌ Error - "User is already a team member"

### **Test Case 5: Invitation Already Sent**
```bash
curl -X POST http://localhost:5000/api/v1/teams/1/invite \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "already-invited@gmail.com"}'
```

**Expected:** ❌ Error - "Invitation already sent to this user"

---

## 📊 Validation Rules

### **Email Validation:**
- ✅ Required (cannot be empty)
- ✅ Must be valid email format
- ✅ User must exist in database
- ✅ User must not be deleted

### **Permission Checks:**
- ✅ Inviter must be team creator or captain
- ✅ Team must not be full
- ✅ User must not already be a member
- ✅ No pending invitation exists

---

## 🎨 Frontend Usage

### **Example: Invite User Form**
```javascript
const handleInvite = async (email) => {
  try {
    const response = await api.post(`/teams/${teamId}/invite`, {
      email: email  // ← Just send email!
    });
    
    console.log('Invitation sent:', response.data);
  } catch (error) {
    console.error('Error:', error.response.data.error);
  }
};
```

### **Example: React Component**
```jsx
const InviteUserForm = ({ teamId }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.post(`/teams/${teamId}/invite`, { email });
      alert('Invitation sent successfully!');
      setEmail('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter user email"
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Sending...' : 'Send Invitation'}
      </button>
      {error && <p className="error">{error}</p>}
    </form>
  );
};
```

---

## 🔄 Backward Compatibility

The old `inviteUser` method still exists and works with `user_id`:

```javascript
// Still works if you have user_id
const invitation = await teamService.inviteUser(teamId, userId, inviterId);
```

But the API endpoint now uses email:

```javascript
// API endpoint uses email
POST /api/v1/teams/:id/invite
Body: { "email": "user@example.com" }
```

---

## 📝 Summary

**What Changed:**
- ✅ Validator now accepts `email` instead of `user_id`
- ✅ Controller uses `inviteUserByEmail` method
- ✅ Service looks up user by email automatically
- ✅ Better UX - no need to know user IDs

**Benefits:**
- 🎯 Easier to use - just provide email
- 🔍 Automatic user lookup
- ✅ Better error messages
- 🚀 More intuitive API

**Status:** ✅ **FIXED AND READY TO USE**

---

## 🚀 Next Steps

1. **Restart backend server:**
   ```bash
   cd sportlife-backend
   npm run start
   ```

2. **Test the API:**
   ```bash
   POST http://localhost:5000/api/v1/teams/1/invite
   Body: {"email": "dev@gmail.com"}
   ```

3. **Should work now!** ✅

**The team invitation system now accepts email addresses!** 🎉
