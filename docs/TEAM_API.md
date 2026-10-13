# Team Management API Documentation

Complete team management system for team-based tournaments with member management and invitations.

## Base URL
```
http://localhost:3000/api/v1/teams
```

---

## 📋 Table of Contents

1. [Team CRUD](#team-crud)
2. [Member Management](#member-management)
3. [Team Invitations](#team-invitations)
4. [Team Roles](#team-roles)
5. [Queries & Filters](#queries--filters)

---

## Team CRUD

### Create Team

**Endpoint:** `POST /`

**Authentication:** Required

**Request Body:**
```json
{
  "name": "Thunder Warriors",
  "tournament_id": 1,
  "captain_id": 5,
  "logo": "https://example.com/logo.png",
  "description": "Competitive football team from downtown",
  "max_players": 15
}
```

**Required Fields:**
- `name` - Team name (3-100 characters)
- `tournament_id` - Tournament ID

**Optional Fields:**
- `captain_id` - Captain user ID (defaults to creator)
- `logo` - Team logo URL
- `description` - Team description (max 500 characters)
- `max_players` - Maximum team size (2-50, default: 11)

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Team created successfully",
  "data": {
    "id": 1,
    "name": "Thunder Warriors",
    "tournament_id": 1,
    "tournament_name": "City Football League",
    "sport_id": 8,
    "sport_name": "Football",
    "creator_id": 10,
    "creator_first_name": "John",
    "creator_last_name": "Doe",
    "captain_id": 5,
    "captain_first_name": "Mike",
    "captain_last_name": "Smith",
    "logo": "https://example.com/logo.png",
    "description": "Competitive football team from downtown",
    "max_players": 15,
    "member_count": 2,
    "created_at": "2024-10-15T10:00:00.000Z"
  }
}
```

**Notes:**
- Creator is automatically added as first member
- If captain is different from creator, captain is also added
- Tournament must support team category

---

### Get All Teams

**Endpoint:** `GET /`

**Authentication:** Not required

**Query Parameters:**
- `tournament_id` - Filter by tournament
- `creator_id` - Filter by creator
- `search` - Search in name and description
- `limit` - Results per page (default: 20, max: 100)
- `offset` - Pagination offset (default: 0)

**Example:**
```
GET /api/v1/teams?tournament_id=1&limit=10
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Thunder Warriors",
      "tournament_id": 1,
      "tournament_name": "City Football League",
      "sport_name": "Football",
      "creator_first_name": "John",
      "creator_last_name": "Doe",
      "captain_first_name": "Mike",
      "captain_last_name": "Smith",
      "logo": "https://example.com/logo.png",
      "member_count": 12,
      "max_players": 15,
      "created_at": "2024-10-15T10:00:00.000Z"
    }
  ],
  "pagination": {
    "limit": 10,
    "offset": 0,
    "total": 1
  }
}
```

---

### Get Team by ID

**Endpoint:** `GET /:id`

**Authentication:** Not required

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Thunder Warriors",
    "tournament_id": 1,
    "tournament_name": "City Football League",
    "sport_id": 8,
    "sport_name": "Football",
    "creator_id": 10,
    "creator_first_name": "John",
    "creator_last_name": "Doe",
    "captain_id": 5,
    "captain_first_name": "Mike",
    "captain_last_name": "Smith",
    "captain_email": "mike@example.com",
    "logo": "https://example.com/logo.png",
    "description": "Competitive football team",
    "max_players": 15,
    "member_count": 12,
    "created_at": "2024-10-15T10:00:00.000Z",
    "members": [...],
    "statistics": {
      "total_members": 12,
      "pending_invitations": 2,
      "tournaments_participated": 1
    }
  }
}
```

---

### Update Team

**Endpoint:** `PUT /:id`

**Authentication:** Required (Creator or Captain)

**Request Body:**
```json
{
  "name": "Thunder Warriors FC",
  "logo": "https://example.com/new-logo.png",
  "description": "Updated description",
  "max_players": 18
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Team updated successfully",
  "data": {
    "id": 1,
    "name": "Thunder Warriors FC",
    ...
  }
}
```

---

### Delete Team

**Endpoint:** `DELETE /:id`

**Authentication:** Required (Creator only)

**Restrictions:**
- Cannot delete team registered in tournament
- Only creator can delete

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Team deleted successfully"
}
```

---

## Member Management

### Get Team Members

**Endpoint:** `GET /:id/members`

**Authentication:** Not required

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "team_id": 1,
      "user_id": 5,
      "first_name": "Mike",
      "last_name": "Smith",
      "email": "mike@example.com",
      "profile_image": "https://...",
      "phone": "+1234567890",
      "position": "Forward",
      "jersey_number": 10,
      "is_captain": true,
      "is_active": true,
      "joined_at": "2024-10-15T10:00:00.000Z"
    },
    {
      "id": 2,
      "team_id": 1,
      "user_id": 10,
      "first_name": "John",
      "last_name": "Doe",
      "position": "Midfielder",
      "jersey_number": 8,
      "is_captain": false,
      "is_active": true,
      "joined_at": "2024-10-15T10:00:00.000Z"
    }
  ]
}
```

