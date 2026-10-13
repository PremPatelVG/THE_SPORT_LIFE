# 🚀 SportLife Backend - Complete Setup Guide

## ✅ **What's Been Created**

### **Core Files** (All Created ✅)
1. ✅ `package.json` - Dependencies & scripts
2. ✅ `.env.example` - Environment template
3. ✅ `.gitignore` - Git ignore rules
4. ✅ `README.md` - Complete documentation
5. ✅ `server.js` - Server entry point
6. ✅ `src/app.js` - Express app setup

### **Configuration** (All Created ✅)
7. ✅ `src/config/database.js` - Database connection
8. ✅ `src/config/constants.js` - Sport events constants
9. ✅ `src/utils/logger.js` - Winston logger
10. ✅ `src/utils/helpers.js` - Helper functions

### **Authentication Module** (All Created ✅)
11. ✅ `src/middleware/auth.js` - JWT authentication
12. ✅ `src/services/authService.js` - Auth business logic
13. ✅ `src/controllers/authController.js` - Auth endpoints
14. ✅ `src/routes/auth.routes.js` - Auth routes

### **Scoring Module** (All Created ✅)
15. ✅ `src/services/scoringService.js` - Scoring business logic
16. ✅ `src/controllers/scoringController.js` - Scoring endpoints
17. ✅ `src/routes/scoring.routes.js` - Scoring routes

### **Documentation** (All Created ✅)
18. ✅ `PROJECT_STATUS.md` - Project status
19. ✅ `IMPLEMENTATION_GUIDE.md` - Implementation guide
20. ✅ `SETUP_GUIDE.md` - This file

---

## 🎯 **Quick Start (5 Steps)**

### **Step 1: Install Dependencies**
```bash
cd sportlife-backend
npm install
```

### **Step 2: Configure Environment**
```bash
cp .env.example .env
```

Edit `.env` file with your database credentials:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=sportlife

JWT_SECRET=your_secret_key_change_this
```

### **Step 3: Import Database Schema**
```bash
# From the parent directory
mysql -u root -p sportlife < COMPLETE_UPDATED_SCHEMA.sql
```

### **Step 4: Start Server**
```bash
npm run dev
```

### **Step 5: Test API**
Open browser: http://localhost:3000/health

---

## 📊 **Project Status**

### **✅ Completed Modules**
- ✅ Project structure
- ✅ Database configuration
- ✅ Authentication system (JWT)
- ✅ Scoring system (all 8 sports)
- ✅ Logger & utilities
- ✅ Error handling
- ✅ API routes

### **📝 Ready to Use**
- ✅ User registration & login
- ✅ Start match
- ✅ Record scoring events
- ✅ Get live match state
- ✅ Get match timeline
- ✅ Get match statistics
- ✅ Complete match
- ✅ Get all live matches

---

## 🧪 **Testing the API**

### **1. Health Check**
```bash
curl http://localhost:3000/health
```

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2025-10-15T10:00:00.000Z",
  "environment": "development"
}
```

### **2. Register User**
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

### **3. Login**
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

**Save the token from response!**

### **4. Start Match (Tennis)**
```bash
curl -X POST http://localhost:3000/api/v1/scoring/301/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "sport_id": 1
  }'
```

### **5. Record Point (Tennis Ace)**
```bash
curl -X POST http://localhost:3000/api/v1/scoring/301/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "event_type": "point_won",
    "player_id": 201,
    "event_data": {
      "point_type": "ace"
    }
  }'
```

### **6. Get Live State**
```bash
curl http://localhost:3000/api/v1/scoring/301/live
```

### **7. Get All Live Matches**
```bash
curl http://localhost:3000/api/v1/scoring/live
```

---

## 📋 **Available API Endpoints**

### **Authentication**
```
POST   /api/v1/auth/register       - Register new user
POST   /api/v1/auth/login          - Login
GET    /api/v1/auth/profile        - Get user profile (requires auth)
```

### **Scoring**
```
POST   /api/v1/scoring/:matchId/start          - Start match
POST   /api/v1/scoring/:matchId/events         - Record event
GET    /api/v1/scoring/:matchId/live           - Get live state
GET    /api/v1/scoring/:matchId/timeline       - Get timeline
GET    /api/v1/scoring/:matchId/statistics     - Get statistics
POST   /api/v1/scoring/:matchId/complete       - Complete match
GET    /api/v1/scoring/live                    - Get all live matches
```

---

## 🎮 **Sport Event Types**

### **Tennis (sport_id: 1)**
- `point_won`, `game_won`, `set_won`, `tiebreak_start`, `tiebreak_point`, `deuce`, `advantage`, `match_won`

### **Badminton (sport_id: 2)**
- `rally_won`, `service_ace`, `interval`, `deuce_reached`, `game_won`, `match_won`

### **Table Tennis (sport_id: 3)**
- `point_scored`, `service_change`, `deuce_reached`, `game_won`, `match_won`

### **Pickleball (sport_id: 4)**
- `point_scored`, `side_out`, `server_change`, `game_won`, `match_won`

### **Padel (sport_id: 5)**
- `point_won`, `game_won`, `set_won`, `tiebreak_start`, `match_won`

### **Squash (sport_id: 6)**
- `point_scored`, `let_called`, `stroke_awarded`, `game_won`, `match_won`

### **Volleyball (sport_id: 7)**
- `point_scored`, `rotation`, `substitution`, `timeout`, `set_won`, `match_won`

### **Football (sport_id: 8)**
- `goal`, `yellow_card`, `red_card`, `substitution`, `half_time`, `full_time`, `extra_time_start`, `extra_time_half`, `penalty_shootout`, `penalty_kick`, `match_won`

---

## 🔧 **Troubleshooting**

### **Database Connection Failed**
```bash
# Check MySQL is running
sudo systemctl status mysql

# Check credentials in .env
cat .env | grep DB_

# Test connection manually
mysql -u root -p -e "SHOW DATABASES;"
```

### **Port Already in Use**
```bash
# Change PORT in .env
PORT=3001

# Or kill process using port 3000
lsof -ti:3000 | xargs kill -9
```

### **Module Not Found**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

---

## 📚 **Next Steps**

### **1. Add More Features**
- Tournament management
- Match management
- Payment integration
- WebSocket for real-time
- Notifications

### **2. Add Tests**
```bash
npm test
```

### **3. Deploy**
- Docker deployment
- PM2 for production
- Nginx reverse proxy

---

## 🎯 **Summary**

✅ **Backend is fully functional with:**
- Authentication (JWT)
- Scoring system (all 8 sports)
- Live match tracking
- Match timeline
- Match statistics
- Error handling
- Logging

✅ **Ready for:**
- Frontend integration
- Real-time WebSocket
- Additional features
- Production deployment

---

## 📞 **Support**

For issues:
1. Check logs in console
2. Review IMPLEMENTATION_GUIDE.md
3. Check database connection
4. Verify .env configuration

---

**🎉 Your backend is ready to use!**

**Start server:** `npm run dev`  
**Test API:** http://localhost:3000/health  
**API Docs:** See README.md  

**Happy coding! 🚀**
