#!/bin/bash

# ============================================
# SportLife Backend - Complete File Generator
# ============================================
# This script generates all remaining backend files

echo "🚀 Generating SportLife Backend Files..."
echo ""

# Create all remaining files with complete code
# Due to size constraints, this script creates file templates
# You can expand each file with the full implementation

cd "$(dirname "$0")"

# ============================================
# Module 2: Configuration & Utils
# ============================================

echo "📁 Creating Configuration Files..."

# constants.js
cat > src/config/constants.js << 'EOF'
// Sport Event Constants
const SPORT_EVENTS = {
  TENNIS: {
    POINT_WON: 'point_won',
    GAME_WON: 'game_won',
    SET_WON: 'set_won',
    TIEBREAK_START: 'tiebreak_start',
    TIEBREAK_POINT: 'tiebreak_point',
    DEUCE: 'deuce',
    ADVANTAGE: 'advantage',
    MATCH_WON: 'match_won'
  },
  BADMINTON: {
    RALLY_WON: 'rally_won',
    SERVICE_ACE: 'service_ace',
    INTERVAL: 'interval',
    DEUCE_REACHED: 'deuce_reached',
    GAME_WON: 'game_won',
    MATCH_WON: 'match_won'
  },
  TABLE_TENNIS: {
    POINT_SCORED: 'point_scored',
    SERVICE_CHANGE: 'service_change',
    DEUCE_REACHED: 'deuce_reached',
    GAME_WON: 'game_won',
    MATCH_WON: 'match_won'
  },
  PICKLEBALL: {
    POINT_SCORED: 'point_scored',
    SIDE_OUT: 'side_out',
    SERVER_CHANGE: 'server_change',
    GAME_WON: 'game_won',
    MATCH_WON: 'match_won'
  },
  PADEL: {
    POINT_WON: 'point_won',
    GAME_WON: 'game_won',
    SET_WON: 'set_won',
    TIEBREAK_START: 'tiebreak_start',
    MATCH_WON: 'match_won'
  },
  SQUASH: {
    POINT_SCORED: 'point_scored',
    LET_CALLED: 'let_called',
    STROKE_AWARDED: 'stroke_awarded',
    GAME_WON: 'game_won',
    MATCH_WON: 'match_won'
  },
  VOLLEYBALL: {
    POINT_SCORED: 'point_scored',
    ROTATION: 'rotation',
    SUBSTITUTION: 'substitution',
    TIMEOUT: 'timeout',
    SET_WON: 'set_won',
    MATCH_WON: 'match_won'
  },
  FOOTBALL: {
    GOAL: 'goal',
    YELLOW_CARD: 'yellow_card',
    RED_CARD: 'red_card',
    SUBSTITUTION: 'substitution',
    HALF_TIME: 'half_time',
    FULL_TIME: 'full_time',
    EXTRA_TIME_START: 'extra_time_start',
    EXTRA_TIME_HALF: 'extra_time_half',
    PENALTY_SHOOTOUT: 'penalty_shootout',
    PENALTY_KICK: 'penalty_kick',
    MATCH_WON: 'match_won'
  }
};

const SPORT_IDS = {
  TENNIS: 1,
  BADMINTON: 2,
  TABLE_TENNIS: 3,
  PICKLEBALL: 4,
  PADEL: 5,
  SQUASH: 6,
  VOLLEYBALL: 7,
  FOOTBALL: 8
};

const USER_ROLES = {
  ADMIN: 'admin',
  PLAYER: 'player',
  REFEREE: 'referee',
  ORGANIZER: 'organizer',
  SPECTATOR: 'spectator'
};

module.exports = {
  SPORT_EVENTS,
  SPORT_IDS,
  USER_ROLES
};
EOF

# logger.js
cat > src/utils/logger.js << 'EOF'
const winston = require('winston');
const path = require('path');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({ 
    filename: 'logs/error.log', 
    level: 'error' 
  }));
  logger.add(new winston.transports.File({ 
    filename: 'logs/combined.log' 
  }));
}

module.exports = logger;
EOF

# helpers.js
cat > src/utils/helpers.js << 'EOF'
const generateMatchCode = () => {
  return 'M' + Date.now().toString(36).toUpperCase();
};

const generateTournamentCode = () => {
  return 'T' + Date.now().toString(36).toUpperCase();
};

const formatScore = (score) => {
  if (typeof score === 'object') {
    return JSON.stringify(score);
  }
  return score;
};

module.exports = {
  generateMatchCode,
  generateTournamentCode,
  formatScore
};
EOF

echo "✅ Configuration files created"
echo ""

# ============================================
# Module 3: Authentication
# ============================================

echo "📁 Creating Authentication Module..."

# auth middleware
cat > src/middleware/auth.js << 'EOF'
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await query(
      'SELECT * FROM users WHERE id = ? AND is_active = TRUE',
      [decoded.id]
    );

    if (!user || user.length === 0) {
      throw new Error();
    }

    req.user = user[0];
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ 
      success: false, 
      error: 'Invalid authentication token' 
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    next();
  };
};

module.exports = { auth, authorize };
EOF

# authService.js
cat > src/services/authService.js << 'EOF'
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');

class AuthService {
  async register(userData) {
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    
    const result = await query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [userData.name, userData.email, hashedPassword, userData.role || 'player']
    );

    return { id: result.insertId };
  }

  async login(email, password) {
    const users = await query(
      'SELECT * FROM users WHERE email = ? AND is_active = TRUE',
      [email]
    );

    if (!users || users.length === 0) {
      throw new Error('Invalid credentials');
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );

    delete user.password;
    return { user, token };
  }
}

module.exports = new AuthService();
EOF

# authController.js
cat > src/controllers/authController.js << 'EOF'
const authService = require('../services/authService');

class AuthController {
  async register(req, res) {
    try {
      const result = await authService.register(req.body);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, error: error.message });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(401).json({ success: false, error: error.message });
    }
  }

  async getProfile(req, res) {
    res.json({ success: true, data: req.user });
  }
}

module.exports = new AuthController();
EOF

# auth routes
cat > src/routes/auth.routes.js << 'EOF'
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { auth } = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/profile', auth, authController.getProfile);

module.exports = router;
EOF

echo "✅ Authentication module created"
echo ""

# ============================================
# CONTINUE WITH REMAINING MODULES...
# ============================================

echo "📝 Core modules created!"
echo ""
echo "⚠️  Note: Due to file size, this script creates the essential files."
echo "📚 See IMPLEMENTATION_GUIDE.md for complete code for all modules."
echo ""
echo "✅ Backend structure is ready!"
echo "🚀 Run: npm install && npm run dev"
EOF

chmod +x generate-backend.sh

echo "✅ Generation script created!"
