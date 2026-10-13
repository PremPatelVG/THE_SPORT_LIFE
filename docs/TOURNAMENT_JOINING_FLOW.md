# Tournament Joining Flow - Complete Documentation

## Overview
This document describes the complete tournament joining flow for all tournament categories: **Singles**, **Doubles**, and **Teams**.

---

## Database Schema Analysis

### Key Tables

#### 1. **tournaments**
- Stores tournament information
- `category`: 'singles' | 'doubles' | 'teams'
- `status`: 'draft' | 'open' | 'closed' | 'ongoing' | 'completed' | 'cancelled'
- `entry_fee`: Registration fee amount
- `max_participants`: Maximum allowed participants

#### 2. **tournament_participants**
- Links participants to tournaments
- Can reference: `user_id` (singles), `partnership_id` (doubles), or `team_id` (teams)
- `payment_status`: 'pending' | 'paid' | 'refunded'
- `status`: 'registered' | 'confirmed' | 'withdrawn' | 'disqualified'

#### 3. **teams**
- Team information for team-based tournaments
- `tournament_id`: Links team to specific tournament
- `creator_id`: User who created the team
- `captain_id`: Team captain
- Teams are tournament-specific (can't use same team across tournaments)

#### 4. **team_members**
- Links users to teams
- `is_active`: Whether member is currently active

#### 5. **partnerships**
- For doubles tournaments
- Links two players together
- `status`: 'pending' | 'confirmed' | 'dissolved'

---

## Tournament Joining Flows

### Flow 1: Singles Tournament

**User Journey:**
1. User browses tournaments (GET `/api/v1/tournaments`)
2. User views tournament details (GET `/api/v1/tournaments/:id`)
3. User clicks "Join Tournament"
4. System validates:
   - Tournament is open for registration
   - User is not already registered
   - Tournament is not full
   - Registration dates are valid
5. User registers (POST `/api/v1/tournaments/:id/register`)
6. If entry fee > 0: Payment required → status: 'registered', payment_status: 'pending'
7. If entry fee = 0: Auto-confirmed → status: 'confirmed', payment_status: 'paid'

**API Endpoint:**
```
POST /api/v1/tournaments/:id/register
Body: {} (empty for singles)
```

---

### Flow 2: Doubles Tournament

**User Journey:**
1. User browses tournaments and finds doubles tournament
2. User views tournament details
3. User needs a partner:
   - **Option A**: Create partnership and invite partner
   - **Option B**: Accept existing partnership invitation
4. Once partnership is confirmed, register with partnership
5. System validates partnership is confirmed before registration

**API Endpoints:**
```
POST /api/v1/partnerships
Body: {
  tournament_id: number,
  partner_id: number,
  partnership_name: string (optional)
}

POST /api/v1/tournaments/:id/register
Body: {
  partnership_id: number
}
```

---

### Flow 3: Team-Based Tournament (MAIN FOCUS)

**User Journey:**

#### Scenario A: User Creates New Team
1. User browses tournaments and finds team tournament
2. User views tournament details
3. User clicks "Join Tournament"
4. System checks if user has existing teams for this tournament
5. User selects "Create New Team"
6. User creates team (POST `/api/v1/teams`)
   - Provides team name, description, logo
   - User becomes both creator and captain
7. User invites team members
8. Team members accept invitations
9. Once minimum members reached, captain registers team for tournament
10. System validates team eligibility

#### Scenario B: User Joins with Existing Team
1. User browses tournaments and finds team tournament
2. User views tournament details
3. User clicks "Join Tournament"
4. System shows user's teams for this tournament (GET `/api/v1/teams?tournament_id=:id`)
5. User selects existing team
6. System validates:
   - User is the captain or has permission
   - Team has minimum required members
   - Team is not already registered
7. User registers team for tournament

#### Scenario C: User is Invited to Team
1. User receives team invitation notification
2. User accepts invitation (POST `/api/v1/teams/invitations/:id/accept`)
3. User becomes team member
4. Captain registers team for tournament

**API Endpoints:**
```
# Get user's teams for specific tournament
GET /api/v1/teams?tournament_id=:tournamentId

# Create new team
POST /api/v1/teams
Body: {
  name: string,
  tournament_id: number,
  captain_id: number,
  description: string,
  logo: string,
  max_players: number
}

# Get team details
GET /api/v1/teams/:id

# Invite member to team
POST /api/v1/teams/:id/invite
Body: {
  user_id: number
}

# Register team for tournament
POST /api/v1/tournaments/:id/register
Body: {
  team_id: number
}
```

---

## Current Implementation Issues

### ✅ What's Working:
1. Basic tournament CRUD operations
2. Tournament listing and filtering
3. Singles registration (basic)
4. Team creation and management
5. Team member invitations

### ❌ What Needs Fixing:

1. **Team Registration Logic Missing**
   - `registerForTournament` service currently blocks team registration
   - Need to handle `team_id` in registration data
   - Need to validate team eligibility

2. **No API to Get User's Teams for Tournament**
   - Need endpoint to fetch teams user can use for registration
   - Should filter by tournament_id

3. **Team Validation Before Registration**
   - Check minimum members requirement
   - Verify team belongs to correct tournament
   - Ensure team is not already registered

4. **Partnership Registration**
   - Similar issues as team registration
   - Need partnership validation

5. **Frontend Integration Points Missing**
   - No clear API to determine what registration options user has
   - Need endpoint: "Can I join this tournament? How?"

---

## Proposed API Enhancements

### 1. Get Tournament Join Options
```
GET /api/v1/tournaments/:id/join-options

Response: {
  can_join: boolean,
  reasons: string[],
  options: {
    singles: boolean,
    doubles: {
      available: boolean,
      existing_partnerships: Partnership[],
      can_create_partnership: boolean
    },
    teams: {
      available: boolean,
      existing_teams: Team[],
      can_create_team: boolean,
      min_members_required: number
    }
  }
}
```

### 2. Enhanced Registration Endpoint
```
POST /api/v1/tournaments/:id/register
Body: {
  type: 'singles' | 'doubles' | 'team',
  team_id?: number,
  partnership_id?: number
}
```

### 3. Get Eligible Teams
```
GET /api/v1/tournaments/:id/eligible-teams

Response: {
  teams: [{
    id: number,
    name: string,
    member_count: number,
    is_captain: boolean,
    can_register: boolean,
    reasons: string[]
  }]
}
```

---

## Business Rules

### Singles Tournament
- ✅ User can only register once
- ✅ User cannot be organizer and participant
- ✅ Check max participants limit
- ✅ Validate registration dates

### Doubles Tournament
- ✅ Partnership must be confirmed
- ✅ Both players must not be registered individually
- ✅ Partnership must be for the same tournament
- ✅ Check max participants limit

### Team Tournament
- ✅ Team must belong to the tournament
- ✅ Team must have minimum members (typically 50% of max_players)
- ✅ Only captain or creator can register team
- ✅ Team can only be registered once
- ✅ Team members cannot be in multiple teams for same tournament
- ✅ Check max participants limit (teams, not individual players)

---

## Payment Flow

1. **Free Tournament (entry_fee = 0)**
   - Auto-confirm registration
   - status: 'confirmed', payment_status: 'paid'

2. **Paid Tournament (entry_fee > 0)**
   - Create registration with pending payment
   - status: 'registered', payment_status: 'pending'
   - Redirect to payment gateway
   - On payment success: Update to 'confirmed' and 'paid'
   - On payment failure: Keep as 'registered' and 'pending'

---

## Implementation Priority

### Phase 1: Core Team Registration (HIGH PRIORITY)
1. ✅ Fix `registerForTournament` to handle team_id
2. ✅ Add team eligibility validation
3. ✅ Create `getEligibleTeams` endpoint
4. ✅ Update tournament registration validation

### Phase 2: Enhanced User Experience
1. ✅ Create `getJoinOptions` endpoint
2. ✅ Add partnership registration support
3. ✅ Improve error messages

### Phase 3: Advanced Features
1. Team member role-based permissions
2. Auto-team formation suggestions
3. Team statistics and history

---

## Testing Scenarios

### Test Case 1: User Creates Team and Joins Tournament
1. Create team-based tournament
2. User creates new team for tournament
3. User invites 5 members
4. 3 members accept
5. Captain registers team (should succeed if min = 3)
6. Verify team appears in participants

### Test Case 2: User Joins with Existing Team
1. User has existing team for tournament
2. User navigates to tournament
3. User selects existing team
4. User registers team
5. Verify registration successful

### Test Case 3: Validation Failures
1. Try to register team with insufficient members (should fail)
2. Try to register same team twice (should fail)
3. Try to register team for wrong tournament (should fail)
4. Try to register when not captain (should fail)

---

## Database Queries Needed

### Get User's Teams for Tournament
```sql
SELECT t.*, 
       COUNT(tm.id) as member_count,
       CASE WHEN t.captain_id = ? THEN TRUE ELSE FALSE END as is_captain
FROM teams t
LEFT JOIN team_members tm ON t.id = tm.team_id AND tm.is_active = TRUE
WHERE t.tournament_id = ?
  AND (t.creator_id = ? OR t.captain_id = ? OR EXISTS (
    SELECT 1 FROM team_members WHERE team_id = t.id AND user_id = ? AND is_active = TRUE
  ))
  AND t.deleted_at IS NULL
GROUP BY t.id
```

### Check Team Registration Status
```sql
SELECT COUNT(*) as count
FROM tournament_participants
WHERE tournament_id = ?
  AND team_id = ?
  AND status NOT IN ('withdrawn', 'disqualified')
```

### Validate Team Eligibility
```sql
SELECT 
  t.*,
  COUNT(tm.id) as member_count,
  t.max_players,
  CASE WHEN COUNT(tm.id) >= CEIL(t.max_players / 2) THEN TRUE ELSE FALSE END as has_min_members
FROM teams t
LEFT JOIN team_members tm ON t.id = tm.team_id AND tm.is_active = TRUE
WHERE t.id = ?
  AND t.tournament_id = ?
  AND t.deleted_at IS NULL
GROUP BY t.id
```

---

## Next Steps

1. ✅ Implement enhanced `registerForTournament` service
2. ✅ Create team eligibility validation functions
3. ✅ Add new API endpoints
4. ✅ Update validators
5. ✅ Test all scenarios
6. ✅ Update frontend to use new APIs
