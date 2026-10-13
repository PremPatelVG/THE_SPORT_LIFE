# Complete Scoring System API Documentation

## 🎯 Overview

This document provides complete API documentation for the live scoring system, including all event types, JSON structures, and Postman testing examples.

**Base URL:** `http://localhost:3000/api/v1/scoring`

---

## 📋 Table of Contents

1. [API Endpoints](#api-endpoints)
2. [Event Types by Sport](#event-types-by-sport)
3. [JSON Score Structures](#json-score-structures)
4. [Postman Examples](#postman-examples)
5. [WebSocket Events](#websocket-events)

---

## API ENDPOINTS

### 1. Start Match
**POST** `/api/v1/scoring/:matchId/start`

**Auth Required:** ✅

**Request Body:**
```json
{
  "sport_id": 1
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "match_id": 101,
    "sport_id": 1,
    "current_period": 1,
    "period_type": "regular",
    "participant1_score": {"sets": [], "current_game": {"p1": "0", "p2": "0"}},
    "participant2_score": {"sets": [], "current_game": {"p1": "0", "p2": "0"}},
    "is_live": true,
    "is_paused": false
  },
  "message": "Match started successfully"
}
```

---

### 2. Record Scoring Event
**POST** `/api/v1/scoring/:matchId/events`

**Auth Required:** ✅

**Request Body:**
```json
{
  "event_type": "ace",
  "player_id": 55,
  "event_data": {
    "method": "ace",
    "set": 2,
    "game": 5,
    "notes": "Powerful serve"
  }
}
```

**Valid Event Types by Sport:**
- **Tennis/Padel:** `ace`, `double_fault`, `winner`, `unforced_error`, `forced_error`, `let`
- **Badminton:** `rally_won`, `service_fault`, `net_fault`, `shuttle_out`, `smash`
- **Volleyball:** `spike`, `block`, `ace`, `service_error`, `rotation`
- **Football:** `goal`, `own_goal`, `penalty_goal`, `yellow_card`, `red_card`, `substitution`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "match_id": 101,
    "participant1_score": {"sets": [{"p1": 6, "p2": 4}], "current_game": {"p1": "40", "p2": "40"}},
    "participant2_score": {...},
    "last_event_time": "2024-01-15T14:30:25.000Z"
  },
  "message": "Event recorded successfully"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Invalid event type 'invalid_event' for tennis. Valid types: ace, double_fault, winner, unforced_error, forced_error, let"
}
```

---

### 3. Undo Last Event ⭐ NEW
**POST** `/api/v1/scoring/:matchId/undo`

**Auth Required:** ✅

**Request Body:** Empty

**Response (200):**
```json
{
  "success": true,
  "data": {
    "match_id": 101,
    "participant1_score": {"sets": [], "current_game": {"p1": "30", "p2": "40"}},
    "participant2_score": {...}
  },
  "message": "Last event undone successfully"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "No events to undo"
}
```

---

### 4. Pause Match ⭐ NEW
**POST** `/api/v1/scoring/:matchId/pause`

**Auth Required:** ✅

**Request Body:**
```json
{
  "reason": "Injury timeout"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Match paused",
    "reason": "Injury timeout"
  }
}
```

---

### 5. Resume Match ⭐ NEW
**POST** `/api/v1/scoring/:matchId/resume`

**Auth Required:** ✅

**Request Body:** Empty

**Response (200):**
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Match resumed"
  }
}
```

---

### 6. Get Live State
**GET** `/api/v1/scoring/:matchId/live`

**Auth Required:** ❌

**Response (200):**
```json
{
  "success": true,
  "data": {
    "match_id": 101,
    "sport_id": 1,
    "current_period": 2,
    "period_type": "regular",
    "participant1_score": {...},
    "participant2_score": {...},
    "current_server": 55,
    "elapsed_time_seconds": 3600,
    "is_live": true,
    "is_paused": false,
    "last_event_time": "2024-01-15T14:30:25.000Z"
  }
}
```

---

### 7. Get Match Timeline
**GET** `/api/v1/scoring/:matchId/timeline?limit=50&offset=0`

**Auth Required:** ❌

**Response (200):**
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": 1,
        "match_id": 101,
        "sequence_number": 1,
        "event_time": "2024-01-15T14:00:00.000Z",
        "event_category": "score",
        "event_type": "ace",
        "event_description": "John Doe - Ace",
        "score_after": {"p1": "15", "p2": "0"}
      },
      {
        "id": 2,
        "sequence_number": 2,
        "event_type": "winner",
        "event_description": "Mike Smith - Winner",
        "score_after": {"p1": "15", "p2": "15"}
      }
    ],
    "total": 47,
    "limit": 50,
    "offset": 0
  }
}
```

---

### 8. Get Match Statistics
**GET** `/api/v1/scoring/:matchId/statistics`

**Auth Required:** ❌

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "participant_id": 1,
      "player_name": "John Doe",
      "points_scored": 65,
      "aces": 8,
      "double_faults": 3,
      "winners": 25,
      "unforced_errors": 12,
      "first_serve_percentage": 68.5
    },
    {
      "participant_id": 2,
      "player_name": "Mike Smith",
      "points_scored": 58,
      "aces": 5,
      "double_faults": 5,
      "winners": 18,
      "unforced_errors": 15,
      "first_serve_percentage": 62.3
    }
  ]
}
```

