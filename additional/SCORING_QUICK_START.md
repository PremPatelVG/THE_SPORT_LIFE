# 🚀 Scoring System - Quick Start Guide

## ⚡ 5-Minute Setup

### 1. Start the Server
```bash
npm install
npm run dev
```

### 2. Test WebSocket Connection
Open `test-scoring-client.html` in your browser:
```bash
# Open in default browser
open test-scoring-client.html  # Mac
start test-scoring-client.html # Windows
xdg-open test-scoring-client.html # Linux
```

### 3. Start a Match (API)
```bash
curl -X POST http://localhost:3000/api/v1/scoring/123/start \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sport_id": 1}'
```

### 4. Record an Event
```bash
curl -X POST http://localhost:3000/api/v1/scoring/123/events \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "point_scored",
    "player_id": 456,
    "event_data": {"points": 1}
  }'
```

### 5. Watch Live Updates
The test client will automatically show real-time score updates! 🎉

---

## 📋 Common Event Types

| Event Type | Description | Example Data |
|------------|-------------|--------------|
| `point_scored` | Player/team scored | `{"points": 1}` |
| `ace` | Ace scored (tennis) | `{"set": 1, "game": 3}` |
| `double_fault` | Double fault | `{"set": 1}` |
| `timeout` | Timeout called | `{"duration": 60}` |
| `substitution` | Player substitution | `{"player_in": 789, "player_out": 456}` |
| `penalty` | Penalty/foul | `{"type": "yellow_card"}` |
| `period_end` | Period/set ended | `{"period": 1}` |

---

## 🔧 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| WebSocket won't connect | Check server is running on port 3000 |
| "Match not found" error | Call start match API first |
| No real-time updates | Ensure you joined the match room |
| CORS error | Add your domain to CORS whitelist |

---

## 📱 WebSocket Client Code Snippets

### JavaScript
```javascript
const socket = io('http://localhost:3000/scoring');
socket.emit('join_match', 123);
socket.on('match_update', (data) => console.log(data));
```

### Python
```python
import socketio
sio = socketio.Client()
sio.connect('http://localhost:3000/scoring')
sio.emit('join_match', 123)
```

### React
```jsx
import io from 'socket.io-client';
const socket = io('http://localhost:3000/scoring');
useEffect(() => {
  socket.emit('join_match', matchId);
  socket.on('match_update', setScore);
  return () => socket.close();
}, [matchId]);
```

---

## 🎯 Testing Checklist

- [ ] Server starts without errors
- [ ] WebSocket connects successfully
- [ ] Can join match room
- [ ] Start match API works
- [ ] Events are recorded
- [ ] Real-time updates received
- [ ] Match completion works
- [ ] Timeline is recorded

---

## 📚 Full Documentation

See `SCORING_SYSTEM_GUIDE.md` for complete documentation.

---

**Ready to go!** 🚀 Your scoring system is fully functional!
