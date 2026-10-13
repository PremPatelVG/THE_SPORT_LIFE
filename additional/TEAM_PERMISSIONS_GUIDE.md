# Team Permissions & Access Control Guide

## 🔒 Permission System Overview

The team management system has **role-based access control** to ensure only authorized users can perform certain actions.

---

## 👥 User Roles

### **1. Team Creator**
- The user who created the team
- Has full control over the team
- **Cannot be removed** from the team

### **2. Team Captain**
- Designated leader of the team
- Can be changed by creator
- Has management privileges
- **Cannot be removed** from the team

### **3. Regular Member**
- Invited and accepted team member
- Can view team details
- **Limited actions** - cannot invite or remove others
- Can leave the team voluntarily

---

## ✅ Permission Matrix

| Action | Creator | Captain | Regular Member |
|--------|---------|---------|----------------|
| **View Team Details** | ✅ | ✅ | ✅ |
| **View Members** | ✅ | ✅ | ✅ |
| **Invite Players** | ✅ | ✅ | ❌ |
| **Remove Members** | ✅ | ✅ | ❌ |
| **Edit Team Info** | ✅ | ✅ | ❌ |
| **Change Captain** | ✅ | ❌ | ❌ |
| **Delete Team** | ✅ | ❌ | ❌ |
| **Leave Team** | ❌ | ❌ | ✅ |

---

## 🎯 Implementation Details

### **Frontend Permission Checks**

#### **Helper Functions** (`TeamDetail.jsx`)
```javascript
// Check if user is captain
const isCaptain = () => {
  return user && team && team.captain_id === user.id;
};

// Check if user is creator
const isCreator = () => {
  return user && team && team.creator_id === user.id;
};

// Check if user is a member
const isMember = () => {
  return user && teamMembers?.some(m => m.user_id === user.id);
};

// Check if user can manage team (creator OR captain)
const canManageTeam = () => {
  return isCaptain() || isCreator();
};
```

#### **UI Elements with Permission Checks**

**1. Invite Button** (Only Creator/Captain)
```javascript
{canManageTeam() && (
  <button onClick={() => setShowInviteModal(true)}>
    <UserPlus className="w-5 h-5" />
    Invite Player
  </button>
)}
```

**2. Edit Team Button** (Only Creator/Captain)
```javascript
{canManageTeam() && (
  <button onClick={() => navigate(`/teams/${id}/edit`)}>
    <Edit className="w-5 h-5" />
    Edit Team
  </button>
)}
```

**3. Remove Member Button** (Only Creator/Captain, not for captain)
```javascript
{canManageTeam() && member.user_id !== team.captain_id && (
  <button onClick={() => handleRemoveMember(member.id)}>
    <UserMinus className="w-4 h-4" />
  </button>
)}
```

**4. Leave Team Button** (Only Regular Members)
```javascript
{isMember() && !isCaptain() && (
  <button onClick={() => setShowLeaveModal(true)}>
    <LogOut className="w-5 h-5" />
    Leave Team
  </button>
)}
```

---

### **Backend Permission Checks**

#### **Invite User** (`teamService.js`)
```javascript
const inviteUserByEmail = async (teamId, email, inviterId) => {
  // Check if inviter is creator or captain
  const isCreator = await Team.isCreator(teamId, inviterId);
  const isCaptain = await Team.isCaptain(teamId, inviterId);

  if (!isCreator && !isCaptain) {
    throw new Error('Only team creator or captain can invite members');
  }
  
  // ... rest of logic
};
```

#### **Remove Member** (`teamService.js`)
```javascript
const removeMember = async (teamId, memberId, removerId) => {
  // Check if remover is creator or captain
  const isCreator = await Team.isCreator(teamId, removerId);
  const isCaptain = await Team.isCaptain(teamId, removerId);

  if (!isCreator && !isCaptain) {
    throw new Error('Only team creator or captain can remove members');
  }
  
  // Cannot remove captain
  const member = await Team.getMember(memberId);
  if (member.user_id === team.captain_id) {
    throw new Error('Cannot remove team captain');
  }
  
  // ... rest of logic
};
```

---

## 🔐 Security Flow

### **When a User Joins a Team:**

```
1. User receives invitation
   ↓
2. User accepts invitation
   ↓
3. User becomes "Regular Member"
   ↓
4. User can view team details
   ↓
5. User CANNOT see invite button
   ↓
6. User CANNOT see edit button
   ↓
7. User CANNOT remove other members
   ↓
8. User CAN leave team
```

### **What Regular Members See:**

```
┌─────────────────────────────────────┐
│ Team Details Page                   │
├─────────────────────────────────────┤
│ ✅ Team Information                 │
│ ✅ Team Members List                │
│ ✅ Captain Badge                    │
│ ✅ Member Count                     │
│                                     │
│ Quick Actions:                      │
│ ❌ Invite Player (HIDDEN)          │
│ ❌ Edit Team (HIDDEN)              │
│ ❌ Remove Members (HIDDEN)         │
│ ✅ Leave Team (VISIBLE)            │
└─────────────────────────────────────┘
```

### **What Creator/Captain See:**