---

### 9. Complete Match
**POST** `/api/v1/scoring/:matchId/complete`

**Auth Required:** ✅

**Request Body:**
```json
{
  "winner_participant_id": 1,
  "final_score": {
    "sets": [
      {"player1": 6, "player2": 4},
      {"player1": 4, "player2": 6},
      {"player1": 7, "player2": 5}
    ]
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "success": true,
    "matchId": 101,
    "winnerParticipantId": 1
  },
  "message": "Match completed successfully"
}
```

---

### 10. Get All Live Matches
**GET** `/api/v1/scoring/live?sport_id=1`

**Auth Required:** ❌

**Query Parameters:**
- `sport_id` (optional): Filter by sport

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "match_id": 101,
      "sport_id": 1,
      "sport_name": "Tennis",
      "tournament_name": "Summer Championship",
      "participant1_score": {...},
      "participant2_score": {...},
      "is_live": true,
      "last_event_time": "2024-01-15T14:30:25.000Z"
    }
  ],
  "total": 1
}
```

---

## EVENT TYPES BY SPORT

### Tennis / Padel
```javascript
// Scoring Events
{
  "ace": "Direct point on serve",
  "double_fault": "Lost point on serve",
  "winner": "Winning shot",
  "unforced_error": "Self-inflicted error",
  "forced_error": "Opponent forced error",
  "service_winner": "Service winner"
}

// Non-Scoring Events
{
  "let": "Replay point (no score change)",
  "fault": "First serve fault"
}

// Critical Points
{
  "game_point": "Point to win game",
  "set_point": "Point to win set",
  "match_point": "Point to win match",
  "break_point": "Point to break serve"
}
```

### Badminton
```javascript
// Scoring Events
{
  "rally_won": "Point awarded",
  "service_fault": "Lost serve + point",
  "net_fault": "Point to opponent",
  "shuttle_out": "Point to opponent",
  "smash": "Winning smash",
  "drop_shot": "Winning drop shot",
  "clear": "Winning clear"
}

// Non-Scoring Events
{
  "let": "Replay point"
}
```

### Volleyball
```javascript
// Scoring Events
{
  "spike": "Attack point",
  "block": "Defensive point",
  "ace": "Service point",
  "service_error": "Lost point + serve",
  "attack_error": "Attack error",
  "net_violation": "Net violation"
}

// Non-Scoring Events
{
  "rotation": "Team rotates",
  "timeout": "Team timeout",
  "substitution": "Player swap"
}
```

### Football
```javascript
// Scoring Events
{
  "goal": "+1 to scoring team",
  "own_goal": "+1 to opponent",
  "penalty_goal": "Goal from penalty"
}

// Non-Scoring Events
{
  "yellow_card": "Warning",
  "red_card": "Ejection",
  "substitution": "Player change",
  "var_check": "Video review",
  "offside": "Play invalidated",
  "corner": "Corner kick",
  "free_kick": "Free kick awarded"
}
```

---

## JSON SCORE STRUCTURES

### Tennis/Padel Score
```json
{
  "sets": [
    {"player1": 6, "player2": 4},
    {"player1": 5, "player2": 5}
  ],
  "current_game": {
    "player1": "30",
    "player2": "40"
  },
  "serving": "player1",
  "tiebreak": false
}
```

### Badminton Score
```json
{
  "games": [
    {"player1": 21, "player2": 18},
    {"player1": 15, "player2": 21}
  ],
  "current_game": {
    "player1": 18,
    "player2": 20
  },
  "serving": "player2"
}
```

### Volleyball Score
```json
{
  "sets": [
    {"team1": 25, "team2": 23},
    {"team1": 18, "team2": 20}
  ],
  "current_set": {
    "team1": 18,
    "team2": 20
  },
  "serving_team": "team2",
  "rotation": "1,2,3,4,5,6"
}
```

### Football Score
```json
{
  "regular_time": {
    "team1": 2,
    "team2": 2
  },
  "extra_time": {
    "team1": 0,
    "team2": 1
  },
  "penalties": {
    "team1": [true, true, false, true, true],
    "team2": [true, false, true, true, true]
  },
  "current_period": "extra_time_2",
  "elapsed_minutes": 105,
  "stoppage_time": 3
}
```

---

## POSTMAN EXAMPLES

### Example 1: Start Tennis Match
```
POST http://localhost:3000/api/v1/scoring/101/start
Authorization: Bearer <token>
Content-Type: application/json

