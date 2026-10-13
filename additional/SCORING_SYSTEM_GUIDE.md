# 🎯 Scoring System Module - Complete Guide

## Overview

The Scoring System module provides real-time live match scoring capabilities with WebSocket support for instant updates to all connected clients.

## 📁 Module Structure

```
src/
├── services/
│   └── scoringService.js          # Business logic for scoring operations
├── controllers/
│   └── scoringController.js       # HTTP request handlers
├── routes/
│   └── scoring.routes.js          # API route definitions
└── websocket/
    ├── index.js                   # WebSocket initialization
    └── scoringSocket.js           # Scoring-specific WebSocket handlers
```

## 🔌 WebSocket Architecture

### Connection Flow

1. **Client connects** to `/scoring` namespace
2. **Join match room** using `join_match` event with matchId
3. **Receive real-time updates** for that match
4. **Leave room** when done using `leave_match` event

### WebSocket Events

#### Client → Server Events

| Event | Payload | Description |
|-------|---------|-------------|
| `join_match` | `matchId` | Join a specific match room |
| `leave_match` | `matchId` | Leave a specific match room |
| `request_match_state` | `matchId` | Request current match state |
| `ping` | - | Health check |

#### Server → Client Events

| Event | Payload | Description |
|-------|---------|-------------|
| `joined_match` | `{ matchId, message }` | Confirmation of joining room |
| `left_match` | `{ matchId, message }` | Confirmation of leaving room |
| `match_started` | `{ matchId, liveState, timestamp }` | Match has started |
| `match_update` | `{ matchId, eventType, data, timestamp }` | Score/event update |
| `match_completed` | `{ matchId, winnerParticipantId, finalScore, timestamp }` | Match finished |
| `match_state` | `{ matchId, liveState }` | Current match state response |
| `pong` | `{ timestamp }` | Health check response |
| `error` | `{ message, error }` | Error occurred |

## 🚀 API Endpoints

### 1. Start Match
```http
POST /api/v1/scoring/:matchId/start
Authorization: Bearer <token>

Request Body:
{
  "sport_id": 1
}

Response:
{
  "success": true,
  "data": {
    "match_id": 123,
    "sport_id": 1,
    "current_period": 1,
    "participant1_score": 0,
    "participant2_score": 0,
    "is_live": true
  },
  "message": "Match started successfully"
}
```

### 2. Record Scoring Event
```http
POST /api/v1/scoring/:matchId/events
Authorization: Bearer <token>

Request Body:
{
  "event_type": "point_scored",
  "player_id": 456,  // or team_id
  "event_data": {
    "points": 1,
    "set_number": 1,
    "game_number": 1
  }
}

Response:
{
  "success": true,
  "data": {
    "match_id": 123,
    "participant1_score": 15,
    "participant2_score": 0,
    "current_period": 1
  },
  "message": "Event recorded successfully"
}
```

### 3. Get Live Match State
```http
GET /api/v1/scoring/:matchId/live

Response:
{
  "success": true,
  "data": {
    "match_id": 123,
    "sport_id": 1,
    "current_period": 2,
    "participant1_score": 30,
    "participant2_score": 15,
    "is_live": true,
    "last_event_time": "2025-10-15T10:30:00Z"
  }
}
```

### 4. Get Match Timeline
```http
GET /api/v1/scoring/:matchId/timeline?limit=50&offset=0

Response:
{
  "success": true,
  "data": {
    "events": [
      {
        "id": 1,
        "match_id": 123,
        "sequence_number": 1,
        "event_type": "point_scored",
        "event_time": "2025-10-15T10:15:00Z",
        "elapsed_seconds": 120,
        "participant_id": 456,
        "event_data": { "points": 1 }
      }
    ],
    "total": 50,
    "limit": 50,
    "offset": 0
  }
}
```

### 5. Get Match Statistics
```http
GET /api/v1/scoring/:matchId/statistics

Response:
{
  "success": true,
  "data": [
    {
      "id": 1,
      "match_id": 123,
      "participant_id": 456,
      "player_name": "John Doe",
      "points_scored": 30,
      "aces": 5,
      "double_faults": 2
    }
  ]
}
```

### 6. Complete Match
```http
POST /api/v1/scoring/:matchId/complete
Authorization: Bearer <token>

Request Body:
{
  "winner_participant_id": 456,
  "final_score": {
    "participant1": {
      "sets": 2,
      "games": [6, 6],
      "points": 0
    },
    "participant2": {
      "sets": 0,
      "games": [4, 3],
      "points": 0
    }
  }
}

Response:
{
  "success": true,
  "data": {
    "success": true,
    "matchId": 123,
    "winnerParticipantId": 456
  },
  "message": "Match completed successfully"
}
```

### 7. Get All Live Matches
```http
GET /api/v1/scoring/live?sport_id=1

Response:
{
  "success": true,
  "data": [
    {
      "match_id": 123,
      "sport_id": 1,
      "sport_name": "Tennis",
      "tournament_name": "Summer Championship",
      "participant1_score": 30,
      "participant2_score": 15,
      "is_live": true,
      "last_event_time": "2025-10-15T10:30:00Z"
    }
  ],
  "total": 1
}
```

## 💻 Client Integration Examples

### JavaScript/Node.js Client

