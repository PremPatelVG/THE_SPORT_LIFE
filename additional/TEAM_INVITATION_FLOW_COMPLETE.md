# Team Invitation Flow - Complete Module-by-Module Documentation

## 🎯 Overview

Complete team invitation and member management system with proper validation, authorization, and user flows.

---

## 📊 Database Schema

### **team_invitations Table**
```sql
CREATE TABLE team_invitations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    team_id INT NOT NULL,
    invited_user_id INT NOT NULL,
    invited_by INT NOT NULL,
    status ENUM('pending', 'accepted', 'rejected', 'cancelled') DEFAULT 'pending',
    invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP,
    
    UNIQUE KEY unique_team_invitation (team_id, invited_user_id),
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (invited_by) REFERENCES users(id)
);
```

### **team_members Table**
```sql
CREATE TABLE team_members (
    id INT PRIMARY KEY AUTO_INCREMENT,
    team_id INT NOT NULL,
    user_id INT NOT NULL,
    position VARCHAR(50),
    jersey_number INT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    UNIQUE KEY unique_team_member (team_id, user_id),
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## 🔄 Complete Invitation Flow

### **Flow Diagram**
```
Captain/Creator                    Invited User
      │                                  │
      ├─► Send Invitation                │
      │   (POST /teams/:id/invite)       │
      │                                  │
      │   Invitation Created ────────────►│
      │   status: 'pending'              │
      │                                  │
      │                                  ├─► View Invitations
      │                                  │   (GET /teams/invitations/my)
      │                                  │
      │                                  ├─► Accept Invitation
      │                                  │   (POST /invitations/:id/accept)
      │                                  │
      │◄──── Member Added ───────────────┤
      │     status: 'accepted'           │
      │     team_members created         │
      │                                  │
      ├─► View Team Members              │
      │   (GET /teams/:id)               │
```

---

## 📋 Module 1: Backend - Team Model

### **File:** `src/models/Team.js`

#### **Key Functions:**

##### 1. Invitation Management
```javascript
// Create invitation
const createInvitation = async (teamId, invitedUserId, invitedBy)

// Get team invitations
const getInvitations = async (teamId)

// Get user's invitations
const getUserInvitations = async (userId, status)

// Update invitation status
const updateInvitationStatus = async (invitationId, status)

// Cancel invitation
const cancelInvitation = async (invitationId)
```

##### 2. Member Management
```javascript
// Add member to team
const addMember = async (teamId, userId, memberData)

// Remove member from team
const removeMember = async (teamId, userId)

// Update member details
const updateMember = async (teamId, userId, updateData)

// Check if user is member
const isMember = async (teamId, userId)
```

##### 3. Authorization Checks
```javascript
// Check if user is creator
const isCreator = async (teamId, userId)

// Check if user is captain
const isCaptain = async (teamId, userId)