{
  "sport_id": 1
}
```

### Example 2: Record Ace
```
POST http://localhost:3000/api/v1/scoring/101/events
Authorization: Bearer <token>
Content-Type: application/json

{
  "event_type": "ace",
  "player_id": 55,
  "event_data": {
    "serve_speed": 195,
    "serve_type": "flat"
  }
}
```

### Example 3: Record Football Goal
```
POST http://localhost:3000/api/v1/scoring/102/events
Authorization: Bearer <token>
Content-Type: application/json

{
  "event_type": "goal",
  "team_id": 10,
  "player_id": 25,
  "event_data": {
    "minute": 45,
    "assist_by": 18,
    "goal_type": "header"
  }
}
```

### Example 4: Undo Last Event
```
POST http://localhost:3000/api/v1/scoring/101/undo
Authorization: Bearer <token>
```

### Example 5: Pause Match
```
POST http://localhost:3000/api/v1/scoring/101/pause
Authorization: Bearer <token>
Content-Type: application/json

{
  "reason": "Medical timeout"
}
```

### Example 6: Get Live State
```
GET http://localhost:3000/api/v1/scoring/101/live
```

### Example 7: Get Timeline
```
GET http://localhost:3000/api/v1/scoring/101/timeline?limit=20&offset=0
```

---

## WEBSOCKET EVENTS

### Connect to WebSocket
```javascript
const socket = io('http://localhost:3000/scoring');

// Join match room
socket.emit('join_match', { matchId: 101 });
```

### Listen for Events
```javascript
// Match started
socket.on('match_started', (data) => {
  console.log('Match started:', data);
});

// Match update (new event)
socket.on('match_update', (data) => {
  console.log('Match update:', data);
  // Update UI with new score
});

// Event undone
socket.on('match_update', (data) => {
  if (data.eventType === 'undo') {
    console.log('Event undone');
  }
});

// Match paused
socket.on('match_update', (data) => {
  if (data.eventType === 'pause') {
    console.log('Match paused:', data.reason);
  }
});

// Match completed
socket.on('match_completed', (data) => {
  console.log('Match completed:', data);
});
```

---

## TESTING WORKFLOW

### 1. Setup
```bash
# Start server
npm start

# Login to get token
POST /api/v1/auth/login
```

### 2. Complete Match Flow
```bash
# 1. Start match
POST /scoring/101/start

# 2. Record events
POST /scoring/101/events (ace)
POST /scoring/101/events (winner)
POST /scoring/101/events (double_fault)

# 3. Check live state
GET /scoring/101/live

# 4. View timeline
GET /scoring/101/timeline

# 5. Undo mistake
POST /scoring/101/undo

# 6. Pause match
POST /scoring/101/pause

# 7. Resume match
POST /scoring/101/resume

# 8. Complete match
POST /scoring/101/complete
```

---

## ERROR HANDLING

### Common Errors

**Invalid Event Type:**
```json
{
  "success": false,
  "error": "Invalid event type 'invalid' for tennis. Valid types: ace, double_fault, winner, unforced_error, forced_error, let"
}
```

**No Events to Undo:**
```json
{
  "success": false,
  "error": "No events to undo"
}
```

**Match Not Found:**
```json
{
  "success": false,
  "error": "Match not found or not started"
}
```

**Unauthorized:**
```json
{
  "success": false,
  "error": "No token provided"
}
```

---

## NOTES

✅ **Event Validation:** All events are validated against sport-specific rules
✅ **Undo Functionality:** Referees can undo the last event
✅ **Pause/Resume:** Matches can be paused and resumed
✅ **Real-time Updates:** WebSocket broadcasts all changes
✅ **Timeline Tracking:** Complete event history maintained
✅ **Statistics:** Automatic stat calculation per participant

---

## IMPLEMENTATION STATUS

| Feature | Status |
|---------|--------|
| Start Match | ✅ Complete |
| Record Event | ✅ Complete |
| Event Validation | ✅ Complete |
| Undo Last Event | ✅ Complete |
| Pause Match | ✅ Complete |
| Resume Match | ✅ Complete |
| Get Live State | ✅ Complete |
| Get Timeline | ✅ Complete |
| Get Statistics | ✅ Complete |
| Complete Match | ✅ Complete |
| WebSocket Support | ✅ Complete |
| All Live Matches | ✅ Complete |

**System Compliance: 100% for Core Features**
