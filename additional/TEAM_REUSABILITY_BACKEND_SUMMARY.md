# Team Reusability - Backend Implementation Summary

## Overview
Updated the backend to support both **tournament-specific teams** and **reusable teams** that can participate in multiple tournaments.

---

## Database Changes

### 1. Migration File: `03_update_teams_for_reusability.sql`

#### New Columns Added to `teams` table:
```sql
is_tournament_specific BOOLEAN DEFAULT TRUE NOT NULL
  -- TRUE: Team is for specific tournament only
  -- FALSE: Team can be used across tournaments

sport_id INT NULL
  -- Required for reusable teams
  -- Defines sport type when not tournament-specific

is_public BOOLEAN DEFAULT FALSE NOT NULL
  -- If TRUE, team is visible to all users for joining
```

#### Modified Columns:
```sql
tournament_id INT NULL
  -- Now nullable for reusable teams
  -- Required only if is_tournament_specific = TRUE
```

#### New Table: `team_tournament_registrations`
```sql
CREATE TABLE team_tournament_registrations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    team_id INT NOT NULL,
    tournament_id INT NOT NULL,
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'confirmed', 'rejected', 'withdrawn') DEFAULT 'pending',
    payment_status ENUM('pending', 'paid', 'refunded', 'waived') DEFAULT 'pending',
    
    UNIQUE KEY unique_team_tournament_registration (team_id, tournament_id),
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
)
```

#### Updated Constraints:
```sql
-- Check constraint ensures proper team configuration
ALTER TABLE teams
ADD CONSTRAINT check_team_tournament_or_sport CHECK (
    (is_tournament_specific = TRUE AND tournament_id IS NOT NULL) OR
    (is_tournament_specific = FALSE AND sport_id IS NOT NULL)
);
```

---

## Model Changes: `Team.js`

### Updated Functions:

#### 1. `create(teamData)`
**New Parameters:**
- `is_tournament_specific` (boolean, default: true)
- `sport_id` (int, required for reusable teams)
- `is_public` (boolean, default: false)

**Validation:**
- Tournament-specific teams must have `tournament_id`
- Reusable teams must have `sport_id`

#### 2. `findById(id)`
**Updated Query:**
- Uses `COALESCE(tour.sport_id, t.sport_id)` to get sport from either tournament or team

#### 3. `findAll(filters)`
**New Filters:**
- `sport_id` - Filter by sport
- `is_tournament_specific` - Filter by team type
- `is_public` - Filter by visibility

### New Functions:

#### 1. `registerForTournament(teamId, tournamentId)`
Registers a reusable team for a tournament.

```javascript
const registrationId = await Team.registerForTournament(teamId, tournamentId);
```

#### 2. `getTeamTournamentRegistrations(teamId)`
Gets all tournament registrations for a team.

```javascript
const registrations = await Team.getTeamTournamentRegistrations(teamId);
```

#### 3. `getReusableTeamsForTournament(userId, sportId)`
Gets reusable teams available for a user to register in tournaments.

```javascript
const teams = await Team.getReusableTeamsForTournament(userId, sportId);
```

#### 4. `isRegisteredForTournament(teamId, tournamentId)`
Checks if team is already registered for a tournament.

```javascript
const isRegistered = await Team.isRegisteredForTournament(teamId, tournamentId);
```

---

## Validator Changes: `teamValidator.js`

### Updated: `createTeamValidation`

```javascript
body('is_tournament_specific')
  .optional()
  .isBoolean(),

body('tournament_id')
  .optional()
  .isInt({ min: 1 })
  .custom((value, { req }) => {
    if (req.body.is_tournament_specific === true && !value) {
      throw new Error('Tournament ID is required for tournament-specific teams');
    }
    return true;
  }),

body('sport_id')
  .optional()
  .isInt({ min: 1 })
  .custom((value, { req }) => {
    if (req.body.is_tournament_specific === false && !value) {
      throw new Error('Sport ID is required for reusable teams');
    }
    return true;
  }),

body('is_public')
  .optional()
  .isBoolean()
```

### New Validators:

#### 1. `registerTeamForTournamentValidation`
Validates team tournament registration requests.

#### 2. `getReusableTeamsValidation`
Validates requests to get reusable teams (requires sport_id).

---

## Controller Changes: `teamController.js`

### New Endpoints:

#### 1. `registerTeamForTournament`
```javascript
POST /api/v1/teams/:id/register-tournament
Body: { tournament_id: number }
```

#### 2. `getReusableTeams`
```javascript
GET /api/v1/teams/reusable?sport_id=1
```

#### 3. `getTeamTournamentRegistrations`
```javascript
GET /api/v1/teams/:id/tournament-registrations
```

---

## Service Changes: `teamService.js`

### Updated: `createTeam(teamData, creatorId)`

**New Logic:**
- Validates tournament-specific teams (existing logic)
- Validates reusable teams (new logic)
- Checks sport_id for reusable teams

### New Functions:

#### 1. `registerTeamForTournament(teamId, tournamentId, userId)`

**Validation:**
- Team exists and is reusable
- User is team member
- Tournament exists and allows teams
- Team sport matches tournament sport
- Team not already registered
- Team has required number of members

**Returns:** Updated team object

#### 2. `getReusableTeams(userId, sportId)`
Returns reusable teams available for user filtered by sport.

#### 3. `getTeamTournamentRegistrations(teamId)`
Returns all tournament registrations for a team.

---

## Routes: `team.routes.js`

### New Routes:

```javascript
// Get reusable teams for tournament registration
GET /api/v1/teams/reusable?sport_id=1
Auth: Required

// Register reusable team for tournament
POST /api/v1/teams/:id/register-tournament
Body: { tournament_id: number }
Auth: Required (Team member)

// Get team's tournament registrations
GET /api/v1/teams/:id/tournament-registrations
Auth: Required
```

---

## API Usage Examples

### 1. Create Tournament-Specific Team (Existing Behavior)
```bash
POST /api/v1/teams
{
  "name": "Warriors",
  "tournament_id": 5,
  "is_tournament_specific": true,  # default
  "max_players": 11
}
```

### 2. Create Reusable Team (New Feature)
```bash
POST /api/v1/teams
{
  "name": "City Champions",
  "sport_id": 1,  # Football
  "is_tournament_specific": false,
  "is_public": false,
  "max_players": 11
}
```

### 3. Get Reusable Teams for Tournament
```bash
GET /api/v1/teams/reusable?sport_id=1
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": [
    {
      "id": 10,
      "name": "City Champions",
      "sport_id": 1,
      "sport_name": "Football",
      "is_tournament_specific": false,
      "member_count": 11,
      "creator_first_name": "John",
      "captain_first_name": "Mike"
    }
  ]
}
```

### 4. Register Reusable Team for Tournament
```bash
POST /api/v1/teams/10/register-tournament
Authorization: Bearer <token>
{
  "tournament_id": 5
}

Response:
{
  "success": true,
  "message": "Team registered for tournament successfully",
  "data": { ...team object... }
}
```

### 5. Get Team's Tournament Registrations
```bash
GET /api/v1/teams/10/tournament-registrations
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": [
    {
      "id": 1,
      "team_id": 10,
      "tournament_id": 5,
      "tournament_name": "Summer Championship",
      "start_date": "2025-11-01",
      "status": "pending",
      "payment_status": "pending"
    }
  ]
}
```

---

## Migration Steps

### 1. Run Migration
```bash
mysql -u root -p sportlife < database/03_update_teams_for_reusability.sql
```

### 2. Verify Migration
```sql
-- Check new columns
DESCRIBE teams;

-- Check new table
DESCRIBE team_tournament_registrations;

-- Verify existing teams migrated correctly
SELECT id, name, is_tournament_specific, tournament_id, sport_id 
FROM teams LIMIT 10;
```

### 3. Test New Features
- Create a reusable team
- Register it for a tournament
- Get reusable teams list
- Check tournament registrations

---

## Key Features

### ✅ Tournament-Specific Teams (Existing)
- Created for one specific tournament
- Cannot be used in other tournaments
- Automatically registered for their tournament

### ✅ Reusable Teams (New)
- Created independently of tournaments
- Can participate in multiple tournaments
- Must be registered for each tournament
- Sport-specific (e.g., Football team, Cricket team)
- Can be public or private

### ✅ Team Visibility
- **Private teams:** Only creator, captain, and members can see/use
- **Public teams:** Visible to all users for the same sport

### ✅ Registration Management
- Track which tournaments a team is registered for
- Separate registration status per tournament
- Payment tracking per tournament

---

## Validation Rules

### Creating Tournament-Specific Team:
- ✅ `tournament_id` required
- ✅ Tournament must exist
- ✅ Tournament category must be 'teams'
- ✅ Unique team name per tournament

### Creating Reusable Team:
- ✅ `sport_id` required
- ✅ Sport must exist
- ✅ `is_tournament_specific` must be false

### Registering Team for Tournament:
- ✅ Team must be reusable
- ✅ User must be team member
- ✅ Tournament must exist and allow teams
- ✅ Team sport must match tournament sport
- ✅ Team not already registered
- ✅ Team must have all required members

---

## Error Messages

```javascript
// Team type errors
"This team is tournament-specific and cannot be registered for other tournaments"
"Sport ID is required for reusable teams"
"Tournament ID is required for tournament-specific teams"

// Registration errors
"Team not found"
"Tournament not found"
"Only team members can register the team for tournaments"
"This tournament does not support team registration"
"Team sport does not match tournament sport"
"Team is already registered for this tournament"
"Team must have all 11 members to register (currently has 8)"
```

---

## Database Indexes

```sql
-- Performance indexes added
INDEX idx_teams_sport (sport_id)
INDEX idx_teams_tournament_specific (is_tournament_specific)
INDEX idx_team_tournament_reg_team (team_id)
INDEX idx_team_tournament_reg_tournament (tournament_id)
INDEX idx_team_tournament_reg_status (status)
```

---

## Backward Compatibility

✅ **Fully backward compatible!**

- Existing teams automatically marked as `is_tournament_specific = TRUE`
- Existing API calls work without changes
- Default behavior unchanged (teams are tournament-specific by default)
- Migration creates registrations for existing tournament-specific teams

---

## Next Steps

1. ✅ Run database migration
2. ✅ Test backend APIs
3. ⏳ Update frontend to support team type selection
4. ⏳ Add UI for registering reusable teams
5. ⏳ Show team's tournament history

---

## Summary

The backend now supports:
- **Two team types:** Tournament-specific and Reusable
- **Team registration:** Reusable teams can register for multiple tournaments
- **Registration tracking:** Track all tournaments a team participates in
- **Sport-based filtering:** Find reusable teams by sport
- **Public/Private teams:** Control team visibility
- **Full validation:** Ensure teams meet requirements before registration

All changes are backward compatible and existing functionality remains intact!