```javascript
const io = require('socket.io-client');

// Connect to scoring namespace
const socket = io('http://localhost:3000/scoring', {
  transports: ['websocket']
});

// Connection events
socket.on('connect', () => {
  console.log('Connected to scoring server');
  
  // Join a match room
  socket.emit('join_match', 123);
});

// Listen for match updates
socket.on('match_started', (data) => {
  console.log('Match started:', data);
});

socket.on('match_update', (data) => {
  console.log('Score update:', data);
  // Update UI with new score
  updateScoreboard(data.data);
});

socket.on('match_completed', (data) => {
  console.log('Match completed:', data);
  // Show final results
  showFinalResults(data);
});

// Request current state
socket.emit('request_match_state', 123);

socket.on('match_state', (data) => {
  console.log('Current state:', data);
});

// Leave match when done
socket.emit('leave_match', 123);

// Disconnect
socket.on('disconnect', () => {
  console.log('Disconnected from server');
});
```

### React Client Example

```javascript
import { useEffect, useState } from 'react';
import io from 'socket.io-client';

function LiveScoreboard({ matchId }) {
  const [score, setScore] = useState(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Connect to scoring namespace
    const newSocket = io('http://localhost:3000/scoring');
    setSocket(newSocket);

    // Join match room
    newSocket.emit('join_match', matchId);

    // Listen for updates
    newSocket.on('match_update', (data) => {
      setScore(data.data);
    });

    newSocket.on('match_started', (data) => {
      setScore(data.liveState);
    });

    // Cleanup
    return () => {
      newSocket.emit('leave_match', matchId);
      newSocket.close();
    };
  }, [matchId]);

  return (
    <div className="scoreboard">
      {score && (
        <>
          <div>Player 1: {score.participant1_score}</div>
          <div>Player 2: {score.participant2_score}</div>
          <div>Period: {score.current_period}</div>
        </>
      )}
    </div>
  );
}
```

## 🗄️ Database Schema

### live_match_state
Stores current real-time match state.

```sql
CREATE TABLE live_match_state (
    match_id INT PRIMARY KEY,
    sport_id INT NOT NULL,
    current_period INT DEFAULT 1,
    participant1_score INT DEFAULT 0,
    participant2_score INT DEFAULT 0,
    is_live BOOLEAN DEFAULT TRUE,
    last_event_id INT,
    last_event_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### match_timeline
Complete event sequence for match replay.

```sql
CREATE TABLE match_timeline (
    id INT PRIMARY KEY AUTO_INCREMENT,
    match_id INT NOT NULL,
    sequence_number INT NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    event_time TIMESTAMP NOT NULL,
    elapsed_seconds INT,
    period_number INT,
    participant_id INT,
    event_data JSON,
    event_category VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### match_statistics
Detailed match statistics per participant.

```sql
CREATE TABLE match_statistics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    match_id INT NOT NULL,
    participant_id INT NOT NULL,
    points_scored INT DEFAULT 0,
    aces INT DEFAULT 0,
    double_faults INT DEFAULT 0,
    -- Add sport-specific stats as needed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## 🔧 Stored Procedures

### sp_start_match
Initializes match for live scoring.

```sql
CALL sp_start_match(123, 1);  -- matchId, sportId
```

### sp_record_score_event
Records a scoring event and updates state.

```sql
CALL sp_record_score_event(
    123,                    -- matchId
    'point_scored',         -- eventType
    456,                    -- participantId
    '{"points": 1}'         -- eventData (JSON)
);
```

### sp_complete_match_scoring
Finalizes match scoring and updates match status.

```sql
CALL sp_complete_match_scoring(
    123,                    -- matchId
    456,                    -- winnerParticipantId
    '{"sets": 2}'          -- finalScore (JSON)
);
```

## 🧪 Testing

### Manual Testing with Postman

1. **Start a match**
   - POST to `/api/v1/scoring/:matchId/start`
   - Include auth token and sport_id

2. **Connect WebSocket client**
   - Use Postman WebSocket or browser console
   - Connect to `ws://localhost:3000/scoring`
   - Emit `join_match` with matchId

3. **Record events**
   - POST to `/api/v1/scoring/:matchId/events`
   - Watch WebSocket for real-time updates

4. **Complete match**
   - POST to `/api/v1/scoring/:matchId/complete`
   - Verify final broadcast

### Automated Testing

```javascript
// Example Jest test
describe('Scoring System', () => {
  it('should start a match and broadcast to WebSocket', async () => {
    // Start match via API
    const response = await request(app)
      .post('/api/v1/scoring/123/start')
      .set('Authorization', `Bearer ${token}`)
      .send({ sport_id: 1 });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    
    // Verify WebSocket broadcast
    // (requires socket.io-client in test)
  });
});
```

## 🚨 Error Handling

Common errors and solutions:

| Error | Cause | Solution |
|-------|-------|----------|
| `Match not found or not started` | Trying to get state of non-live match | Start match first |
| `sport_id is required` | Missing sport_id in start request | Include sport_id in body |
| `event_type is required` | Missing event_type in event request | Include event_type |
| `WebSocket connection failed` | Server not running or CORS issue | Check server and CORS config |

## 🔐 Security

- All POST endpoints require authentication
- WebSocket connections are validated
- Match access controlled by tournament permissions
- Rate limiting applied to prevent abuse

## 📊 Performance Considerations

- WebSocket rooms isolate match updates
- Database indexes on match_id for fast queries
- JSON data stored efficiently in MySQL
- Connection pooling for database queries

## 🎯 Future Enhancements

- [ ] Video streaming integration
- [ ] AI-powered event detection
- [ ] Multi-language commentary support
- [ ] Advanced analytics dashboard
- [ ] Mobile app push notifications
- [ ] Replay system with timeline scrubbing

## 📝 Notes

- Always call `sp_start_match` before recording events
- WebSocket namespace is `/scoring`, not root `/`
- Match state is cached in `live_match_state` table
- Timeline provides complete event history for replay
- Statistics are calculated in real-time

---

**Module Status**: ✅ Complete and Production Ready

**Last Updated**: October 15, 2025
