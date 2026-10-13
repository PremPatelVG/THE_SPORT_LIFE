# 🏆 SportLife Backend - Complete Node.js API

Production-ready backend for multi-sport tournament management and live scoring system.

## 📋 Features

✅ **8 Sports Support**: Tennis, Badminton, Table Tennis, Pickleball, Padel, Squash, Volleyball, Football  
✅ **Live Scoring**: Real-time match scoring with WebSocket  
✅ **Tournament Management**: Create, manage, and track tournaments  
✅ **Authentication**: JWT-based auth with role-based access control  
✅ **Payment Integration**: Stripe integration with escrow system  
✅ **Notifications**: Email, SMS, and push notifications  
✅ **Real-time Updates**: WebSocket for live match updates  
✅ **Statistics**: Comprehensive player and match statistics  

## 🚀 Quick Start

### Prerequisites
- Node.js >= 16.0.0
- MySQL >= 8.0
- npm >= 8.0.0

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file
cp .env.example .env

# 3. Configure .env file with your database credentials

# 4. Import database schema
mysql -u root -p sportlife < ../COMPLETE_UPDATED_SCHEMA.sql

# 5. Start development server
npm run dev

# 6. Server will run on http://localhost:3000
```

## 📁 Project Structure

```
sportlife-backend/
├── src/
│   ├── config/              # Configuration files
│   │   ├── database.js      # Database connection
│   │   ├── constants.js     # Sport events constants
│   │   └── environment.js   # Environment config
│   │
│   ├── models/              # Database models
│   │   ├── User.js
│   │   ├── Tournament.js
│   │   ├── Match.js
│   │   └── ...
│   │
│   ├── controllers/         # Request handlers
│   │   ├── authController.js
│   │   ├── tournamentController.js
│   │   ├── matchController.js
│   │   ├── scoringController.js
│   │   └── ...
│   │
│   ├── services/            # Business logic
│   │   ├── authService.js
│   │   ├── matchService.js
│   │   ├── scoringService.js
│   │   ├── scoreCalculator.js
│   │   └── ...
│   │
│   ├── handlers/            # Sport-specific event handlers
│   │   ├── eventHandlerFactory.js
│   │   ├── TennisEventHandler.js
│   │   ├── BadmintonEventHandler.js
│   │   ├── FootballEventHandler.js
│   │   └── ... (all 8 sports)
│   │
│   ├── middleware/          # Express middleware
│   │   ├── auth.js          # Authentication
│   │   ├── validation.js    # Request validation
│   │   ├── errorHandler.js  # Error handling
│   │   └── rateLimiter.js   # Rate limiting
│   │
│   ├── routes/              # API routes
│   │   ├── auth.routes.js
│   │   ├── tournaments.routes.js
│   │   ├── matches.routes.js
│   │   ├── scoring.routes.js
│   │   └── ...
│   │
│   ├── validators/          # Input validation
│   │   ├── authValidator.js
│   │   ├── tournamentValidator.js
│   │   └── matchValidator.js
│   │
│   ├── utils/               # Utility functions
│   │   ├── logger.js        # Winston logger
│   │   ├── emailService.js  # Email sending
│   │   └── helpers.js       # Helper functions
│   │
│   ├── websocket/           # WebSocket handlers
│   │   ├── socketHandler.js
│   │   └── events.js
│   │
│   └── app.js               # Express app setup
│
├── tests/                   # Test files
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── docs/                    # Documentation
│   ├── API.md
│   └── DEPLOYMENT.md
│
├── .env.example             # Environment variables template
├── .gitignore
├── package.json
├── README.md
└── server.js                # Entry point
```

## 🔌 API Endpoints

### Authentication
```
POST   /api/v1/auth/register          - Register new user
POST   /api/v1/auth/login             - Login
POST   /api/v1/auth/refresh           - Refresh token
POST   /api/v1/auth/forgot-password   - Request password reset
POST   /api/v1/auth/reset-password    - Reset password
GET    /api/v1/auth/verify-email      - Verify email
```

### Users
```
GET    /api/v1/users                  - Get all users (admin)
GET    /api/v1/users/:id              - Get user by ID
PUT    /api/v1/users/:id              - Update user
DELETE /api/v1/users/:id              - Delete user
GET    /api/v1/users/:id/profile      - Get user profile
```

### Tournaments
```
GET    /api/v1/tournaments            - Get all tournaments
POST   /api/v1/tournaments            - Create tournament
GET    /api/v1/tournaments/:id        - Get tournament details
PUT    /api/v1/tournaments/:id        - Update tournament
DELETE /api/v1/tournaments/:id        - Delete tournament
POST   /api/v1/tournaments/:id/register - Register for tournament
GET    /api/v1/tournaments/:id/participants - Get participants
POST   /api/v1/tournaments/:id/generate-brackets - Generate brackets
```

### Matches
```
GET    /api/v1/matches                - Get all matches
POST   /api/v1/matches                - Create match
GET    /api/v1/matches/:id            - Get match details
PUT    /api/v1/matches/:id            - Update match
DELETE /api/v1/matches/:id            - Delete match
POST   /api/v1/matches/:id/start      - Start match
POST   /api/v1/matches/:id/events     - Record event
GET    /api/v1/matches/:id/live       - Get live state
GET    /api/v1/matches/:id/timeline   - Get match timeline
GET    /api/v1/matches/:id/statistics - Get match statistics
POST   /api/v1/matches/:id/complete   - Complete match
GET    /api/v1/matches/live           - Get all live matches
```

### Scoring (Real-time)
```
POST   /api/v1/scoring/start          - Start match scoring
POST   /api/v1/scoring/event          - Record scoring event
GET    /api/v1/scoring/live/:matchId  - Get live score
POST   /api/v1/scoring/complete       - Complete match
```

### Payments
```
POST   /api/v1/payments/create        - Create payment
GET    /api/v1/payments/:id           - Get payment details
POST   /api/v1/payments/webhook       - Stripe webhook
POST   /api/v1/refunds/request        - Request refund
GET    /api/v1/refunds/:id            - Get refund status
```

## 🎮 Sport Event Types

### Tennis (8 events)
- `point_won`, `game_won`, `set_won`, `tiebreak_start`, `tiebreak_point`, `deuce`, `advantage`, `match_won`

### Badminton (6 events)
- `rally_won`, `service_ace`, `interval`, `deuce_reached`, `game_won`, `match_won`

### Table Tennis (5 events)
- `point_scored`, `service_change`, `deuce_reached`, `game_won`, `match_won`

### Pickleball (5 events)
- `point_scored`, `side_out`, `server_change`, `game_won`, `match_won`

### Padel (5 events)
- `point_won`, `game_won`, `set_won`, `tiebreak_start`, `match_won`

### Squash (5 events)
- `point_scored`, `let_called`, `stroke_awarded`, `game_won`, `match_won`

### Volleyball (6 events)
- `point_scored`, `rotation`, `substitution`, `timeout`, `set_won`, `match_won`

### Football (11 events)
- `goal`, `yellow_card`, `red_card`, `substitution`, `half_time`, `full_time`, `extra_time_start`, `extra_time_half`, `penalty_shootout`, `penalty_kick`, `match_won`

## 🔐 Authentication

JWT-based authentication with access and refresh tokens.

### Example Login Request
```javascript
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

