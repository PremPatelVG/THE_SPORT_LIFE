# Team Eligibility API - Complete Guide

## Overview
This guide covers the enhanced team eligibility system that supports both tournament-specific teams and reusable teams for tournament registration.

---

## Table of Contents
1. [Team Types](#team-types)
2. [Get Eligible Teams API](#get-eligible-teams-api)
3. [Check Team Eligibility API](#check-team-eligibility-api)
4. [Usage Examples](#usage-examples)
5. [Frontend Integration](#frontend-integration)

---

## Team Types

### Tournament-Specific Teams
- Created for a specific tournament
- `is_tournament_specific = TRUE`
- `tournament_id` is set to the specific tournament
- Can only be used for that one tournament

### Reusable Teams
- Created independently of any tournament
- `is_tournament_specific = FALSE`
- `tournament_id = NULL`
- `sport_id` defines the sport type
- Can be registered for multiple tournaments of the same sport

---

## Get Eligible Teams API

### Endpoint
**GET** `/api/v1/tournaments/:id/eligible-teams`

### Description
Returns all teams that the logged-in user can use to register for the tournament. This includes:
1. **Tournament-specific teams** created for this tournament where the user is a member
2. **Reusable teams** created by the user that match the tournament's sport

### Authentication
Required - JWT token in Authorization header

### Request Parameters
- `id` (path parameter) - Tournament ID

### Response Format
```json
{
  "success": true,
  "data": [
    {
      "id": 25,
      "name": "Thunder Strikers",
      "description": "Best team in the city",
      "tournament_id": 3,
      "is_tournament_specific": true,
      "sport_id": 1,
      "member_count": 11,
      "max_players": 11,
      "is_captain": true,
      "is_creator": true,
      "is_registered": false,
      "min_members_required": 11,
      "can_register": true,
      "reasons": [],
      "logo": "team_logo.png",
      "created_at": "2024-11-15T10:30:00.000Z"
    },
    {
      "id": 30,
      "name": "Lightning Bolts",
      "description": "Reusable team for all tournaments",
      "tournament_id": null,
      "is_tournament_specific": false,
      "sport_id": 1,
      "member_count": 11,
      "max_players": 11,
      "is_captain": false,
      "is_creator": true,
      "is_registered": false,
      "min_members_required": 11,
      "can_register": true,
      "reasons": [],
      "logo": null,
      "created_at": "2024-10-20T08:15:00.000Z"
    }
  ]
}
```

### Response Fields
- **id**: Team ID
- **name**: Team name
- **description**: Team description
- **tournament_id**: Tournament ID (null for reusable teams)
- **is_tournament_specific**: Boolean indicating team type
- **sport_id**: Sport ID (for reusable teams)
- **member_count**: Current number of active members
- **max_players**: Maximum team size
- **is_captain**: Whether the user is the team captain
- **is_creator**: Whether the user created the team
- **is_registered**: Whether the team is already registered for this tournament
- **min_members_required**: Minimum members needed (same as max_players - full team required)
- **can_register**: Boolean indicating if the team can be registered
- **reasons**: Array of reasons why the team cannot register (empty if can_register is true)
- **logo**: Team logo URL
- **created_at**: Team creation timestamp

### Example Request
```bash
curl -X GET "http://localhost:5000/api/v1/tournaments/3/eligible-teams" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Example Response - Team Cannot Register
```json
{
  "success": true,
  "data": [
    {
      "id": 28,
      "name": "Storm Chasers",
      "tournament_id": 3,
      "is_tournament_specific": true,
      "sport_id": 1,
      "member_count": 8,
      "max_players": 11,
      "is_captain": false,
      "is_creator": false,
      "is_registered": false,
      "min_members_required": 11,
      "can_register": false,
      "reasons": [
        "Only captain or creator can register",
        "Team must have all 11 members (currently has 8)"
      ]
    }
  ]
}
```

---

## Check Team Eligibility API

### Endpoint
**GET** `/api/v1/tournaments/:id/check-team-eligibility/:teamId`

### Description
Validates whether a specific team is eligible to join a tournament. Returns detailed information about eligibility status and reasons.

### Authentication
Required - JWT token in Authorization header

### Request Parameters
- `id` (path parameter) - Tournament ID
- `teamId` (path parameter) - Team ID to check

### Response Format
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

### Response Fields
- **eligible**: Boolean indicating if the team can register
- **reasons**: Array of validation messages
- **team_info**: Details about the team
  - **id**: Team ID
  - **name**: Team name
  - **is_tournament_specific**: Team type
  - **sport_id**: Sport ID
  - **member_count**: Current active members
  - **max_players**: Maximum team size
- **tournament_info**: Details about the tournament
  - **id**: Tournament ID
  - **name**: Tournament name
  - **sport_id**: Sport ID
  - **category**: Tournament category
  - **status**: Tournament status

### Example Request
```bash
curl -X GET "http://localhost:5000/api/v1/tournaments/3/check-team-eligibility/25" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Example Response - Team Not Eligible
```json
{
  "success": true,
  "data": {
    "eligible": false,
    "reasons": [
      "Tournament registration is not open",
      "Team must have all 11 members (currently has 8)"
    ],
    "team_info": {
      "id": 25,
      "name": "Thunder Strikers",
      "is_tournament_specific": true,
      "sport_id": 1,
      "member_count": 8,
      "max_players": 11
    },
    "tournament_info": {
      "id": 3,
      "name": "City Championship",
      "sport_id": 1,
      "category": "teams",
      "status": "closed"
    }
  }
}
```

### Validation Checks Performed
1. **Team exists** - Team must be found in database
2. **Tournament exists** - Tournament must be found in database
3. **Tournament category** - Must be a team tournament
4. **Tournament status** - Must be 'open'
5. **Registration dates** - Current time must be within registration window
6. **Tournament capacity** - Tournament must not be full
7. **Team type validation**:
   - Tournament-specific: Must belong to this tournament
   - Reusable: Must match tournament sport
8. **Registration status** - Team must not already be registered
9. **Member count** - Team must have all required members (full team)

---

## Usage Examples

### Scenario 1: User Wants to Register a Tournament-Specific Team

```bash
# Step 1: Get eligible teams
curl -X GET "http://localhost:5000/api/v1/tournaments/3/eligible-teams" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response shows tournament-specific team
{
  "success": true,
  "data": [
    {
      "id": 25,
      "name": "Thunder Strikers",
      "is_tournament_specific": true,
      "tournament_id": 3,
      "can_register": true,
      "reasons": []
    }
  ]
}

# Step 2: Register the team
curl -X POST "http://localhost:5000/api/v1/tournaments/3/register" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"team_id": 25}'
```

### Scenario 2: User Wants to Use a Reusable Team

```bash
# Step 1: Get eligible teams (includes reusable teams)
curl -X GET "http://localhost:5000/api/v1/tournaments/3/eligible-teams" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response shows reusable team
{
  "success": true,
  "data": [
    {
      "id": 30,
      "name": "Lightning Bolts",
      "is_tournament_specific": false,
      "tournament_id": null,
      "sport_id": 1,
      "can_register": true,
      "reasons": []
    }
  ]
}

# Step 2: Validate eligibility (optional but recommended)
curl -X GET "http://localhost:5000/api/v1/tournaments/3/check-team-eligibility/30" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Step 3: Register the reusable team
curl -X POST "http://localhost:5000/api/v1/tournaments/3/register" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"team_id": 30}'
```

### Scenario 3: Check Why Team Cannot Register

```bash
# Check team eligibility
curl -X GET "http://localhost:5000/api/v1/tournaments/3/check-team-eligibility/28" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response explains issues
{
  "success": true,
  "data": {
    "eligible": false,
    "reasons": [
      "Team must have all 11 members (currently has 8)",
      "Registration has closed"
    ]
  }
}
```

---

## Frontend Integration

### React Example - Team Selection Component

```javascript
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TeamSelectionForTournament = ({ tournamentId, onTeamSelected }) => {
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchEligibleTeams();
  }, [tournamentId]);

  const fetchEligibleTeams = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `/api/v1/tournaments/${tournamentId}/eligible-teams`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      setTeams(response.data.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch teams');
    } finally {
      setLoading(false);
    }
  };

  const checkTeamEligibility = async (teamId) => {
    try {
      const response = await axios.get(
        `/api/v1/tournaments/${tournamentId}/check-team-eligibility/${teamId}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }
      );
      return response.data.data;
    } catch (err) {
      console.error('Eligibility check failed:', err);
      return null;
    }
  };

  const handleTeamSelect = async (team) => {
    if (!team.can_register) {
      alert(`Cannot register this team:\n${team.reasons.join('\n')}`);
      return;
    }

    // Optional: Double-check eligibility
    const eligibility = await checkTeamEligibility(team.id);
    if (!eligibility?.eligible) {
      alert(`Team is not eligible:\n${eligibility.reasons.join('\n')}`);
      return;
    }

    setSelectedTeam(team);
    onTeamSelected(team);
  };

  if (loading) return <div>Loading teams...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="team-selection">
      <h3>Select a Team to Register</h3>
      
      {teams.length === 0 ? (
        <div className="no-teams">
          <p>You don't have any eligible teams for this tournament.</p>
          <button onClick={() => window.location.href = '/teams/create'}>
            Create a Team
          </button>
        </div>
      ) : (
        <div className="teams-grid">
          {teams.map(team => (
            <div 
              key={team.id} 
              className={`team-card ${!team.can_register ? 'disabled' : ''}`}
            >
              <div className="team-header">
                <h4>{team.name}</h4>
                {team.is_tournament_specific ? (
                  <span className="badge tournament-specific">Tournament Team</span>
                ) : (
                  <span className="badge reusable">Reusable Team</span>
                )}
              </div>
              
              <div className="team-info">
                <p>{team.description}</p>
                <p>Members: {team.member_count}/{team.max_players}</p>
                {team.is_creator && <span className="badge">Creator</span>}
                {team.is_captain && <span className="badge">Captain</span>}
              </div>

              {team.can_register ? (
                <button 
                  onClick={() => handleTeamSelect(team)}
                  className="btn-primary"
                >
                  Select Team
                </button>
              ) : (
                <div className="reasons">
                  <p className="error">Cannot register:</p>
                  <ul>
                    {team.reasons.map((reason, idx) => (
                      <li key={idx}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeamSelectionForTournament;
```

### Vue.js Example

```vue
<template>
  <div class="team-selection">
    <h3>Select a Team to Register</h3>
    
    <div v-if="loading">Loading teams...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    
    <div v-else-if="teams.length === 0" class="no-teams">
      <p>You don't have any eligible teams for this tournament.</p>
      <button @click="createTeam">Create a Team</button>
    </div>
    
    <div v-else class="teams-grid">
      <div 
        v-for="team in teams" 
        :key="team.id"
        :class="['team-card', { disabled: !team.can_register }]"
      >
        <div class="team-header">
          <h4>{{ team.name }}</h4>
          <span 
            :class="['badge', team.is_tournament_specific ? 'tournament-specific' : 'reusable']"
          >
            {{ team.is_tournament_specific ? 'Tournament Team' : 'Reusable Team' }}
          </span>
        </div>
        
        <div class="team-info">
          <p>{{ team.description }}</p>
          <p>Members: {{ team.member_count }}/{{ team.max_players }}</p>
          <span v-if="team.is_creator" class="badge">Creator</span>
          <span v-if="team.is_captain" class="badge">Captain</span>
        </div>

        <button 
          v-if="team.can_register"
          @click="selectTeam(team)"
          class="btn-primary"
        >
          Select Team
        </button>
        
        <div v-else class="reasons">
          <p class="error">Cannot register:</p>
          <ul>
            <li v-for="(reason, idx) in team.reasons" :key="idx">
              {{ reason }}
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'TeamSelectionForTournament',
  props: {
    tournamentId: {
      type: Number,
      required: true
    }
  },
  data() {
    return {
      teams: [],
      loading: true,
      error: null
    };
  },
  mounted() {
    this.fetchEligibleTeams();
  },
  methods: {
    async fetchEligibleTeams() {
      try {
        this.loading = true;
        const response = await axios.get(
          `/api/v1/tournaments/${this.tournamentId}/eligible-teams`,
          {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          }
        );
        this.teams = response.data.data;
      } catch (err) {
        this.error = err.response?.data?.error || 'Failed to fetch teams';
      } finally {
        this.loading = false;
      }
    },
    
    async checkTeamEligibility(teamId) {
      try {
        const response = await axios.get(
          `/api/v1/tournaments/${this.tournamentId}/check-team-eligibility/${teamId}`,
          {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
          }
        );
        return response.data.data;
      } catch (err) {
        console.error('Eligibility check failed:', err);
        return null;
      }
    },
    
    async selectTeam(team) {
      if (!team.can_register) {
        alert(`Cannot register this team:\n${team.reasons.join('\n')}`);
        return;
      }

      // Optional: Double-check eligibility
      const eligibility = await this.checkTeamEligibility(team.id);
      if (!eligibility?.eligible) {
        alert(`Team is not eligible:\n${eligibility.reasons.join('\n')}`);
        return;
      }

      this.$emit('team-selected', team);
    },
    
    createTeam() {
      this.$router.push('/teams/create');
    }
  }
};
</script>
```

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Tournament not found"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "No token provided"
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Team not found"
}
```

---

## Key Features

### 1. Dual Team Support
- Supports both tournament-specific and reusable teams
- Automatically filters teams based on tournament sport for reusable teams

### 2. Comprehensive Validation
- Checks tournament status and registration dates
- Validates team member count requirements
- Ensures teams aren't already registered
- Verifies user permissions (captain or creator)

### 3. Detailed Feedback
- Provides clear reasons why teams cannot register
- Returns team and tournament information for context
- Helps users understand what needs to be fixed

### 4. Flexible Registration
- Reusable teams can participate in multiple tournaments
- Tournament-specific teams are tied to one tournament
- Users can create teams for specific tournaments or general use

---

## Best Practices

1. **Always check eligibility** before showing registration options
2. **Display clear reasons** when teams cannot register
3. **Show team type badges** to distinguish tournament-specific vs reusable teams
4. **Validate on both frontend and backend** for better UX and security
5. **Provide team creation links** when no eligible teams exist
6. **Cache eligible teams** but refresh when team membership changes

---

## Support

For issues or questions, refer to the main tournament documentation or contact the development team.