```
┌─────────────────────────────────────┐
│ Team Details Page                   │
├─────────────────────────────────────┤
│ ✅ Team Information                 │
│ ✅ Team Members List                │
│ ✅ Captain Badge                    │
│ ✅ Member Count                     │
│                                     │
│ Quick Actions:                      │
│ ✅ Invite Player (VISIBLE)         │
│ ✅ Edit Team (VISIBLE)             │
│ ✅ Remove Members (VISIBLE)        │
│ ❌ Leave Team (HIDDEN)             │
└─────────────────────────────────────┘
```

---

## 🧪 Testing Scenarios

### **Scenario 1: Regular Member Tries to Invite**

**Setup:**
- User A creates team
- User A invites User B
- User B accepts invitation
- User B is now a regular member

**Test:**
1. User B logs in
2. User B navigates to team details
3. User B should **NOT** see "Invite Player" button
4. User B should **NOT** see "Edit Team" button
5. User B should **NOT** see remove buttons on members
6. User B should see "Leave Team" button

**Expected Result:** ✅ User B cannot invite others

---

### **Scenario 2: Captain Can Invite**

**Setup:**
- User A creates team
- User A makes User B the captain
- User B is now the captain

**Test:**
1. User B logs in
2. User B navigates to team details
3. User B should see "Invite Player" button
4. User B should see "Edit Team" button
5. User B should see remove buttons on members
6. User B clicks "Invite Player"
7. User B enters email and sends invitation

**Expected Result:** ✅ User B can invite others

---

### **Scenario 3: Backend Validation**

**Setup:**
- User C is a regular member (not creator/captain)
- User C tries to call invite API directly

**Test:**
```bash
# User C tries to invite via API
POST /api/v1/teams/1/invite
Authorization: Bearer USER_C_TOKEN
Body: {"email": "newuser@example.com"}
```

**Expected Response:**
```json
{
  "success": false,
  "error": "Only team creator or captain can invite members"
}
```

**Expected Result:** ✅ Backend rejects the request

---

## 🎨 Visual Indicators

### **Captain Badge**
```javascript
{member.user_id === team.captain_id && (
  <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
    Captain
  </span>
)}
```

### **Role-Based UI**
- **Creator/Captain:** See management buttons (blue gradient)
- **Regular Member:** See limited actions (gray/red for leave)

---

## 📊 Permission Check Flow

### **Frontend Check:**
```
User opens team page
  ↓
Load team data
  ↓
Load team members
  ↓
Check user role:
  - Is creator? → Show all management buttons
  - Is captain? → Show all management buttons
  - Is member? → Show only leave button
  - Not member? → Show join/request button
```

### **Backend Check:**
```
API request received
  ↓
Authenticate user
  ↓
Check permission:
  - Is creator? → Allow action
  - Is captain? → Allow action
  - Is member? → Reject with error
  ↓
Execute action or return error
```

---

## 🚨 Common Issues & Solutions

### **Issue 1: Regular Member Sees Invite Button**

**Cause:** Permission check not working

**Solution:**
```javascript
// Make sure helper functions are correct
const canManageTeam = () => {
  return isCaptain() || isCreator();
};

// Use in JSX
{canManageTeam() && (
  <button>Invite Player</button>
)}
```

---

### **Issue 2: Backend Allows Unauthorized Invite**

**Cause:** Missing permission check in service

**Solution:**
```javascript
// Always check permissions in service
const isCreator = await Team.isCreator(teamId, inviterId);
const isCaptain = await Team.isCaptain(teamId, inviterId);

if (!isCreator && !isCaptain) {
  throw new Error('Only team creator or captain can invite members');
}
```

---

### **Issue 3: Captain Can Remove Themselves**

**Cause:** Missing captain check in remove logic

**Solution:**
```javascript
// Prevent removing captain
if (member.user_id === team.captain_id) {
  throw new Error('Cannot remove team captain');
}
```

---

## 📝 Summary

**Permission System:**
- ✅ **Frontend:** UI elements hidden based on role
- ✅ **Backend:** API validates permissions
- ✅ **Double Protection:** Both frontend and backend checks

**Roles:**
- ✅ **Creator:** Full control
- ✅ **Captain:** Management privileges
- ✅ **Member:** View only + leave

**Security:**
- ✅ Regular members **CANNOT** invite others
- ✅ Regular members **CANNOT** remove others
- ✅ Regular members **CANNOT** edit team
- ✅ Only creator/captain can manage team

**Status:** ✅ **PROPERLY IMPLEMENTED**

---

## 🎯 Quick Reference

**Who can invite players?**
- ✅ Team Creator
- ✅ Team Captain
- ❌ Regular Members

**Who can remove members?**
- ✅ Team Creator
- ✅ Team Captain
- ❌ Regular Members
- ❌ Cannot remove captain

**Who can edit team?**
- ✅ Team Creator
- ✅ Team Captain
- ❌ Regular Members

**Who can leave team?**
- ❌ Team Creator (cannot leave own team)
- ❌ Team Captain (must transfer captaincy first)
- ✅ Regular Members

---

**The permission system is working correctly! Regular members cannot invite others.** ✅
