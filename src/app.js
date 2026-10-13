const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');
const logger = require('./utils/logger');

const app = express();

// ---------------------
// CORS CONFIGURATION (Simplified & Fixed)
// ---------------------
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:5000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5000'
    ];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    if (process.env.NODE_ENV === 'development') return callback(null, true);
    return callback(new Error('Not allowed by CORS'), false);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['Content-Length', 'X-Request-Id'],
  credentials: true,
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Apply CORS before any routes
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // preflight

// ---------------------
// SECURITY & PERFORMANCE
// ---------------------
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  crossOriginEmbedderPolicy: false
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Make io available in all routes
app.use((req, res, next) => {
  req.io = req.app.get('io');
  next();
});

// Morgan logging
app.use(morgan(':method :url :status :response-time ms - :res[content-length]', {
  stream: { write: msg => logger.info(msg.trim()) }
}));

// ---------------------
// STATIC FILES (Serve uploaded files)
// ---------------------
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/.well-known', express.static(path.join(__dirname, '../.well-known')));

// ---------------------
// ROUTES
// ---------------------
app.use('/api/v1/auth', require('./routes/auth.routes'));
app.use('/api/v1/admin/auth', require('./routes/adminAuth.routes')); // Admin authentication - NEW!
app.use('/api/v1/admin', require('./routes/admin.routes')); // Admin routes - NEW!
app.use('/api/v1/users', require('./routes/user.routes'));
app.use('/api/v1/sports', require('./routes/sport.routes'));
app.use('/api/v1/sport-configs', require('./routes/sportConfig.routes'));
app.use('/api/v1/tournaments', require('./routes/tournament.routes'));
app.use('/api/v1/pairs', require('./routes/pairRoutes')); // Player-created pairs - MUST BE BEFORE teamManagement!
app.use('/api/v1', require('./routes/teamManagement.routes')); // Team & Pair Management (tournament pairs)
app.use('/api/v1/teams', require('./routes/team.routes'));
app.use('/api/v1/partnerships', require('./routes/partnership.routes'));
app.use('/api/v1/matches', require('./routes/matchScoring.routes')); // Live match scoring - MUST BE FIRST!
app.use('/api/v1/matches', require('./routes/matchTiming.routes')); // Match timing system - NEW!
app.use('/api/v1/matches', require('./routes/matchSquadRoutes')); // Match squad selection - NEW!
app.use('/api/v1/matches', require('./routes/matchPlayerStatus.routes')); // Player status during match - NEW!
app.use('/api/v1/matches', require('./routes/match.routes'));
app.use('/api/v1/scoring', require('./routes/scoring.routes'));
app.use('/api/v1/referees', require('./routes/referee.routes'));
app.use('/api/v1/payments', require('./routes/payment.routes'));
app.use('/api/v1/venues', require('./routes/venue.routes'));
app.use('/api/v1/notifications', require('./routes/notification.routes'));
app.use('/api/v1/upload', require('./routes/upload.routes'));
app.use('/api/v1/registrations', require('./routes/registration.routes'));
app.use('/api/v1/support', require('./routes/support.routes')); // Public support route
app.use('/api/v1/standalone-matches', require('./routes/standaloneMatchRoutes')); // Standalone matches - NEW!

// ---------------------
// HEALTH CHECK & API INFO
// ---------------------
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3000
  });
});

app.get('/api/v1', (req, res) => {
  res.json({
    name: 'SportLife API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/v1/auth',
      admin: '/api/v1/admin',
      sports: '/api/v1/sports',
      tournaments: '/api/v1/tournaments',
      teams: '/api/v1/teams',
      partnerships: '/api/v1/partnerships',
      matches: '/api/v1/matches',
      standaloneMatches: '/api/v1/standalone-matches',
      scoring: '/api/v1/scoring',
      referees: '/api/v1/referees',
      payments: '/api/v1/payments',
      venues: '/api/v1/venues',
      notifications: '/api/v1/notifications',
      health: '/health'
    }
  });
});

// ---------------------
// 404 HANDLER
// ---------------------
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// ---------------------
// ERROR HANDLER
// ---------------------
app.use((err, req, res, next) => {
  if (err.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      error: 'CORS Error',
      message: process.env.NODE_ENV === 'production' ? 'Access denied' : err.message,
      origin: req.headers.origin
    });
  }

  logger.error(`Error: ${err.message}`, {
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

module.exports = app;
