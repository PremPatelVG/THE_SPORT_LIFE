# Tournament Joining - Quick Reference Guide

## 🎯 Overview
Complete tournament joining flow for Singles, Doubles, and Team-based tournaments.

---

## 📊 Tournament Categories

| Category | Participant Type | Registration Requires |
|----------|-----------------|----------------------|
| **Singles** | Individual User | Just user authentication |
| **Doubles** | Partnership (2 players) | Confirmed partnership |
| **Teams** | Team (multiple players) | Team with minimum members |

---

## 🔄 Complete Flow Diagrams

### Singles Tournament Flow
```
┌─────────────────────────────────────────────────────────────┐
│                    SINGLES TOURNAMENT                        │
└─────────────────────────────────────────────────────────────┘

User
  │
  ├─► Browse Tournaments (GET /api/v1/tournaments)
  │
  ├─► View Details (GET /api/v1/tournaments/:id)
  │
  ├─► Check Join Options (GET /api/v1/tournaments/:id/join-options)
  │   └─► Response: { can_join: true, options: { singles: {...} } }
  │
  └─► Register (POST /api/v1/tournaments/:id/register)
      Body: {}
      │
      ├─► entry_fee = 0 → status: 'confirmed', payment: 'paid'
      │
      └─► entry_fee > 0 → status: 'registered', payment: 'pending'
                          └─► Redirect to Payment Gateway
```

### Doubles Tournament Flow
```
┌─────────────────────────────────────────────────────────────┐
│                   DOUBLES TOURNAMENT                         │
└─────────────────────────────────────────────────────────────┘

User A                                    User B
  │                                         │
  ├─► Create Partnership ─────────────────►│
  │   (POST /api/v1/partnerships)          │
  │   Body: { tournament_id, partner_id }  │
  │                                         │
  │   Partnership Created                  │
  │   status: 'pending'                    │
  │                                         │
  │◄──────── Invitation Sent ──────────────┤
  │                                         │
  │                                         ├─► Accept Partnership
  │                                         │   (POST /api/v1/partnerships/:id/accept)
  │                                         │
  │◄──────── Partnership Confirmed ────────┤
  │         status: 'confirmed'            │
  │                                         │
  ├─► Check Join Options                   │
  │   (GET /api/v1/tournaments/:id/join-options)
  │   Response: { options: { doubles: { existing_partnerships: [...] } } }
  │                                         │
  └─► Register Partnership                 │
      (POST /api/v1/tournaments/:id/register)
      Body: { partnership_id: 10 }
      │
      └─► Participant Created (partnership_id = 10)
```

### Team Tournament Flow - Create New Team
```
┌─────────────────────────────────────────────────────────────┐
│              TEAM TOURNAMENT - NEW TEAM                      │
└─────────────────────────────────────────────────────────────┘

Captain                  Member 1         Member 2         Member 3
  │                         │                │                │
  ├─► Create Team           │                │                │
  │   (POST /api/v1/teams)  │                │                │
  │   Body: {               │                │                │
  │     name,               │                │                │
  │     tournament_id,      │                │                │
  │     captain_id,         │                │                │
  │     max_players: 11     │                │                │
  │   }                     │                │                │
  │                         │                │                │
  ├─► Invite Member 1 ──────►                │                │
  │   (POST /api/v1/teams/:id/invite)        │                │
  │                         │                │                │
  ├─► Invite Member 2 ──────┼────────────────►                │
  │                         │                │                │
  ├─► Invite Member 3 ──────┼────────────────┼────────────────►
  │                         │                │                │
  │◄──── Accept ────────────┤                │                │
  │                         │                │                │
  │◄──── Accept ────────────┼────────────────┤                │
  │                         │                │                │
  │◄──── Accept ────────────┼────────────────┼────────────────┤
  │                         │                │                │
  │   Team Members: 4       │                │                │
  │   Min Required: 6       │                │                │
  │   (Need 2 more)         │                │                │
  │                         │                │                │
  ├─► Invite More Members...│                │                │
  │                         │                │                │
  │   Team Members: 6 ✓     │                │                │
  │                         │                │                │
  ├─► Check Eligible Teams  │                │                │
  │   (GET /api/v1/tournaments/:id/eligible-teams)            │
  │   Response: [{          │                │                │
  │     id: 25,             │                │                │
  │     member_count: 6,    │                │                │
  │     can_register: true  │                │                │
  │   }]                    │                │                │
  │                         │                │                │
  └─► Register Team         │                │                │
      (POST /api/v1/tournaments/:id/register)
      Body: { team_id: 25 }
      │
      └─► Participant Created (team_id = 25)
```

