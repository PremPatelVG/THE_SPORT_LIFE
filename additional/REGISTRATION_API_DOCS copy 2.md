# Tournament Registration API Documentation

## 📋 Overview

Complete API documentation for tournament registration and invitation system.

---

## 🔐 Authentication

All endpoints require authentication via JWT token:
```
Authorization: Bearer <access_token>
```

---

## 📍 API Endpoints

### 1. Request to Join Tournament (OPEN)

**Endpoint:** `POST /api/v1/registrations/tournaments/:tournamentId/request`

**Description:** Player requests to join an OPEN tournament

**Access:** Private (Any authenticated player)

**Request Body:**
```json
{
  "notes": "I'm a skilled player with 5 years experience" // Optional
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Registration request submitted successfully",
  "data": {
    "id": 123,
    "tournament_id": 45,
    "status": "pending"
  }
}
```

**Error Responses:**
- `404`: Tournament not found
- `400`: Tournament is closed (invitation only)
- `400`: Registration period ended
- `400`: Already registered

---

### 2. Invite Players (CLOSED)

**Endpoint:** `POST /api/v1/registrations/tournaments/:tournamentId/invite`

**Description:** Organizer invites specific players to CLOSED tournament

**Access:** Private (Organizer only)

**Request Body:**
```json
{
  "playerIds": [12, 34, 56, 78],
  "message": "You're invited to our championship!" // Optional
}
```

**Success Response (201):**
```json
{
  "success": true,
  "message": "Invitations sent to 4 player(s)",
  "data": {
    "invitations": [
      {
        "id": 201,
        "player_id": 12,
        "status": "pending"
      },
      {
        "id": 202,
        "player_id": 34,
        "status": "pending"
      }
    ],
    "errors": [
      {
        "playerId": 56,
        "error": "Player already invited/registered"
      }
    ]
  }
}
```

**Error Responses:**
- `404`: Tournament not found or not organizer
- `400`: Tournament is open (players can request directly)
- `400`: No player IDs provided

---

### 3. Get Tournament Registrations

**Endpoint:** `GET /api/v1/registrations/tournaments/:tournamentId`

**Description:** Get all registrations for a tournament (grouped by status)

**Access:** Private (Organizer only)

**Query Parameters:**
- `status` (optional): Filter by status (pending, accepted, rejected, declined, locked)
- `type` (optional): Filter by type (request, invitation)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "all": [...], // All registrations
    "grouped": {
      "locked": [
        {
          "id": 123,
          "tournament_id": 45,
          "user_id": 12,
          "first_name": "John",
          "last_name": "Doe",
          "email": "john@example.com",
          "profile_image": "...",
          "skill_level": "intermediate",
          "registration_type": "request",
          "status": "locked",
          "requested_at": "2024-11-01T10:00:00Z",
          "responded_at": "2024-11-02T14:30:00Z",
          "locked_at": "2024-11-03T09:00:00Z",
          "notes": "Experienced player"
        }
      ],
      "accepted": [...],
      "pending": [...],
      "rejected": [...],
      "declined": [...]
    },
    "counts": {
      "total": 25,
      "locked": 12,
      "accepted": 5,
      "pending": 3,
      "rejected": 3,
      "declined": 2
    }
  }
}
```

**Error Responses:**
- `404`: Tournament not found
- `403`: Not the organizer

---

### 4. Accept Registration

**Endpoint:** `PUT /api/v1/registrations/tournaments/:tournamentId/:registrationId/accept`

**Description:** Organizer accepts a pending registration

**Access:** Private (Organizer only)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Registration accepted successfully",
  "data": {
    "id": 123,
    "status": "accepted"
  }
}
```

**Error Responses:**
- `404`: Tournament or registration not found
- `400`: Cannot accept registration with current status

---

### 5. Reject Registration

**Endpoint:** `PUT /api/v1/registrations/tournaments/:tournamentId/:registrationId/reject`

**Description:** Organizer rejects a pending registration

**Access:** Private (Organizer only)

**Request Body:**
```json
{
  "reason": "Tournament is full" // Optional
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Registration rejected",
  "data": {
    "id": 123,
    "status": "rejected"
  }
}
```

**Error Responses:**
- `404`: Tournament or registration not found
- `400`: Cannot reject registration with current status

---

### 6. Lock Player

**Endpoint:** `PUT /api/v1/registrations/tournaments/:tournamentId/:registrationId/lock`

**Description:** Organizer locks an accepted player (finalizes for tournament)

**Access:** Private (Organizer only)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Player locked successfully",
  "data": {
    "id": 123,
    "status": "locked"
  }
}
```

**Error Responses:**
- `404`: Tournament or registration not found
- `400`: Can only lock accepted registrations

---

### 7. Unlock Player

**Endpoint:** `PUT /api/v1/registrations/tournaments/:tournamentId/:registrationId/unlock`

**Description:** Organizer unlocks a locked player

**Access:** Private (Organizer only)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Player unlocked successfully",
  "data": {
    "id": 123,
    "status": "accepted"
  }
}
```

**Error Responses:**
- `404`: Tournament or registration not found
- `400`: Can only unlock locked registrations
- `400`: Cannot unlock player already assigned to team

---

### 8. Respond to Invitation

**Endpoint:** `PUT /api/v1/registrations/invitations/:invitationId/respond`

**Description:** Player accepts or declines an invitation

**Access:** Private (Invited player only)

**Request Body:**
```json
{
  "accept": true // true to accept, false to decline
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Invitation accepted successfully",
  "data": {
    "id": 123,
    "status": "accepted" // or "declined"
  }
}
```