---

### Remove Team Member

**Endpoint:** `DELETE /:id/members/:memberId`

**Authentication:** Required (Creator, Captain, or Member themselves)

**Restrictions:**
- Cannot remove captain (change captain first)
- Cannot remove creator
- Member can remove themselves (leave team)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Member removed successfully"
}
```

---

### Update Member Details

**Endpoint:** `PUT /:id/members/:memberId`

**Authentication:** Required (Creator or Captain)

**Request Body:**
```json
{
  "position": "Striker",
  "jersey_number": 9
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Member updated successfully"
}
```

---

### Change Team Captain

**Endpoint:** `POST /:id/change-captain`

**Authentication:** Required (Creator only)

**Request Body:**
```json
{
  "captain_id": 15
}
```

**Requirements:**
- New captain must be a team member
- Only creator can change captain

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Captain changed successfully",
  "data": {
    "id": 1,
    "captain_id": 15,
    ...
  }
}
```

---

### Leave Team

**Endpoint:** `POST /:id/leave`

**Authentication:** Required

**Restrictions:**
- Creator cannot leave (must delete team)
- Captain cannot leave (must transfer captaincy first)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Successfully left the team"
}
```

---

### Get Available Jersey Numbers

**Endpoint:** `GET /:id/available-jerseys`

**Authentication:** Required

**Response (200 OK):**
```json
{
  "success": true,
  "data": [1, 2, 3, 4, 5, 6, 7, 9, 11, 12, ...]
}
```

**Note:** Returns array of available jersey numbers (1-99)

---

## Team Invitations

### Invite User to Team

**Endpoint:** `POST /:id/invite`

**Authentication:** Required (Creator or Captain)

**Request Body:**
```json
{
  "user_id": 20
}
```

**Requirements:**
- Team must not be full
- User must not already be a member
- No pending invitation for this user

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Invitation sent successfully",
  "data": {
    "id": 1,
    "team_id": 1,
    "team_name": "Thunder Warriors",
    "team_logo": "https://...",
    "tournament_id": 1,
    "tournament_name": "City Football League",
    "invited_user_id": 20,
    "invitee_first_name": "Sarah",
    "invitee_last_name": "Johnson",
    "invitee_email": "sarah@example.com",
    "invited_by": 5,
    "inviter_first_name": "Mike",
    "inviter_last_name": "Smith",
    "status": "pending",
    "invited_at": "2024-10-15T11:00:00.000Z"
  }
}
```

---

### Get Team Invitations

**Endpoint:** `GET /:id/invitations`

**Authentication:** Required (Creator or Captain)

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "team_id": 1,
      "invited_user_id": 20,
      "first_name": "Sarah",
      "last_name": "Johnson",
      "email": "sarah@example.com",
      "profile_image": "https://...",
      "inviter_first_name": "Mike",
      "inviter_last_name": "Smith",
      "status": "pending",
      "invited_at": "2024-10-15T11:00:00.000Z",
      "responded_at": null
    }
  ]
}
```

---

### Get My Invitations

**Endpoint:** `GET /invitations/my`

**Authentication:** Required

**Query Parameters:**
- `status` - Filter by status (`pending`, `accepted`, `rejected`, `cancelled`)

**Example:**
```
GET /api/v1/teams/invitations/my?status=pending
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "team_id": 1,
      "team_name": "Thunder Warriors",
      "team_logo": "https://...",
      "tournament_id": 1,
      "tournament_name": "City Football League",
      "invited_by": 5,
      "inviter_first_name": "Mike",
      "inviter_last_name": "Smith",
      "status": "pending",
      "invited_at": "2024-10-15T11:00:00.000Z"
    }
  ]
}
```

---

### Accept Team Invitation

**Endpoint:** `POST /invitations/:id/accept`

**Authentication:** Required

**Requirements:**
- Invitation must be for the authenticated user
- Invitation must be pending
- Team must not be full

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Invitation accepted successfully",
  "data": {
    "id": 1,
    "name": "Thunder Warriors",
    "member_count": 13,
    ...
  }
}
```

**Note:** User is automatically added to team upon acceptance

---

### Reject Team Invitation

**Endpoint:** `POST /invitations/:id/reject`

**Authentication:** Required

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Invitation rejected"
}
```

---

### Cancel Team Invitation

**Endpoint:** `DELETE /invitations/:id`

**Authentication:** Required (Creator or Captain)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Invitation cancelled"
}
```

---

## Team Roles

### Role Hierarchy

1. **Creator** - User who created the team
   - Full control over team
   - Can delete team
   - Can change captain
   - Can invite/remove members
   - Cannot leave team

2. **Captain** - Team leader (assigned by creator)
   - Can update team details
   - Can invite/remove members
   - Cannot delete team
   - Cannot leave (must transfer captaincy first)

3. **Member** - Regular team member
   - Can view team details
   - Can leave team
   - Limited permissions

