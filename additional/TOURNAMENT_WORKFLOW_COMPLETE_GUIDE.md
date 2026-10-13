# 🏆 Tournament Management System - Complete Workflow Guide

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [Tournament Creation Flow](#tournament-creation-flow)
3. [Player Invitation System](#player-invitation-system)
4. [Registration & Acceptance Flow](#registration--acceptance-flow)
5. [Player Locking Mechanism](#player-locking-mechanism)
6. [Tournament Types](#tournament-types)
7. [Database Schema](#database-schema)
8. [API Endpoints](#api-endpoints)
9. [Frontend Components](#frontend-components)

---

## 🎯 System Overview

The tournament management system supports two types of tournaments:
- **OPEN Tournaments**: Anyone can request to join
- **CLOSED Tournaments**: Invitation-only (organizer must invite players)

### Key Concepts:
- **Registration Types**: `request` (player initiated) or `invitation` (organizer initiated)
- **Registration Status**: `pending` → `accepted` → `locked`
- **Player Locking**: Finalizes a player for the tournament (cannot be changed)

---

## 🏗️ Tournament Creation Flow

### Step 1: Organizer Creates Tournament

**Frontend:** `/pages/CreateTournament.jsx`

**Form Fields:**
```javascript
{
  name: 'Tournament Name',
  description: 'Description',
  logo_url: 'Logo URL',
  sport_id: 1,
  venue_id: 2,
  start_date: '2025-11-10',
  end_date: '2025-11-15',
  registration_start: '2025-11-01',
  registration_end: '2025-11-08',
  max_participants: 32,
  entry_fee: 500,
  prize_money: 10000,
  format_type: 'knockout',
  category: 'singles',
  tournament_type: 'open', // or 'closed'
  match_config: { /* sport-specific config */ }
}
```

**API Call:**
```
POST /api/v1/tournaments
```

**Backend:** `tournamentController.createTournament()`

**Database:**
```sql
INSERT INTO tournaments (name, sport_id, organizer_id, tournament_type, status, ...)
VALUES (?, ?, ?, 'open', 'draft', ...)
```

**Tournament Status Lifecycle:**
```
draft → open → ongoing → completed
```

---

## 📨 Player Invitation System

### Two Invitation Methods:

#### Method 1: Search System Users
**Frontend:** `InvitePlayersModal` (Search Mode)

1. Organizer searches by name/phone/email
2. Selects players from search results
3. Sends invitations

**API Call:**
```
POST /api/v1/registrations/tournaments/:tournamentId/invite
{
  "phoneNumbers": ["9876543210", "9123456789"],
  "message": "You're invited to participate!"
}
```

#### Method 2: Enter Phone Numbers
**Frontend:** `InvitePlayersModal` (Phone Mode)

1. Organizer manually enters phone numbers
2. Can add multiple phone fields
3. Sends invitations to external users (not in system)

**API Call:** Same as above

**Backend Process:** `registrationController.invitePlayers()`

```javascript
For each phone number:
  1. Clean phone number (remove spaces, dashes)
  2. Check if user exists in system by phone
  3. If user exists:
     - Create invitation with user_id
     - Check for duplicate registration
  4. If user NOT exists:
     - Create invitation with invited_phone only
     - User can register later with this phone
  5. Send SMS invitation
```

**Database:**
```sql
INSERT INTO tournament_registrations 
(tournament_id, user_id, invited_phone, registration_type, status, created_by)
VALUES (?, ?, ?, 'invitation', 'pending', ?)
```

**SMS Notification:**
```
"You're invited to participate in 'Tournament Name'! 
Join us for an exciting tournament."
```

---

## ✅ Registration & Acceptance Flow

### Flow 1: OPEN Tournament (Player Requests to Join)

**Player Side:**
```
1. Player views tournament details
2. Clicks "Register" button
3. Submits registration request
```

**API Call:**
```
POST /api/v1/registrations/tournaments/:tournamentId/request
{
  "notes": "I'm excited to participate!"
}
```

**Backend:** `registrationController.requestToJoin()`

**Validations:**
- Tournament must be OPEN type
- Registration period must be active
- Player not already registered
- Tournament not full

**Database:**
```sql
INSERT INTO tournament_registrations 
(tournament_id, user_id, registration_type, status, created_by)
VALUES (?, ?, 'request', 'pending', ?)
```

**Organizer Notification:**
```
SMS to Organizer: "A player has requested to join your tournament 'Tournament Name'. 
Please review the request."
```

---

### Flow 2: Organizer Reviews Requests

**Frontend:** `/pages/TournamentManage.jsx`

**Organizer Views:**
- Pending requests
- Accepted players
- Rejected requests
- Locked players

**API Call:**
```
GET /api/v1/registrations/tournaments/:tournamentId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "all": [...],
    "grouped": {
      "pending": [...],
      "accepted": [...],
      "rejected": [...],
      "locked": [...]
    },
    "counts": {
      "total": 25,
      "pending": 5,
      "accepted": 15,
      "locked": 3,
      "rejected": 2
    }
  }
}
```

---

### Flow 3: Organizer Accepts/Rejects Request

**Accept Request:**
```
PUT /api/v1/registrations/tournaments/:tournamentId/:registrationId/accept
```

**Backend:** `registrationController.acceptRegistration()`

**Database:**
```sql
UPDATE tournament_registrations 
SET status = 'accepted', responded_at = NOW() 
WHERE id = ?
```

**Player Notification:**
```
SMS: "Hi [Player], Your registration for 'Tournament Name' has been accepted! 
We look forward to seeing you at the tournament."
```

**Reject Request:**
```
PUT /api/v1/registrations/tournaments/:tournamentId/:registrationId/reject
{
  "reason": "Tournament is full"
}
```

**Player Notification:**
```
SMS: "Hi [Player], Your registration for 'Tournament Name' has been rejected. 
Reason: Tournament is full"
```

---

### Flow 4: Player Responds to Invitation

**Player Side:**
```
1. Player receives SMS invitation
2. Logs into app
3. Views "My Invitations"
4. Accepts or Declines
```

**API Call:**
```
PUT /api/v1/registrations/invitations/:invitationId/respond
{
  "accept": true  // or false
}
```

**Backend:** `registrationController.respondToInvitation()`

**Database:**
```sql
UPDATE tournament_registrations 
SET status = 'accepted', responded_at = NOW()  -- or 'declined'
WHERE id = ?
```

**Organizer Notification:**
```
SMS: "Hi [Organizer], A player has accepted your invitation to 'Tournament Name'."
```

---

## 🔒 Player Locking Mechanism

### What is Player Locking?

**Player Locking** finalizes a player for the tournament. Once locked:
- Player is confirmed for the tournament
- Player can be assigned to teams
- Player cannot be removed (unless unlocked first)
- Player is counted in participant count

### When to Lock Players?

- After registration deadline
- Before team formation
- Before bracket generation
- When finalizing tournament roster

---

### Lock Player Flow

**Frontend:** `TournamentManage.jsx` → "Lock Player" button

**API Call:**
```
PUT /api/v1/registrations/tournaments/:tournamentId/:registrationId/lock
```

**Backend:** `registrationController.lockPlayer()`

**Validations:**
- User must be organizer
- Registration status must be 'accepted'
- Cannot lock pending/rejected registrations

**Database:**
```sql
UPDATE tournament_registrations 
SET status = 'locked', locked_at = NOW() 
WHERE id = ?
```

**Status Transition:**
```
pending → accepted → locked
```

---

### Unlock Player Flow

**API Call:**
```
PUT /api/v1/registrations/tournaments/:tournamentId/:registrationId/unlock
```

**Backend:** `registrationController.unlockPlayer()`

**Validations:**
- User must be organizer
- Registration status must be 'locked'
- Player must NOT be assigned to a team

**Database:**
```sql
UPDATE tournament_registrations 
SET status = 'accepted', locked_at = NULL 
WHERE id = ?
```

**Important:** Cannot unlock if player is already in a team!

---

## 🎭 Tournament Types

### OPEN Tournament

**Characteristics:**
- Anyone can request to join
- Organizer reviews and accepts/rejects
- Public visibility
- Self-registration enabled

**Flow:**
```
Player → Request to Join → Organizer Reviews → Accept/Reject → Lock
```

**Use Cases:**
- Public tournaments
- Community events
- Open championships

---

### CLOSED Tournament

**Characteristics:**
- Invitation-only
- Organizer controls all participants
- Private tournament
- No self-registration

**Flow:**
```
Organizer → Send Invitations → Player Accepts/Declines → Lock
```

**Use Cases:**
- Private tournaments
- Corporate events
- Invitational championships

---

## 📊 Database Schema

### tournament_registrations Table

```sql
CREATE TABLE tournament_registrations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tournament_id INT NOT NULL,
    user_id INT NULL,                    -- NULL if external user
    invited_phone VARCHAR(20) NULL,      -- For external users
    
    -- Type & Status
    registration_type ENUM('request', 'invitation') NOT NULL,
    status ENUM('pending', 'accepted', 'rejected', 'declined', 'locked') DEFAULT 'pending',
    
    -- Timestamps
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP NULL,
    locked_at TIMESTAMP NULL,
    
    -- Metadata
    notes TEXT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    
    -- Constraints
    UNIQUE KEY unique_tournament_user (tournament_id, user_id)
);
```

### Status Flow Diagram

```
┌─────────┐
│ pending │ ← Initial state (request or invitation sent)
└────┬────┘
     │
     ├─→ accepted  ← Organizer accepts OR player accepts invitation
     │      │
     │      └─→ locked ← Organizer locks player (finalized)
     │
     ├─→ rejected  ← Organizer rejects request
     │
     └─→ declined  ← Player declines invitation
```

---

## 🔌 API Endpoints

### Registration Endpoints

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| POST | `/registrations/tournaments/:id/request` | Player requests to join OPEN tournament | Player |
| POST | `/registrations/tournaments/:id/invite` | Organizer invites players | Organizer |
| GET | `/registrations/tournaments/:id` | Get all registrations | Organizer |
| PUT | `/registrations/tournaments/:id/:regId/accept` | Accept registration | Organizer |
| PUT | `/registrations/tournaments/:id/:regId/reject` | Reject registration | Organizer |
| PUT | `/registrations/tournaments/:id/:regId/lock` | Lock player | Organizer |
| PUT | `/registrations/tournaments/:id/:regId/unlock` | Unlock player | Organizer |
| PUT | `/registrations/invitations/:id/respond` | Accept/decline invitation | Player |
| GET | `/registrations/my-invitations` | Get player's invitations | Player |
| GET | `/registrations/my-registrations` | Get player's registrations | Player |
| POST | `/registrations/tournaments/:id/organizer-join` | Organizer joins own tournament | Organizer |

---

## 🎨 Frontend Components

### 1. CreateTournament.jsx
- Tournament creation form
- Sport selection with dynamic config
- Venue selection with availability check
- Logo upload
- Match configuration

### 2. TournamentManage.jsx
- Tournament management dashboard
- Player registration management
- Invite players modal
- Accept/reject requests
- Lock/unlock players
- View participant lists

### 3. InvitePlayersModal Component
- Two modes: Search users OR Enter phone numbers
- Search system users by name/phone/email
- Manual phone number entry
- Custom invitation message
- SMS notification

### 4. Tournaments.jsx
- Tournament listing page
- Search and filter tournaments
- View tournament cards
- Navigate to tournament details

---

## 🔄 Complete User Journeys

### Journey 1: Organizer Creates OPEN Tournament

```
1. Organizer → Create Tournament
2. Fill form (name, dates, venue, etc.)
3. Set tournament_type = 'open'
4. Submit → Tournament created (status: draft)
5. Publish tournament → Status changes to 'open'
6. Players can now request to join
```

---

### Journey 2: Player Joins OPEN Tournament

```
1. Player → Browse Tournaments
2. Find tournament → View Details
3. Click "Register"
4. Submit request → Status: pending
5. Organizer receives SMS notification
6. Organizer reviews → Accepts request
7. Player receives SMS: "Registration accepted"
8. Player status: accepted
9. Organizer locks player before tournament starts
10. Player status: locked (finalized)
```

---

### Journey 3: Organizer Creates CLOSED Tournament

```
1. Organizer → Create Tournament
2. Set tournament_type = 'closed'
3. Submit → Tournament created
4. Click "Invite Players"
5. Search users OR enter phone numbers
6. Select players → Send invitations
7. Players receive SMS invitations
8. Players accept/decline
9. Organizer locks accepted players
```

---

### Journey 4: External User Receives Invitation

```
1. Organizer invites phone: +919876543210
2. External user receives SMS
3. User downloads app
4. User registers with phone: +919876543210
5. System auto-links invitation to new user
6. User sees invitation in "My Invitations"
7. User accepts invitation
8. Organizer locks player
```

---

## 🎯 Key Features Summary

### ✅ Dual Tournament Types
- OPEN: Self-registration with approval
- CLOSED: Invitation-only

### ✅ Phone-Based Invitations
- Invite system users
- Invite external users by phone
- Auto-linking when external user registers

### ✅ Registration Management
- Accept/reject requests
- View all registrations grouped by status
- Filter by status and type

### ✅ Player Locking
- Finalize players for tournament
- Prevent changes after locking
- Cannot unlock if player in team

### ✅ SMS Notifications
- Invitation sent
- Request received
- Request accepted/rejected
- Invitation accepted/declined

### ✅ Organizer Self-Registration
- Organizer can join own tournament
- Auto-locked status
- Separate registration type: 'self'

---

## 🚀 Future Enhancements

1. **Bulk Operations**
   - Bulk accept/reject
   - Bulk lock/unlock
   - Export participant list

2. **Advanced Filtering**
   - Filter by skill level
   - Filter by registration date
   - Filter by payment status

3. **Payment Integration**
   - Entry fee payment
   - Payment verification
   - Refund management

4. **Waitlist Management**
   - Auto-accept from waitlist
   - Waitlist notifications
   - Priority ordering

5. **Team Formation**
   - Auto-team creation from locked players
   - Team balancing algorithms
   - Captain selection

---

## 📝 Notes for Developers

### Important Validations:
1. Always check tournament_type before allowing requests
2. Verify organizer ownership before modifications
3. Check registration period before accepting requests
4. Prevent duplicate registrations (unique constraint)
5. Cannot unlock player if assigned to team

### Database Indexes:
- `idx_tournament_registrations_tournament` - Fast tournament lookups
- `idx_tournament_registrations_user` - Fast user lookups
- `idx_tournament_registrations_status` - Fast status filtering
- `unique_tournament_user` - Prevent duplicates

### SMS Integration:
- Currently using Twilio (configurable)
- Falls back to console.log if not configured
- SMS templates in controller
- Async sending (doesn't block response)

---

## ✅ System Status: COMPLETE & PRODUCTION READY

All tournament creation, invitation, registration, and player locking flows are fully implemented and tested! 🎉
