# 🎯 Complete Backend Implementation Guide

This guide provides the complete code for all remaining modules.

---

## 📋 **Files Created by Script**

✅ `src/config/constants.js` - Sport events constants  
✅ `src/utils/logger.js` - Winston logger  
✅ `src/utils/helpers.js` - Helper functions  
✅ `src/middleware/auth.js` - JWT authentication  
✅ `src/services/authService.js` - Auth business logic  
✅ `src/controllers/authController.js` - Auth endpoints  
✅ `src/routes/auth.routes.js` - Auth routes  

---

## 🚀 **Quick Start**

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your database credentials

# 3. Import database schema
mysql -u root -p sportlife < ../COMPLETE_UPDATED_SCHEMA.sql

# 4. Start server
npm run dev
```

---

## 📁 **Remaining Files to Create**

### **Create these files manually with the code below:**

---

## 1️⃣ **Main App File**

**File:** `src/app.js`

```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const logger = require('./utils/logger');

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true
}));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));

// Routes
app.use('/api/v1/auth', require('./routes/auth.routes'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

module.exports = app;
```

---

## 2️⃣ **Server Entry Point**

**File:** `server.js`

```javascript
require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const { testConnection } = require('./src/config/database');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

// Start server
const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      logger.error('Failed to connect to database');
      process.exit(1);
    }

    // Start listening
    server.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`🔗 API: http://localhost:${PORT}/api/v1`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

startServer();
```

---

## 3️⃣ **Scoring Service (Core)**

**File:** `src/services/scoringService.js`

```javascript
const { query, callProcedure } = require('../config/database');
const logger = require('../utils/logger');

class ScoringService {
  async startMatch(matchId, sportId) {
    try {
      await callProcedure('sp_start_match', [matchId, sportId]);
      
      const liveState = await query(
        'SELECT * FROM live_match_state WHERE match_id = ?',
        [matchId]
      );

      return liveState[0];
    } catch (error) {
      logger.error('Error starting match:', error);
      throw error;
    }
  }

  async recordEvent(matchId, eventType, participantId, eventData) {
    try {
      await callProcedure('sp_record_score_event', [
        matchId,
        eventType,
        participantId,
        JSON.stringify(eventData)
      ]);

      const liveState = await query(
        'SELECT * FROM live_match_state WHERE match_id = ?',
        [matchId]
      );

      return liveState[0];
    } catch (error) {
      logger.error('Error recording event:', error);
      throw error;
    }
  }

  async getLiveState(matchId) {
    const liveState = await query(
      'SELECT * FROM live_match_state WHERE match_id = ?',
      [matchId]
    );

    if (!liveState || liveState.length === 0) {
      throw new Error('Match not found or not started');
    }

    return liveState[0];
  }

  async completeMatch(matchId, winnerParticipantId, finalScore) {
    try {
      await callProcedure('sp_complete_match_scoring', [
        matchId,
        winnerParticipantId,
        JSON.stringify(finalScore)
      ]);

      return { success: true };
    } catch (error) {
      logger.error('Error completing match:', error);
      throw error;
    }
  }
}

module.exports = new ScoringService();
```

---

## 4️⃣ **Scoring Controller**

**File:** `src/controllers/scoringController.js`

```javascript
const scoringService = require('../services/scoringService');

class ScoringController {
  async startMatch(req, res) {
    try {
      const { matchId } = req.params;
      const { sport_id } = req.body;

      const result = await scoringService.startMatch(matchId, sport_id);

      // Broadcast via WebSocket if available
      if (req.io) {
        req.io.to(`match_${matchId}`).emit('match_started', result);
      }

      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async recordEvent(req, res) {
    try {
      const { matchId } = req.params;
      const { event_type, player_id, team_id, event_data } = req.body;

      const participantId = player_id || team_id;
      const result = await scoringService.recordEvent(
        matchId,
        event_type,
        participantId,
        event_data
      );

      // Broadcast via WebSocket
      if (req.io) {
        req.io.to(`match_${matchId}`).emit('match_update', {
          event_type,
          live_state: result
        });
      }

      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getLiveState(req, res) {
    try {
      const { matchId } = req.params;
      const result = await scoringService.getLiveState(matchId);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(404).json({ success: false, error: error.message });
    }
  }

  async completeMatch(req, res) {
    try {
      const { matchId } = req.params;
      const { winner_participant_id, final_score } = req.body;

      const result = await scoringService.completeMatch(
        matchId,
        winner_participant_id,
        final_score
      );

      // Broadcast
      if (req.io) {
        req.io.to(`match_${matchId}`).emit('match_completed', { matchId });
      }

      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = new ScoringController();
```

---

## 5️⃣ **Scoring Routes**

**File:** `src/routes/scoring.routes.js`

```javascript
const express = require('express');
const router = express.Router();
const scoringController = require('../controllers/scoringController');
const { auth } = require('../middleware/auth');

router.post('/:matchId/start', auth, scoringController.startMatch);
router.post('/:matchId/events', auth, scoringController.recordEvent);
router.get('/:matchId/live', scoringController.getLiveState);
router.post('/:matchId/complete', auth, scoringController.completeMatch);

module.exports = router;
```

---

## 6️⃣ **Update app.js to include scoring routes**

Add this line to `src/app.js` after auth routes:

```javascript
app.use('/api/v1/scoring', require('./routes/scoring.routes'));
```

---

## ✅ **Testing the API**

### 1. **Register User**
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "password123",
    "role": "player"
  }'
```

### 2. **Login**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

### 3. **Start Match**
```bash
curl -X POST http://localhost:3000/api/v1/scoring/301/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "sport_id": 1
  }'
```

### 4. **Record Event**
```bash
curl -X POST http://localhost:3000/api/v1/scoring/301/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "event_type": "point_won",
    "player_id": 201,
    "event_data": {
      "point_type": "ace"
    }
  }'
```

---

## 🎯 **Next Steps**

1. ✅ **Test Authentication** - Register and login
2. ✅ **Test Scoring** - Start match and record events
3. 📝 **Add More Routes** - Tournaments, matches, users
4. 🔌 **Add WebSocket** - For real-time updates
5. 🧪 **Add Tests** - Unit and integration tests

---

## 📚 **Additional Modules**

For complete implementation of:
- Tournament management
- Match management
- WebSocket real-time
- Payment integration
- All 8 sport handlers

See the documentation files in the `docs/` folder or contact support.

---

**Backend is now functional with core features!** 🚀
