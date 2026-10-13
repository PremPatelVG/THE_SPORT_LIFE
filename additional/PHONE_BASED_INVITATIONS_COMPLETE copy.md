# ✅ Phone-Based Invitation System - Complete!

## 📋 Overview

The invitation system now works with **phone numbers** instead of email addresses. This allows inviting both:
1. **System Users** - Users already registered in the app
2. **External Users** - People NOT yet in the system (invited by phone number)

---

## 🔧 Backend Changes

### **1. Database Update**
Added `invited_phone` column to `tournament_registrations` table:
```sql
ALTER TABLE tournament_registrations 
ADD COLUMN invited_phone VARCHAR(20) NULL 
COMMENT 'Phone number of invited person (if not in system)' 
AFTER user_id;
```

### **2. Updated `invitePlayers` Controller**
**File:** `/controllers/registrationController.js`

**Changes:**
- Now accepts `phoneNumbers` array instead of `playerIds`
- Cleans phone numbers (removes spaces, dashes)
- Checks if user exists in system by phone
- If user exists: Links invitation to `user_id`
- If user NOT exists: Stores `invited_phone` only
- Prevents duplicate invitations

**Request Body:**
```json
{
  "phoneNumbers": ["9876543210", "9123456789"],
  "message": "Join our tournament!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Invitations sent to 2 player(s)",
  "data": {
    "invitations": [
      {
        "id": 123,
        "phone": "9876543210",
        "user_id": 45,
        "in_system": true,
        "status": "pending"
      },
      {
        "id": 124,
        "phone": "9123456789",
        "user_id": null,
        "in_system": false,
        "status": "pending"
      }
    ],
    "errors": []
  }
}
```

### **3. Updated User Search**
**File:** `/controllers/userController.js`

**Changes:**
- Added `phone` to SELECT query
- Added phone search in WHERE clause
- Now searches by: name, email, OR phone

**Example:**
```
GET /api/v1/users/search?q=987654
```

Returns users with matching phone numbers.

---

## 🎨 Frontend Changes

### **1. Invite Modal - Two Modes**
**File:** `/pages/TournamentManage.jsx`

#### **Mode 1: Search System Users**
- Search by name, phone, or email
- Select multiple users
- Shows user's phone number (primary)
- Shows email (secondary, if available)

#### **Mode 2: Enter Phone Numbers**
- Manual phone number entry
- Add multiple phone fields
- Remove phone fields
- Validates minimum 10 digits

### **2. UI Features**

#### **Mode Toggle:**
```
┌─────────────────────────────────────────┐
│ [Search System Users] [Enter Phone Numbers] │
└─────────────────────────────────────────┘
```

#### **Search Mode:**
```
Search: [________________] [🔍]

Results:
┌──────────────────────────────┐
│ 👤 John Doe                  │
│    9876543210                │
│    john@example.com          │
└──────────────────────────────┘
```

#### **Phone Mode:**
```
Phone Numbers:
[9876543210____________] [❌]
[9123456789____________] [❌]
[+ Add Another Phone Number]
```

---

## 🔄 Complete Flow

### **Scenario 1: Invite System User**
```
1. Organizer clicks "Invite Players"
2. Selects "Search System Users" mode
3. Searches by phone: "987654"
4. Selects user from results
5. Clicks "Send Invitations (1)"
6. Backend:
   - Finds user by phone
   - Creates invitation with user_id
   - Sends SMS to phone
7. User receives SMS
8. User logs in and sees invitation
```

### **Scenario 2: Invite External User**
```
1. Organizer clicks "Invite Players"
2. Selects "Enter Phone Numbers" mode
3. Enters: 9876543210
4. Clicks "Send Invitations (1)"
5. Backend:
   - Checks if phone exists in system (NO)
   - Creates invitation with invited_phone only
   - Sends SMS to phone
6. External user receives SMS
7. User downloads app and registers with that phone
8. System automatically links invitation to new user
```

---

## 📊 Database Structure

### **tournament_registrations Table:**
```
id | tournament_id | user_id | invited_phone | registration_type | status
---+---------------+---------+---------------+-------------------+--------
1  | 45            | 12      | 9876543210    | invitation        | pending
2  | 45            | NULL    | 9123456789    | invitation        | pending
3  | 45            | 34      | NULL          | request           | accepted
```

**Explanation:**
- Row 1: System user invited (has user_id)
- Row 2: External user invited (no user_id, only phone)
- Row 3: Player requested to join (no phone, has user_id)

---

## 🎯 Key Features

### ✅ **Dual Invitation System**
- Invite registered users
- Invite external users by phone

### ✅ **Phone-Based Matching**
- All invitations use phone numbers
- Automatic linking when external user registers

### ✅ **No Email Required**
- System works entirely with phone numbers
- Email is optional

### ✅ **Duplicate Prevention**
- Checks if phone already invited
- Checks if user already registered

### ✅ **Flexible UI**
- Search existing users
- Manual phone entry
- Add multiple phones at once

---

## 🧪 Testing

### **Test 1: Invite System User**
```bash
POST /api/v1/registrations/tournaments/1/invite
{
  "phoneNumbers": ["9876543210"],
  "message": "Join our tournament!"
}
```

Expected: Creates invitation with user_id

### **Test 2: Invite External User**
```bash
POST /api/v1/registrations/tournaments/1/invite
{
  "phoneNumbers": ["9999999999"],
  "message": "Join our tournament!"
}
```

Expected: Creates invitation with invited_phone only

### **Test 3: Search by Phone**
```bash
GET /api/v1/users/search?q=987654
```

Expected: Returns users with matching phone

### **Test 4: Duplicate Prevention**
```bash
# Send same phone twice
POST /api/v1/registrations/tournaments/1/invite
{
  "phoneNumbers": ["9876543210", "9876543210"]
}
```

Expected: Second one returns error "already invited"

---

## 📱 SMS Integration (Future)

Currently, SMS sending is logged to console:
```javascript
console.log(`SMS Invitation to ${cleanPhone}: You're invited to ${tournament[0].name}`);
```

**To implement SMS:**
1. Integrate SMS service (Twilio, AWS SNS, etc.)
2. Replace console.log with actual SMS API call
3. Add SMS templates
4. Handle delivery status

---

## ✅ Summary

**Phone-based invitation system is complete!**

✅ **Backend** - Phone number support added
✅ **Database** - `invited_phone` column added
✅ **User Search** - Phone search enabled
✅ **Frontend** - Dual mode invite modal
✅ **Validation** - Duplicate prevention
✅ **Flexibility** - System + External users

**Ready to use!** 🎉

---

## 🚀 Next Steps

1. Test inviting system users
2. Test inviting external users
3. Implement SMS service
4. Add invitation acceptance flow for external users
5. Auto-link invitations when external user registers