### Permission Matrix

| Action | Creator | Captain | Member |
|--------|---------|---------|--------|
| Create Team | ✅ | ✅ | ✅ |
| Update Team | ✅ | ✅ | ❌ |
| Delete Team | ✅ | ❌ | ❌ |
| Invite Members | ✅ | ✅ | ❌ |
| Remove Members | ✅ | ✅ | ❌ |
| Update Members | ✅ | ✅ | ❌ |
| Change Captain | ✅ | ❌ | ❌ |
| Leave Team | ❌ | ❌* | ✅ |
| View Invitations | ✅ | ✅ | ❌ |
| Cancel Invitations | ✅ | ✅ | ❌ |

*Captain must transfer captaincy before leaving

---

## Queries & Filters

### Get My Teams

**Endpoint:** `GET /my/teams`

**Authentication:** Required

**Description:** Get all teams where user is creator, captain, or member

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Thunder Warriors",
      "tournament_name": "City Football League",
      "sport_name": "Football",
      "user_role": "creator",
      "member_count": 12,
      "max_players": 15,
      "created_at": "2024-10-15T10:00:00.000Z"
    },
    {
      "id": 2,
      "name": "Lightning Strikers",
      "tournament_name": "Regional Cup",
      "sport_name": "Football",
      "user_role": "member",
      "member_count": 10,
      "max_players": 15,
      "created_at": "2024-10-14T09:00:00.000Z"
    }
  ]
}
```

---

### Get Teams for Tournament

**Endpoint:** `GET /tournament/:tournamentId`

**Authentication:** Not required

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Thunder Warriors",
      "creator_first_name": "John",
      "creator_last_name": "Doe",
      "captain_first_name": "Mike",
      "captain_last_name": "Smith",
      "logo": "https://...",
      "member_count": 12,
      "max_players": 15,
      "created_at": "2024-10-15T10:00:00.000Z"
    }
  ]
}
```

---

## Team Lifecycle

### 1. Team Creation
```
User creates team → Creator added as member → Captain added (if different)
```

### 2. Building Team
```
Invite users → Users accept → Members added → Assign positions/jerseys
```

### 3. Tournament Registration
```
Team must have minimum members → Register for tournament → Team competes
```

### 4. Team Management
```
Add/remove members → Change captain → Update details → Monitor performance
```

---

## Validation Rules

### Team Name
- 3-100 characters
- Must be unique within tournament
- Required

### Max Players
- 2-50 players
- Default: 11 (for football)
- Can be adjusted based on sport

### Jersey Numbers
- 1-99
- Must be unique within team
- Optional

### Position
- Max 50 characters
- Optional
- Free text (e.g., "Forward", "Midfielder", "Goalkeeper")

---

## Error Responses

### Common Errors

**400 Bad Request:**
```json
{
  "success": false,
  "error": "A team with this name already exists in this tournament"
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "error": "Only team creator or captain can invite members"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "error": "Team not found"
}
```

**Validation Errors:**
```json
{
  "success": false,
  "errors": [
    {
      "field": "name",
      "message": "Team name must be between 3 and 100 characters"
    },
    {
      "field": "tournament_id",
      "message": "Tournament ID is required"
    }
  ]
}
```

---

## Best Practices

### For Team Creators

1. **Set Clear Roles:** Assign captain and positions early
2. **Manage Roster:** Keep team size optimal for tournament
3. **Communicate:** Use team description for important info
4. **Jersey Numbers:** Assign numbers to avoid conflicts
5. **Active Management:** Remove inactive members promptly

### For Team Captains

1. **Lead by Example:** Be active and engaged
2. **Coordinate:** Help organize team activities
3. **Recruit:** Invite skilled players
4. **Support Creator:** Work together on team decisions

### For Team Members

1. **Be Responsive:** Accept invitations promptly
2. **Stay Active:** Participate in team activities
3. **Communicate:** Inform if unable to participate
4. **Respect Hierarchy:** Follow captain and creator decisions

---

## Integration with Tournaments

### Team Registration Flow

1. **Create Team** for specific tournament
2. **Build Team** to minimum required members
3. **Register Team** for tournament (via tournament API)
4. **Compete** in tournament matches

### Minimum Members Requirement

Teams need at least **50% of max_players** to register:
- 11 max players → need 6 minimum
- 15 max players → need 8 minimum
- 20 max players → need 10 minimum

---

## Testing

### Using cURL

**Create Team:**
```bash
curl -X POST http://localhost:3000/api/v1/teams \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Thunder Warriors",
    "tournament_id": 1,
    "max_players": 15
  }'
```

**Invite User:**
```bash
curl -X POST http://localhost:3000/api/v1/teams/1/invite \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_id": 20}'
```

**Accept Invitation:**
```bash
curl -X POST http://localhost:3000/api/v1/teams/invitations/1/accept \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Get My Teams:**
```bash
curl http://localhost:3000/api/v1/teams/my/teams \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

**Last Updated:** October 15, 2024  
**API Version:** v1