**Error Responses:**
- `404`: Invitation not found
- `400`: Not an invitation
- `400`: Invitation already responded to

---

### 9. Get My Invitations

**Endpoint:** `GET /api/v1/registrations/my-invitations`

**Description:** Get all invitations for the authenticated player

**Access:** Private

**Query Parameters:**
- `status` (optional): Filter by status (pending, accepted, declined)

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "tournament_id": 45,
      "tournament_name": "Summer Championship",
      "start_date": "2024-12-01",
      "end_date": "2024-12-03",
      "logo_url": "...",
      "sport_name": "Badminton",
      "venue_name": "City Sports Complex",
      "organizer_name": "John",
      "registration_type": "invitation",
      "status": "pending",
      "notes": "You're invited!",
      "requested_at": "2024-11-01T10:00:00Z"
    }
  ]
}
```

---

### 10. Get My Registrations

**Endpoint:** `GET /api/v1/registrations/my-registrations`

**Description:** Get all registrations (requests + invitations) for the authenticated player

**Access:** Private

**Query Parameters:**
- `status` (optional): Filter by status

**Success Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "tournament_id": 45,
      "tournament_name": "Summer Championship",
      "tournament_type": "open",
      "start_date": "2024-12-01",
      "end_date": "2024-12-03",
      "logo_url": "...",
      "sport_name": "Badminton",
      "venue_name": "City Sports Complex",
      "registration_type": "request",
      "status": "accepted",
      "requested_at": "2024-11-01T10:00:00Z",
      "responded_at": "2024-11-02T14:30:00Z"
    }
  ]
}
```

---

## 🔄 Status Flow

### Registration Status
```
PENDING → ACCEPTED → LOCKED → (Assigned to team)
   ↓          ↓
REJECTED   DECLINED
```

### Status Descriptions
- **pending**: Awaiting organizer/player response
- **accepted**: Approved by organizer (for requests) or player (for invitations)
- **rejected**: Denied by organizer
- **declined**: Player declined invitation
- **locked**: Finalized for tournament, ready for team assignment

---

## 📊 Use Cases

### Use Case 1: OPEN Tournament - Player Requests
```
1. Player: POST /registrations/tournaments/45/request
2. Organizer: GET /registrations/tournaments/45 (sees pending requests)
3. Organizer: PUT /registrations/tournaments/45/123/accept
4. Organizer: PUT /registrations/tournaments/45/123/lock
5. Organizer creates teams with locked players
```

### Use Case 2: CLOSED Tournament - Organizer Invites
```
1. Organizer: POST /registrations/tournaments/45/invite
   Body: { "playerIds": [12, 34, 56] }
2. Player 12: GET /registrations/my-invitations (sees invitation)
3. Player 12: PUT /registrations/invitations/201/respond
   Body: { "accept": true }
4. Organizer: GET /registrations/tournaments/45 (sees accepted)
5. Organizer: PUT /registrations/tournaments/45/201/lock
6. Organizer creates teams with locked players
```

### Use Case 3: Organizer Manages Participants
```
1. GET /registrations/tournaments/45
   - View all registrations grouped by status
2. Accept multiple pending requests
3. Lock all accepted players
4. Unlock a player if needed (before team assignment)
5. Proceed to team creation
```

---

## 🔔 Email Notifications

### Automatic Notifications Sent:

1. **Player requests to join** → Email to organizer
2. **Organizer accepts request** → Email to player
3. **Organizer rejects request** → Email to player (with reason)
4. **Organizer invites player** → Email to player (with invitation)
5. **Player accepts invitation** → Email to organizer
6. **Player declines invitation** → Email to organizer

---

## ✅ Validation Rules

1. **Request to Join:**
   - Tournament must be OPEN
   - Registration period must be active
   - Player cannot already be registered

2. **Invite Players:**
   - Tournament must be CLOSED
   - User must be organizer
   - Players must exist and be active
   - Players cannot already be invited/registered

3. **Accept/Reject:**
   - Only pending registrations can be accepted/rejected
   - User must be organizer

4. **Lock/Unlock:**
   - Only accepted registrations can be locked
   - Only locked registrations can be unlocked
   - Cannot unlock if player is in a team

5. **Respond to Invitation:**
   - Must be an invitation (not a request)
   - Must be pending
   - User must be the invited player

---

## 🧪 Testing Examples

### Test 1: Request to Join
```bash
curl -X POST http://localhost:3000/api/v1/registrations/tournaments/45/request \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"notes": "Experienced player"}'
```

### Test 2: Invite Players
```bash
curl -X POST http://localhost:3000/api/v1/registrations/tournaments/45/invite \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "playerIds": [12, 34, 56],
    "message": "Join our tournament!"
  }'
```

### Test 3: Get Registrations
```bash
curl -X GET http://localhost:3000/api/v1/registrations/tournaments/45?status=pending \
  -H "Authorization: Bearer <token>"
```

### Test 4: Accept Registration
```bash
curl -X PUT http://localhost:3000/api/v1/registrations/tournaments/45/123/accept \
  -H "Authorization: Bearer <token>"
```

### Test 5: Lock Player
```bash
curl -X PUT http://localhost:3000/api/v1/registrations/tournaments/45/123/lock \
  -H "Authorization: Bearer <token>"
```

---

## 📝 Summary

✅ **10 API endpoints** implemented
✅ **Complete CRUD** for registrations
✅ **Email notifications** integrated
✅ **Status management** (pending → accepted → locked)
✅ **Organizer controls** (accept, reject, lock, unlock)
✅ **Player controls** (request, respond to invitations)
✅ **Filtering & grouping** support
✅ **Validation & error handling**

**Registration system is complete and ready to use!** 🚀