### Team Tournament Flow - Existing Team
```
┌─────────────────────────────────────────────────────────────┐
│            TEAM TOURNAMENT - EXISTING TEAM                   │
└─────────────────────────────────────────────────────────────┘

Captain (has existing team)
  │
  ├─► Browse Tournament
  │   (GET /api/v1/tournaments/:id)
  │
  ├─► Check Eligible Teams
  │   (GET /api/v1/tournaments/:id/eligible-teams)
  │   Response: [
  │     {
  │       id: 20,
  │       name: "Lightning Bolts",
  │       member_count: 8,
  │       is_captain: true,
  │       can_register: true,
  │       reasons: []
  │     },
  │     {
  │       id: 21,
  │       name: "Storm Chasers",
  │       member_count: 4,
  │       is_captain: false,
  │       can_register: false,
  │       reasons: [
  │         "Only captain or creator can register",
  │         "Need at least 6 members"
  │       ]
  │     }
  │   ]
  │
  └─► Register Team 20
      (POST /api/v1/tournaments/:id/register)
      Body: { team_id: 20 }
      │
      └─► Participant Created (team_id = 20)
```

---

## 🔑 Key API Endpoints

### Public Endpoints
```
GET  /api/v1/tournaments                    # List tournaments
GET  /api/v1/tournaments/:id                # Tournament details
GET  /api/v1/tournaments/:id/participants   # View participants
GET  /api/v1/tournaments/:id/standings      # View standings
GET  /api/v1/tournaments/:id/matches        # View matches
```

### Protected Endpoints (Require Authentication)
```
POST /api/v1/tournaments/:id/register       # Register for tournament
GET  /api/v1/tournaments/:id/join-options   # Check join options
GET  /api/v1/tournaments/:id/eligible-teams # Get eligible teams
POST /api/v1/tournaments/:id/withdraw       # Withdraw from tournament

POST /api/v1/teams                          # Create team
GET  /api/v1/teams/:id                      # Team details
POST /api/v1/teams/:id/invite               # Invite member
GET  /api/v1/teams/my-teams                 # User's teams

POST /api/v1/partnerships                   # Create partnership
POST /api/v1/partnerships/:id/accept        # Accept partnership
```

---

## 📋 Registration Request Bodies

### Singles
```json
POST /api/v1/tournaments/:id/register
{
  // Empty body for singles
}
```

### Doubles
```json
POST /api/v1/tournaments/:id/register
{
  "partnership_id": 10
}
```

### Teams
```json
POST /api/v1/tournaments/:id/register
{
  "team_id": 25
}
```

---

## ✅ Validation Rules

### Singles
- ✅ User authenticated
- ✅ Tournament status = 'open'
- ✅ Within registration dates
- ✅ Tournament not full
- ✅ User not already registered
- ✅ User is not organizer

### Doubles
- ✅ All singles validations
- ✅ Partnership ID provided
- ✅ Partnership exists
- ✅ Partnership belongs to tournament
- ✅ Partnership status = 'confirmed'
- ✅ User is part of partnership
- ✅ Partnership not already registered

### Teams
- ✅ All singles validations
- ✅ Team ID provided
- ✅ Team exists
- ✅ Team belongs to tournament
- ✅ User is captain OR creator
- ✅ Team has minimum members (≥ 50% of max_players)
- ✅ Team not already registered

---

## 🗄️ Database Tables

### tournament_participants
```sql
CREATE TABLE tournament_participants (
    id INT PRIMARY KEY,
    tournament_id INT,
    user_id INT,           -- For singles
    partnership_id INT,    -- For doubles
    team_id INT,           -- For teams
    payment_status ENUM('pending', 'paid', 'refunded'),
    status ENUM('registered', 'confirmed', 'withdrawn', 'disqualified'),
    
    -- Only ONE of user_id, partnership_id, team_id should be set
    CHECK (
        (user_id IS NOT NULL AND partnership_id IS NULL AND team_id IS NULL) OR
        (user_id IS NULL AND partnership_id IS NOT NULL AND team_id IS NULL) OR
        (user_id IS NULL AND partnership_id IS NULL AND team_id IS NOT NULL)
    )
);
```

---

## 🎨 Frontend UI Components Needed

### 1. Tournament Card Component
```
┌─────────────────────────────────────┐
│ 🏆 City Singles Championship        │
│                                     │
│ 📅 Dec 1-5, 2024                    │
│ 🏟️  Sports Complex                  │
│ 💰 Entry: $500 | Prize: $10,000    │
│                                     │
│ 👥 15/32 Participants               │
│                                     │
│ [View Details] [Join Tournament]   │
└─────────────────────────────────────┘
```