// Response
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "user@example.com",
      "role": "player"
    },
    "tokens": {
      "access": "eyJhbGciOiJIUzI1NiIs...",
      "refresh": "eyJhbGciOiJIUzI1NiIs..."
    }
  }
}
```

### Using Token
```javascript
GET /api/v1/users/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

## 📡 WebSocket Events

Connect to WebSocket for real-time updates:

```javascript
const socket = io('http://localhost:3000');

// Subscribe to match updates
socket.emit('subscribe_match', matchId);

// Listen for updates
socket.on('match_update', (data) => {
  console.log('Score updated:', data);
});

socket.on('match_started', (data) => {
  console.log('Match started:', data);
});

socket.on('match_completed', (data) => {
  console.log('Match completed:', data);
});
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm test -- --coverage
```

## 📦 Deployment

### Using Docker
```bash
# Build image
docker build -t sportlife-backend .

# Run container
docker run -p 3000:3000 --env-file .env sportlife-backend
```

### Manual Deployment
```bash
# 1. Set NODE_ENV to production
export NODE_ENV=production

# 2. Install production dependencies
npm install --production

# 3. Start server
npm start
```

## 🔧 Environment Variables

See `.env.example` for all available environment variables.

Key variables:
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` - Database credentials
- `JWT_SECRET` - JWT secret key
- `STRIPE_SECRET_KEY` - Stripe API key
- `SMTP_*` - Email configuration

## 📝 License

MIT License

## 👥 Support

For issues and questions, please open an issue on GitHub.

---

**Built with ❤️ for SportLife**
