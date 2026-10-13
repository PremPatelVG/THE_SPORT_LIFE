# Tournament Joining API - Complete Guide

## Overview
This guide provides complete API documentation and examples for the tournament joining flow, covering singles, doubles, and team-based tournaments.

---

## Table of Contents
1. [Authentication](#authentication)
2. [Singles Tournament Flow](#singles-tournament-flow)
3. [Doubles Tournament Flow](#doubles-tournament-flow)
4. [Team Tournament Flow](#team-tournament-flow)
5. [Common APIs](#common-apis)
6. [Error Handling](#error-handling)

---

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```http
Authorization: Bearer <your_jwt_token>
```

---

## Singles Tournament Flow

### Step 1: Browse Tournaments

**GET** `/api/v1/tournaments`

Query Parameters:
- `status` (optional): 'open', 'ongoing', 'completed'
- `sport_id` (optional): Filter by sport
- `category` (optional): 'singles', 'doubles', 'teams'
- `search` (optional): Search by name or description
- `limit` (optional): Default 20
- `offset` (optional): Default 0

**Example Request:**
```bash
curl -X GET "http://localhost:5000/api/v1/tournaments?category=singles&status=open" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "City Singles Championship",
      "category": "singles",
      "status": "open",
      "sport_name": "Badminton",
      "entry_fee": "500.00",
      "max_participants": 32,
      "participant_count": 15,
      "start_date": "2024-12-01",
      "registration_end": "2024-11-25T23:59:59.000Z"
    }
  ]
}
```

### Step 2: View Tournament Details

**GET** `/api/v1/tournaments/:id`

**Example Request:**
```bash
curl -X GET "http://localhost:5000/api/v1/tournaments/1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "City Singles Championship",
    "description": "Annual singles tournament",
    "category": "singles",
    "status": "open",
    "sport_id": 1,
    "sport_name": "Badminton",
    "venue_name": "Sports Complex",
    "entry_fee": "500.00",
    "prize_money": "10000.00",
    "max_participants": 32,
    "participant_count": 15,
    "start_date": "2024-12-01",
    "end_date": "2024-12-05",
    "registration_start": "2024-11-01T00:00:00.000Z",
    "registration_end": "2024-11-25T23:59:59.000Z",
    "organizer_first_name": "John",
    "organizer_last_name": "Doe"
  }
}
```

### Step 3: Check Join Options (Optional but Recommended)

**GET** `/api/v1/tournaments/:id/join-options`

**Example Request:**
```bash
curl -X GET "http://localhost:5000/api/v1/tournaments/1/join-options" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example Response:**
```json
{
  "success": true,
  "data": {
    "can_join": true,
    "reasons": [],
    "tournament_category": "singles",
    "options": {
      "singles": {
        "available": true,
        "is_registered": false
      }
    }
  }
}
```

### Step 4: Register for Tournament

**POST** `/api/v1/tournaments/:id/register`

**Example Request:**
```bash
curl -X POST "http://localhost:5000/api/v1/tournaments/1/register" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Example Response:**
```json
{
  "success": true,
  "message": "Successfully registered for tournament",
  "data": {
    "id": 45,
    "tournament_id": 1,
    "user_id": 123,
    "payment_status": "pending",
    "status": "registered",
    "registration_date": "2024-11-15T10:30:00.000Z",
    "participant_name": "Jane Smith",
    "entry_fee": "500.00"
  }
}
```

---

## Doubles Tournament Flow

### Step 1-2: Browse and View Tournament (Same as Singles)

### Step 3: Create Partnership (If Needed)

**POST** `/api/v1/partnerships`

**Example Request:**
```bash
curl -X POST "http://localhost:5000/api/v1/partnerships" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tournament_id": 2,
    "partner_id": 456,
    "partnership_name": "Dynamic Duo"
  }'
```

**Example Response:**
```json
{
  "success": true,
  "message": "Partnership created successfully",
  "data": {
    "id": 10,
    "tournament_id": 2,
    "player1_id": 123,
    "player2_id": 456,
    "partnership_name": "Dynamic Duo",
    "status": "pending"
  }
}
```

### Step 4: Partner Accepts Invitation

**POST** `/api/v1/partnerships/:id/accept`

Partner needs to accept the partnership invitation before registration.

### Step 5: Check Join Options

**GET** `/api/v1/tournaments/:id/join-options`

**Example Response:**
```json
{
  "success": true,
  "data": {
    "can_join": true,
    "reasons": [],
    "tournament_category": "doubles",
    "options": {
      "doubles": {
        "available": true,
        "existing_partnerships": [
          {
            "id": 10,
            "partnership_name": "Dynamic Duo",
            "partner1_name": "Jane Smith",
            "partner2_name": "Bob Johnson",
            "status": "confirmed",
            "is_registered": false
          }
        ],
        "can_create_partnership": true
      }
    }
  }
}
```

### Step 6: Register Partnership

**POST** `/api/v1/tournaments/:id/register`

**Example Request:**
```bash
curl -X POST "http://localhost:5000/api/v1/tournaments/2/register" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "partnership_id": 10
  }'
```

**Example Response:**
```json
{
  "success": true,
  "message": "Successfully registered for tournament",
  "data": {
    "id": 46,
    "tournament_id": 2,
    "partnership_id": 10,
    "payment_status": "pending",
    "status": "registered",
    "participant_name": "Dynamic Duo"
  }
}
```

---

## Team Tournament Flow

### Scenario A: Create New Team and Register

#### Step 1-2: Browse and View Tournament (Same as Singles)

#### Step 3: Check Join Options

**GET** `/api/v1/tournaments/:id/join-options`

**Example Response:**
```json
{
  "success": true,
  "data": {
    "can_join": false,
    "reasons": ["You need to create or join a team first"],
    "tournament_category": "teams",
    "options": {
      "teams": {
        "available": false,
        "existing_teams": [],
        "can_create_team": true,
        "min_members_required": 6
      }
    }
  }
}
```

#### Step 4: Create Team

**POST** `/api/v1/teams`

**Example Request:**
```bash
curl -X POST "http://localhost:5000/api/v1/teams" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Thunder Strikers",
    "tournament_id": 3,
    "captain_id": 123,
    "description": "Best team in the city",
    "max_players": 11
  }'
```

**Example Response:**
```json
{
  "success": true,
  "message": "Team created successfully",
  "data": {
    "id": 25,
    "name": "Thunder Strikers",
    "tournament_id": 3,
    "creator_id": 123,
    "captain_id": 123,
    "max_players": 11,
    "member_count": 1
  }
}
```

#### Step 5: Invite Team Members

**POST** `/api/v1/teams/:id/invite`

**Example Request:**
```bash
curl -X POST "http://localhost:5000/api/v1/teams/25/invite" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": 456
  }'
```

Repeat for multiple members.

#### Step 6: Members Accept Invitations

**POST** `/api/v1/teams/invitations/:id/accept`

Each invited member accepts their invitation.

#### Step 7: Check Eligible Teams

**GET** `/api/v1/tournaments/:id/eligible-teams`

**Example Request:**
```bash
curl -X GET "http://localhost:5000/api/v1/tournaments/3/eligible-teams" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 25,
      "name": "Thunder Strikers",
      "tournament_id": 3,
      "member_count": 6,
      "max_players": 11,
      "is_captain": true,
      "is_creator": true,
      "is_registered": false,
      "min_members_required": 6,
      "can_register": true,
      "reasons": []
    }
  ]
}
```

#### Step 8: Register Team

**POST** `/api/v1/tournaments/:id/register`

**Example Request:**
```bash
curl -X POST "http://localhost:5000/api/v1/tournaments/3/register" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "team_id": 25
  }'
```

**Example Response:**
```json
{
  "success": true,
  "message": "Successfully registered for tournament",
  "data": {
    "id": 47,
    "tournament_id": 3,
    "team_id": 25,
    "payment_status": "pending",
    "status": "registered",
    "participant_name": "Thunder Strikers"
  }
}
```

### Scenario B: Register with Existing Team

#### Step 1-2: Browse and View Tournament

#### Step 3: Check Eligible Teams

**GET** `/api/v1/tournaments/:id/eligible-teams`

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 20,
      "name": "Lightning Bolts",
      "tournament_id": 3,
      "member_count": 8,
      "max_players": 11,
      "is_captain": true,
      "is_creator": false,
      "is_registered": false,
      "min_members_required": 6,
      "can_register": true,
      "reasons": []
    },
    {
      "id": 21,
      "name": "Storm Chasers",
      "tournament_id": 3,
      "member_count": 4,
      "max_players": 11,
      "is_captain": false,
      "is_creator": false,
      "is_registered": false,
      "min_members_required": 6,
      "can_register": false,
      "reasons": ["Only captain or creator can register", "Need at least 6 members"]
    }
  ]
}
```

#### Step 4: Register Team

Use the same registration endpoint with the existing team_id.

---

## Common APIs

### Get User's Teams

**GET** `/api/v1/teams/my-teams`

**Example Request:**
```bash
curl -X GET "http://localhost:5000/api/v1/teams/my-teams" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Teams for Specific Tournament

**GET** `/api/v1/teams?tournament_id=:tournamentId`

**Example Request:**
```bash
curl -X GET "http://localhost:5000/api/v1/teams?tournament_id=3" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get Tournament Participants

**GET** `/api/v1/tournaments/:id/participants`

**Example Request:**
```bash
curl -X GET "http://localhost:5000/api/v1/tournaments/1/participants"
```

### Withdraw from Tournament

**POST** `/api/v1/tournaments/:id/withdraw`

**Example Request:**
```bash
curl -X POST "http://localhost:5000/api/v1/tournaments/1/withdraw" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Personal reasons"
  }'
```

---

## Error Handling

### Common Error Responses

#### 400 Bad Request
```json
{
  "success": false,
  "error": "Team ID is required for team tournaments"
}
```

#### 401 Unauthorized
```json
{
  "success": false,
  "error": "No token provided"
}
```

#### 403 Forbidden
```json
{
  "success": false,
  "error": "Only team captain or creator can register the team"
}
```

#### 404 Not Found
```json
{
  "success": false,
  "error": "Tournament not found"
}
```

### Validation Errors

#### Tournament Full
```json
{
  "success": false,
  "error": "Tournament is full"
}
```

#### Already Registered
```json
{
  "success": false,
  "error": "Already registered for this tournament"
}
```

#### Registration Closed
```json
{
  "success": false,
  "error": "Registration has closed"
}
```

#### Insufficient Team Members
```json
{
  "success": false,
  "error": "Team does not meet minimum member requirements"
}
```

#### Wrong Tournament
```json
{
  "success": false,
  "error": "Team does not belong to this tournament"
}
```

---

## Complete Flow Examples

### Example 1: User Joins Singles Tournament

```bash
# 1. Get tournament details
curl -X GET "http://localhost:5000/api/v1/tournaments/1"

# 2. Check join options
curl -X GET "http://localhost:5000/api/v1/tournaments/1/join-options" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 3. Register
curl -X POST "http://localhost:5000/api/v1/tournaments/1/register" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Example 2: User Creates Team and Joins Tournament

```bash
# 1. Check join options
curl -X GET "http://localhost:5000/api/v1/tournaments/3/join-options" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. Create team
curl -X POST "http://localhost:5000/api/v1/teams" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Team",
    "tournament_id": 3,
    "captain_id": 123,
    "max_players": 11
  }'

# 3. Invite members (repeat for each member)
curl -X POST "http://localhost:5000/api/v1/teams/25/invite" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"user_id": 456}'

# 4. Check eligible teams
curl -X GET "http://localhost:5000/api/v1/tournaments/3/eligible-teams" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 5. Register team
curl -X POST "http://localhost:5000/api/v1/tournaments/3/register" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"team_id": 25}'
```

### Example 3: User Joins with Existing Team

```bash
# 1. Get eligible teams
curl -X GET "http://localhost:5000/api/v1/tournaments/3/eligible-teams" \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. Register with existing team
curl -X POST "http://localhost:5000/api/v1/tournaments/3/register" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"team_id": 20}'
```

---

## Frontend Integration Tips

### 1. Tournament Detail Page

```javascript
// Fetch tournament and join options together
const [tournament, joinOptions] = await Promise.all([
  fetch(`/api/v1/tournaments/${id}`),
  fetch(`/api/v1/tournaments/${id}/join-options`, {
    headers: { Authorization: `Bearer ${token}` }
  })
]);

// Show appropriate UI based on category and options
if (joinOptions.can_join) {
  if (tournament.category === 'singles') {
    showRegisterButton();
  } else if (tournament.category === 'teams') {
    if (joinOptions.options.teams.existing_teams.length > 0) {
      showTeamSelector(joinOptions.options.teams.existing_teams);
    } else {
      showCreateTeamButton();
    }
  }
}
```

### 2. Team Registration Flow

```javascript
// Get eligible teams
const response = await fetch(`/api/v1/tournaments/${tournamentId}/eligible-teams`, {
  headers: { Authorization: `Bearer ${token}` }
});

const { data: teams } = await response.json();

// Filter teams that can register
const eligibleTeams = teams.filter(t => t.can_register);

if (eligibleTeams.length > 0) {
  // Show team selection dropdown
  showTeamDropdown(eligibleTeams);
} else {
  // Show create team option
  showCreateTeamOption();
}
```

### 3. Handle Registration

```javascript
async function registerForTournament(tournamentId, data = {}) {
  try {
    const response = await fetch(`/api/v1/tournaments/${tournamentId}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (result.success) {
      // Handle successful registration
      if (result.data.payment_status === 'pending') {
        // Redirect to payment
        redirectToPayment(result.data);
      } else {
        // Show success message
        showSuccess('Successfully registered!');
      }
    } else {
      showError(result.error);
    }
  } catch (error) {
    showError('Registration failed');
  }
}
```

---

## Testing Checklist

### Singles Tournament
- [ ] User can view tournament details
- [ ] User can check join options
- [ ] User can register for singles tournament
- [ ] User cannot register twice
- [ ] User cannot register when tournament is full
- [ ] User cannot register after deadline

### Doubles Tournament
- [ ] User can create partnership
- [ ] Partner can accept partnership
- [ ] User can register with confirmed partnership
- [ ] User cannot register with pending partnership
- [ ] User cannot register with unconfirmed partnership

### Team Tournament
- [ ] User can create team for tournament
- [ ] User can invite team members
- [ ] Members can accept invitations
- [ ] Captain can see eligible teams
- [ ] Captain can register team with sufficient members
- [ ] Captain cannot register team with insufficient members
- [ ] Non-captain cannot register team
- [ ] Team cannot be registered twice
- [ ] Team from different tournament cannot be used

---

## Support

For issues or questions, contact the development team or refer to the main documentation.