### 2. Join Options Modal (Team Tournament)
```
┌─────────────────────────────────────────────┐
│ Join Tournament                         [X] │
├─────────────────────────────────────────────┤
│                                             │
│ Select a team to register:                  │
│                                             │
│ ○ Lightning Bolts (8 members) ✓            │
│   Can register                              │
│                                             │
│ ○ Storm Chasers (4 members) ✗             │
│   ⚠️ Need at least 6 members               │
│   ⚠️ Only captain can register             │
│                                             │
│ [Create New Team]                           │
│                                             │
│                    [Cancel] [Register]      │
└─────────────────────────────────────────────┘
```

### 3. Team Creation Form
```
┌─────────────────────────────────────────────┐
│ Create Team                             [X] │
├─────────────────────────────────────────────┤
│                                             │
│ Team Name: [________________]               │
│                                             │
│ Description:                                │
│ [_________________________________]         │
│ [_________________________________]         │
│                                             │
│ Max Players: [11 ▼]                        │
│                                             │
│ Logo: [Upload Image]                        │
│                                             │
│                    [Cancel] [Create Team]   │
└─────────────────────────────────────────────┘
```

---

## 🧪 Testing Scenarios

### Test Case 1: Singles Registration Success
```bash
# Setup: User logged in, tournament open
curl -X POST "http://localhost:5000/api/v1/tournaments/1/register" \
  -H "Authorization: Bearer TOKEN" \
  -d '{}'

# Expected: 201 Created
# Response: { success: true, data: { id, status: 'registered' } }
```

### Test Case 2: Team Registration - Insufficient Members
```bash
# Setup: Team has 3 members, min required is 6
curl -X POST "http://localhost:5000/api/v1/tournaments/3/register" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"team_id": 25}'

# Expected: 400 Bad Request
# Response: { success: false, error: "Team does not meet minimum member requirements" }
```

### Test Case 3: Get Eligible Teams
```bash
curl -X GET "http://localhost:5000/api/v1/tournaments/3/eligible-teams" \
  -H "Authorization: Bearer TOKEN"

# Expected: 200 OK
# Response: { success: true, data: [{ id, name, can_register, reasons }] }
```

---

## 🚀 Quick Start for Frontend Developers

### 1. Check if user can join tournament
```javascript
const response = await fetch(`/api/v1/tournaments/${id}/join-options`, {
  headers: { Authorization: `Bearer ${token}` }
});
const { data } = await response.json();

if (data.can_join) {
  // Show registration UI
} else {
  // Show reasons why user cannot join
  console.log(data.reasons);
}
```

### 2. Register for singles tournament
```javascript
const response = await fetch(`/api/v1/tournaments/${id}/register`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({})
});
```

### 3. Register team for tournament
```javascript
// First, get eligible teams
const teamsResponse = await fetch(`/api/v1/tournaments/${id}/eligible-teams`, {
  headers: { Authorization: `Bearer ${token}` }
});
const { data: teams } = await teamsResponse.json();

// Filter teams that can register
const eligibleTeams = teams.filter(t => t.can_register);

// Register selected team
const response = await fetch(`/api/v1/tournaments/${id}/register`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ team_id: selectedTeamId })
});
```

---

## 📚 Documentation Files

1. **TOURNAMENT_JOINING_FLOW.md** - Complete flow documentation
2. **TOURNAMENT_JOINING_API_GUIDE.md** - Detailed API guide with examples
3. **TOURNAMENT_JOINING_IMPLEMENTATION_SUMMARY.md** - Implementation details
4. **TOURNAMENT_JOINING_QUICK_REFERENCE.md** - This file

---

## 🆘 Common Issues & Solutions

### Issue: "Team does not belong to this tournament"
**Solution:** Teams are tournament-specific. Create a new team for each tournament.

### Issue: "Only team captain or creator can register"
**Solution:** Ask the team captain to register the team, or transfer captaincy.

### Issue: "Partnership must be confirmed before registration"
**Solution:** Partner must accept the partnership invitation first.

### Issue: "Tournament is full"
**Solution:** Tournament has reached max_participants limit. Cannot register.

### Issue: "Registration has closed"
**Solution:** Registration deadline has passed. Cannot register.

---

## 📞 Support

For issues or questions:
1. Check the detailed documentation in `/docs` folder
2. Review API examples in TOURNAMENT_JOINING_API_GUIDE.md
3. Contact the development team

---

**Last Updated:** November 2024
**Version:** 1.0.0