// Check if team is full
const isFull = async (teamId)
```

---

## 📋 Module 2: Backend - Team Service

### **File:** `src/services/teamService.js`

#### **Invitation Functions:**

##### 1. **inviteUser()**
```javascript
const inviteUser = async (teamId, invitedUserId, invitedBy) => {
  // Validation:
  // 1. Check if inviter is captain or creator
  // 2. Check if team exists
  // 3. Check if team is not full
  // 4. Check if user is not already a member
  // 5. Check if invitation doesn't already exist
  // 6. Check if user exists
  
  // Create invitation with status 'pending'
  // Return invitation details
};
```

**Validations:**
- ✅ Only captain or creator can invite
- ✅ Team must exist and not be deleted
- ✅ Team must not be full
- ✅ User must not already be a member
- ✅ No duplicate pending invitations
- ✅ Invited user must exist

##### 2. **acceptInvitation()**
```javascript
const acceptInvitation = async (invitationId, userId) => {
  // Validation:
  // 1. Check if invitation exists
  // 2. Check if invitation is for this user
  // 3. Check if invitation status is 'pending'
  // 4. Check if team is not full
  // 5. Check if user is not already a member
  
  // Transaction:
  // 1. Update invitation status to 'accepted'
  // 2. Add user to team_members
  // 3. Set responded_at timestamp
  
  // Return team details
};
```

**Validations:**
- ✅ Invitation must exist
- ✅ Only invited user can accept
- ✅ Invitation must be 'pending'
- ✅ Team must not be full
- ✅ User not already a member

##### 3. **rejectInvitation()**
```javascript
const rejectInvitation = async (invitationId, userId) => {
  // Validation:
  // 1. Check if invitation exists
  // 2. Check if invitation is for this user
  // 3. Check if invitation status is 'pending'
  
  // Update invitation status to 'rejected'
  // Set responded_at timestamp
};
```

##### 4. **cancelInvitation()**
```javascript
const cancelInvitation = async (invitationId, userId) => {
  // Validation:
  // 1. Check if invitation exists
  // 2. Check if user is captain or creator
  // 3. Check if invitation status is 'pending'
  
  // Update invitation status to 'cancelled'
};
```

---

## 📋 Module 3: Backend - Team Controller

### **File:** `src/controllers/teamController.js`

#### **API Endpoints:**

##### 1. **Invite User**
```
POST /api/v1/teams/:id/invite
Auth: Required
Body: { user_id: number }
```

**Response:**
```json
{
  "success": true,
  "message": "Invitation sent successfully",
  "data": {
    "id": 1,
    "team_id": 5,
    "invited_user_id": 10,
    "invited_by": 2,
    "status": "pending",
    "invited_at": "2024-11-17T10:00:00.000Z"
  }
}
```

##### 2. **Get Team Invitations**
```
GET /api/v1/teams/:id/invitations
Auth: Required (Captain/Creator only)
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "team_id": 5,
      "invited_user_id": 10,
      "invited_user_name": "John Doe",
      "invited_user_email": "john@example.com",
      "invited_by": 2,
      "inviter_name": "Jane Smith",
      "status": "pending",
      "invited_at": "2024-11-17T10:00:00.000Z"
    }
  ]
}
```

##### 3. **Get My Invitations**
```
GET /api/v1/teams/invitations/my?status=pending
Auth: Required
Query: status (optional): 'pending' | 'accepted' | 'rejected'
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "team_id": 5,
      "team_name": "Thunder Strikers",
      "tournament_name": "City Football Championship",
      "invited_by": 2,
      "inviter_name": "Jane Smith",
      "status": "pending",
      "invited_at": "2024-11-17T10:00:00.000Z"
    }
  ]
}
```

##### 4. **Accept Invitation**
```
POST /api/v1/teams/invitations/:id/accept
Auth: Required
```

**Response:**
```json
{
  "success": true,
  "message": "Invitation accepted successfully",
  "data": {
    "id": 5,
    "name": "Thunder Strikers",
    "member_count": 6
  }
}
```

##### 5. **Reject Invitation**
```
POST /api/v1/teams/invitations/:id/reject
Auth: Required
```

##### 6. **Cancel Invitation**
```
DELETE /api/v1/teams/invitations/:id
Auth: Required (Captain/Creator only)
```

---

## 📋 Module 4: Backend - Routes

### **File:** `src/routes/team.routes.js`

```javascript
// Team invitations
router.post('/:id/invite', auth, inviteValidation, teamController.inviteUser);
router.get('/:id/invitations', auth, teamController.getTeamInvitations);

// User invitations
router.get('/invitations/my', auth, teamController.getMyInvitations);
router.post('/invitations/:id/accept', auth, teamController.acceptInvitation);
router.post('/invitations/:id/reject', auth, teamController.rejectInvitation);
router.delete('/invitations/:id', auth, teamController.cancelInvitation);

// Member management
router.delete('/:id/members/:memberId', auth, teamController.removeMember);
router.put('/:id/members/:memberId', auth, teamController.updateMember);
```

---

## 📋 Module 5: Frontend - Team Service

### **File:** `src/services/teamService.js`

```javascript
// Invite user to team
export const inviteUser = async (teamId, userId) => {
  const response = await api.post(`/teams/${teamId}/invite`, { user_id: userId });
  return response.data.data;
};

// Get team invitations
export const getTeamInvitations = async (teamId) => {
  const response = await api.get(`/teams/${teamId}/invitations`);
  return response.data.data;
};

// Get my invitations
export const getMyInvitations = async (status = null) => {
  const url = status ? `/teams/invitations/my?status=${status}` : '/teams/invitations/my';
  const response = await api.get(url);
  return response.data.data;
};

// Accept invitation
export const acceptInvitation = async (invitationId) => {
  const response = await api.post(`/teams/invitations/${invitationId}/accept`);
  return response.data.data;
};

// Reject invitation
export const rejectInvitation = async (invitationId) => {
  const response = await api.post(`/teams/invitations/${invitationId}/reject`);
  return response.data;
};

// Cancel invitation
export const cancelInvitation = async (invitationId) => {
  const response = await api.delete(`/teams/invitations/${invitationId}`);
  return response.data;
};
```

---

## 🎯 Complete User Flows

### **Flow 1: Captain Invites Member**

```
Step 1: Captain views team detail page
  GET /teams/:id
  
Step 2: Captain clicks "Invite Member"
  Opens invite modal
  
Step 3: Captain searches/selects user
  Search users by name/email
  
Step 4: Captain sends invitation
  POST /teams/:id/invite
  Body: { user_id: 10 }
  
Step 5: System validates:
  ✓ Captain has permission
  ✓ Team not full
  ✓ User not already member
  ✓ No duplicate invitation
  
Step 6: Invitation created
  status: 'pending'
  Notification sent to user
  
Step 7: Captain sees pending invitation
  In team invitations list
```

### **Flow 2: User Accepts Invitation**

```
Step 1: User receives notification
  Email/Push notification
  
Step 2: User views invitations
  GET /teams/invitations/my
  
