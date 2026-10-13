# Team Eligibility Implementation Summary

## Overview
Enhanced the tournament team eligibility system to support both tournament-specific teams and reusable teams, with comprehensive validation APIs.

---

## Changes Made

### 1. Updated Service Layer (`tournamentService.js`)

#### Enhanced `getEligibleTeams()` Function
- **Before**: Only showed tournament-specific teams for the tournament
- **After**: Shows both tournament-specific AND reusable teams created by the user
- **Key Features**:
  - Filters reusable teams by matching sport_id
  - Shows teams where user is creator, captain, or member
  - Checks registration status across both team types
  - Returns detailed eligibility information

#### Enhanced `validateTeamForTournament()` Function
- **Before**: Only validated tournament-specific teams
- **After**: Validates both team types with appropriate checks
- **Key Features**:
  - Tournament-specific: Validates tournament_id match
  - Reusable: Validates sport_id match and checks registration table
  - Verifies user permissions (captain or creator)
  - Ensures full team (all member slots filled)

#### New `checkTeamEligibility()` Function
- Comprehensive validation endpoint
- Returns detailed eligibility status with reasons
- Checks all tournament and team requirements
- Provides team and tournament information for context

### 2. Updated Controller Layer (`tournamentController.js`)

#### New `checkTeamEligibility()` Controller
- Handles GET `/api/v1/tournaments/:id/check-team-eligibility/:teamId`
- Returns validation results with detailed feedback
- Error handling with appropriate status codes

### 3. Updated Routes (`tournament.routes.js`)

#### New Route
```javascript
GET /api/v1/tournaments/:id/check-team-eligibility/:teamId
```
- Protected route (requires authentication)
- Validates team eligibility for tournament registration

---

## API Endpoints

### 1. Get Eligible Teams
**GET** `/api/v1/tournaments/:id/eligible-teams`

**Returns:**
- Tournament-specific teams for this tournament
- Reusable teams created by user with matching sport
- Eligibility status and reasons for each team

**Response Example:**
```json
{
  "success": true,
  "data": [
    {
      "id": 25,
      "name": "Thunder Strikers",
      "is_tournament_specific": true,
      "tournament_id": 3,
      "member_count": 11,
      "max_players": 11,
      "can_register": true,
      "reasons": []
    },
    {
      "id": 30,
      "name": "Lightning Bolts",
      "is_tournament_specific": false,
      "tournament_id": null,
      "sport_id": 1,
      "member_count": 11,
      "max_players": 11,
      "can_register": true,
      "reasons": []
    }
  ]
}
```

### 2. Check Team Eligibility
**GET** `/api/v1/tournaments/:id/check-team-eligibility/:teamId`

**Returns:**
- Detailed eligibility validation
- Reasons for ineligibility (if any)
- Team and tournament information

**Response Example:**
```json
{
  "success": true,
  "data": {
    "eligible": true,
    "reasons": ["Team is eligible to register"],
    "team_info": {
      "id": 25,
      "name": "Thunder Strikers",
      "is_tournament_specific": true,
      "sport_id": 1,
      "member_count": 11,
      "max_players": 11
    },
    "tournament_info": {
      "id": 3,
      "name": "City Championship",
      "sport_id": 1,
      "category": "teams",
      "status": "open"
    }
  }
}
```

---

## Validation Rules

### Team Eligibility Checks
1. ✅ Team exists in database
2. ✅ Tournament exists and is a team tournament
3. ✅ Tournament status is 'open'
4. ✅ Current time is within registration window
5. ✅ Tournament is not full
6. ✅ Team type validation:
   - **Tournament-specific**: Must belong to this tournament
   - **Reusable**: Must match tournament sport
7. ✅ Team is not already registered
8. ✅ User is captain or creator
9. ✅ Team has all required members (full team)

---

## Database Schema Support

The implementation leverages existing schema features:

### Teams Table
```sql
CREATE TABLE teams (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    tournament_id INT NULL,  -- NULL for reusable teams
    creator_id INT NOT NULL,
    captain_id INT NOT NULL,
    is_tournament_specific BOOLEAN DEFAULT TRUE,
    sport_id INT NULL,  -- Required for reusable teams
    max_players INT DEFAULT 11,
    ...
);
```

### Team Tournament Registrations Table
```sql
CREATE TABLE team_tournament_registrations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    team_id INT NOT NULL,
    tournament_id INT NOT NULL,
    status ENUM('pending', 'confirmed', 'rejected', 'withdrawn'),
    payment_status ENUM('pending', 'paid', 'refunded', 'waived'),
    ...
);
```