Step 3: User sees invitation details
  Team name, tournament, inviter
  
Step 4: User clicks "Accept"
  POST /teams/invitations/:id/accept
  
Step 5: System validates:
  ✓ Invitation exists
  ✓ User is invited user
  ✓ Invitation is pending
  ✓ Team not full
  
Step 6: Transaction executes:
  1. Update invitation → 'accepted'
  2. Add to team_members
  3. Set responded_at
  
Step 7: User is now team member
  Can view team details
  Appears in team roster
```

### **Flow 3: User Rejects Invitation**

```
Step 1: User views invitations
  GET /teams/invitations/my
  
Step 2: User clicks "Reject"
  POST /teams/invitations/:id/reject
  
Step 3: Invitation status → 'rejected'
  responded_at set
  
Step 4: Captain sees rejection
  In team invitations list
```

### **Flow 4: Captain Cancels Invitation**

```
Step 1: Captain views team invitations
  GET /teams/:id/invitations
  
Step 2: Captain clicks "Cancel" on pending invitation
  DELETE /teams/invitations/:id
  
Step 3: Invitation status → 'cancelled'
  
Step 4: User no longer sees invitation
  Removed from pending list
```

---

## ✅ Validation Rules

### **Invitation Creation**
- ✅ Only captain or creator can invite
- ✅ Team must exist
- ✅ Team must not be deleted
- ✅ Team must not be full (member_count < max_players)
- ✅ Invited user must exist
- ✅ Invited user must not be current member
- ✅ No duplicate pending invitation (unique constraint)
- ✅ Cannot invite self

### **Invitation Acceptance**
- ✅ Invitation must exist
- ✅ Only invited user can accept
- ✅ Invitation must be 'pending'
- ✅ Team must not be full
- ✅ User must not already be member
- ✅ Team must not be deleted

### **Invitation Rejection**
- ✅ Invitation must exist
- ✅ Only invited user can reject
- ✅ Invitation must be 'pending'

### **Invitation Cancellation**
- ✅ Invitation must exist
- ✅ Only captain or creator can cancel
- ✅ Invitation must be 'pending'

### **Member Removal**
- ✅ Only captain or creator can remove
- ✅ Cannot remove captain (must transfer first)
- ✅ Cannot remove self if captain (must transfer first)
- ✅ Member must exist

---

## 🔒 Authorization Matrix

| Action | Creator | Captain | Member | Invited User | Other |
|--------|---------|---------|--------|--------------|-------|
| Invite User | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Team Invitations | ✅ | ✅ | ❌ | ❌ | ❌ |
| Cancel Invitation | ✅ | ✅ | ❌ | ❌ | ❌ |
| Accept Invitation | ❌ | ❌ | ❌ | ✅ | ❌ |
| Reject Invitation | ❌ | ❌ | ❌ | ✅ | ❌ |
| Remove Member | ✅ | ✅ | ❌ | ❌ | ❌ |
| Update Member | ✅ | ✅ | ❌ | ❌ | ❌ |
| Change Captain | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete Team | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 🎨 Frontend Components Needed

### **1. InviteMemberModal**
- Search users
- Select user
- Send invitation
- Show success/error

### **2. TeamInvitationsList**
- Show pending invitations
- Cancel invitation option
- Resend invitation option

### **3. MyInvitationsPage**
- List all invitations
- Filter by status
- Accept/Reject actions
- Show team details

### **4. TeamMembersList**
- Show all members
- Member roles (Captain, Member)
- Remove member option
- Update member details

---

## 📊 Database Queries

### **Get Pending Invitations for User**
```sql
SELECT 
  ti.*,
  t.name as team_name,
  tour.name as tournament_name,
  inviter.first_name as inviter_first_name,
  inviter.last_name as inviter_last_name
FROM team_invitations ti
JOIN teams t ON ti.team_id = t.id
JOIN tournaments tour ON t.tournament_id = tour.id
JOIN users inviter ON ti.invited_by = inviter.id
WHERE ti.invited_user_id = ?
  AND ti.status = 'pending'
ORDER BY ti.invited_at DESC
```

### **Get Team Invitations**
```sql
SELECT 
  ti.*,
  invited.first_name as invited_first_name,
  invited.last_name as invited_last_name,
  invited.email as invited_email,
  inviter.first_name as inviter_first_name,
  inviter.last_name as inviter_last_name
FROM team_invitations ti
JOIN users invited ON ti.invited_user_id = invited.id
JOIN users inviter ON ti.invited_by = inviter.id
WHERE ti.team_id = ?
ORDER BY ti.invited_at DESC
```

---

## 🚀 Next Steps

1. ✅ Backend already implemented
2. ⏳ Create frontend components
3. ⏳ Add notification system
4. ⏳ Add email notifications
5. ⏳ Add real-time updates

---

**Status**: Backend Complete ✅ | Frontend Pending ⏳
**Version**: 1.0.0
**Last Updated**: November 2024