---

## Usage Flow

### For Tournament-Specific Teams
1. User creates team for specific tournament
2. User invites members and they accept
3. User calls `/tournaments/:id/eligible-teams` to see their team
4. User registers team using `/tournaments/:id/register`

### For Reusable Teams
1. User creates reusable team (not tied to tournament)
2. User invites members and they accept
3. When viewing any tournament of matching sport:
   - User calls `/tournaments/:id/eligible-teams`
   - Reusable team appears in the list
4. User can optionally call `/tournaments/:id/check-team-eligibility/:teamId`
5. User registers team using `/tournaments/:id/register`
6. Same team can be registered for other tournaments later

---

## Benefits

### 1. Reusability
- Teams can be used across multiple tournaments
- No need to recreate teams for each tournament
- Maintains team identity and history

### 2. Flexibility
- Users can choose between tournament-specific or reusable teams
- Tournament-specific teams for one-time events
- Reusable teams for regular participation

### 3. Better UX
- Clear indication of why teams cannot register
- Detailed validation feedback
- Separate API for pre-registration checks

### 4. Data Integrity
- Comprehensive validation prevents invalid registrations
- Checks both team and tournament requirements
- Ensures proper permissions and member counts

---

## Frontend Integration Tips

### 1. Display Team Types
```javascript
{team.is_tournament_specific ? (
  <span className="badge">Tournament Team</span>
) : (
  <span className="badge">Reusable Team</span>
)}
```

### 2. Show Eligibility Status
```javascript
{team.can_register ? (
  <button onClick={() => registerTeam(team.id)}>
    Register Team
  </button>
) : (
  <div className="reasons">
    <p>Cannot register:</p>
    <ul>
      {team.reasons.map(reason => (
        <li key={reason}>{reason}</li>
      ))}
    </ul>
  </div>
)}
```

### 3. Pre-validate Before Registration
```javascript
const validateBeforeRegister = async (teamId) => {
  const response = await fetch(
    `/api/v1/tournaments/${tournamentId}/check-team-eligibility/${teamId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const { data } = await response.json();
  
  if (!data.eligible) {
    alert(`Cannot register: ${data.reasons.join(', ')}`);
    return false;
  }
  return true;
};
```

---

## Testing Checklist

### Get Eligible Teams API
- [ ] Returns tournament-specific teams for the tournament
- [ ] Returns reusable teams with matching sport
- [ ] Filters by user (creator, captain, or member)
- [ ] Shows correct registration status
- [ ] Indicates if team can register
- [ ] Provides reasons when cannot register
- [ ] Returns empty array for non-team tournaments

### Check Team Eligibility API
- [ ] Validates team exists
- [ ] Validates tournament exists
- [ ] Checks tournament is team category
- [ ] Checks tournament status is open
- [ ] Validates registration dates
- [ ] Checks tournament capacity
- [ ] Validates team type and sport match
- [ ] Checks team not already registered
- [ ] Validates team has full member count
- [ ] Returns detailed reasons for ineligibility

### Registration Flow
- [ ] Tournament-specific team can register
- [ ] Reusable team can register for matching sport
- [ ] Reusable team rejected for wrong sport
- [ ] Team with insufficient members rejected
- [ ] Already registered team rejected
- [ ] Non-captain/creator cannot register team

---

## Files Modified

1. **src/services/tournamentService.js**
   - Enhanced `getEligibleTeams()`
   - Enhanced `validateTeamForTournament()`
   - Added `checkTeamEligibility()`

2. **src/controllers/tournamentController.js**
   - Added `checkTeamEligibility()` controller

3. **src/routes/tournament.routes.js**
   - Added new route for team eligibility check

4. **Documentation**
   - Created `TEAM_ELIGIBILITY_API_GUIDE.md`
   - Created `TEAM_ELIGIBILITY_IMPLEMENTATION_SUMMARY.md`

---

## Next Steps

### Optional Enhancements
1. Add pagination for teams list if user has many teams
2. Add filtering options (by sport, by registration status)
3. Add sorting options (by name, by creation date)
4. Cache eligible teams with invalidation on team changes
5. Add webhook/notification when team becomes eligible

### Frontend Tasks
1. Update tournament detail page to show eligible teams
2. Add team selection UI for registration
3. Display team type badges
4. Show eligibility reasons clearly
5. Add pre-registration validation
6. Implement team creation flow for tournaments

---

## Support

For detailed API documentation, see `TEAM_ELIGIBILITY_API_GUIDE.md`

For general tournament flow, see `docs/TOURNAMENT_JOINING_API_GUIDE.md`
