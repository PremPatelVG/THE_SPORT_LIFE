# 🚀 SportLife Backend - Quick Start Guide

Get your SportLife backend up and running in **5 minutes**!

---

## 📋 Prerequisites

- ✅ Node.js 16+ installed
- ✅ MySQL 8.0+ installed and running
- ✅ Git (optional)

---

## ⚡ Quick Setup (Automated)

### **Option 1: One-Command Setup** (Recommended)

```bash
# Navigate to project
cd /home/cct/Videos/SPORT_MANAGEMENT/SportLifeV2/sportlife-backend

# Run automated setup
./setup.sh
```

**What it does:**
1. ✅ Creates `.env` file (if not exists)
2. ✅ Tests MySQL connection
3. ✅ Creates database
4. ✅ Runs all migrations (40+ tables)
5. ✅ Installs npm dependencies
6. ✅ Starts the server (optional)

**That's it!** Your backend is ready! 🎉

---

## 🛠️ Manual Setup

### **Step 1: Environment Setup**

```bash
# Copy environment file
cp .env.example .env

# Edit with your credentials
nano .env
```

Update these values:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=sportlife

JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-refresh-token-secret

STRIPE_SECRET_KEY=sk_test_your_stripe_key
```

### **Step 2: Database Setup**

```bash
# Create database
mysql -u root -p -e "CREATE DATABASE sportlife CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Run migrations
mysql -u root -p sportlife < database/schema.sql
mysql -u root -p sportlife < database/01_add_referee_ratings.sql
mysql -u root -p sportlife < database/02_create_notifications.sql

# Verify (should show 40+ tables)
mysql -u root -p sportlife -e "SHOW TABLES;"
```

### **Step 3: Install Dependencies**

```bash
npm install
```

### **Step 4: Start Server**

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

---

## ✅ Verify Installation

### **1. Health Check**
```bash
curl http://localhost:3000/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2025-10-15T...",
  "environment": "development"
}
```

### **2. API Info**
```bash
curl http://localhost:3000/api/v1
```

Expected response:
```json
{
  "name": "SportLife API",
  "version": "1.0.0",
  "endpoints": {
    "auth": "/api/v1/auth",
    "tournaments": "/api/v1/tournaments",
    "teams": "/api/v1/teams",
    ...
  }
}
```

### **3. Database Tables**
```bash
mysql -u root -p sportlife -e "SELECT COUNT(*) as total_tables FROM information_schema.tables WHERE table_schema = 'sportlife';"
```

Expected: **40+ tables**

---

## 🎯 Available Scripts

```bash
# Start server
npm start              # Production mode
npm run dev            # Development mode (auto-reload)

# Database
npm run setup          # Full automated setup
npm run db:setup       # Setup database only
npm run db:reset       # Drop and recreate database

# Testing
npm test               # Run tests
npm run test:watch     # Watch mode

# Code Quality
npm run lint           # Check code style
```

---

## 📡 API Endpoints

### **Base URL**
```
http://localhost:3000/api/v1
```

### **Main Modules** (130+ endpoints)

| Module | Endpoint | Description |
|--------|----------|-------------|
| Auth | `/auth` | Registration, login, OAuth |
| Tournaments | `/tournaments` | Tournament management |
| Teams | `/teams` | Team management |
| Matches | `/matches` | Match scheduling |
| Scoring | `/scoring` | Live scoring |
| Referees | `/referees` | Referee management |
| Payments | `/payments` | Payment processing |
| Venues | `/venues` | Venue management |
| Notifications | `/notifications` | Notifications |

---

## 🔌 WebSocket Endpoints

### **Live Scoring**
```javascript
ws://localhost:3000/scoring
```

### **Notifications**
```javascript
ws://localhost:3000/notifications
```

**Test Clients Available:**
- `test-scoring-client.html` - Live scoring demo
- See `SCORING_SYSTEM_GUIDE.md` for details

---

## 📁 Project Structure

```
sportlife-backend/
├── database/              # Database schema files
│   ├── schema.sql        # Main schema (35+ tables)
│   ├── 01_*.sql          # Migration 1
│   └── 02_*.sql          # Migration 2
├── src/
│   ├── config/           # Configuration
│   ├── controllers/      # HTTP handlers
│   ├── models/           # Database models
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   ├── middleware/       # Auth, validation
│   ├── websocket/        # WebSocket handlers
│   └── utils/            # Utilities
├── migrations/           # Original migrations
├── ProjectScope/         # Original schema
├── .env.example          # Environment template
├── setup.sh              # Automated setup script
├── server.js             # Server entry point
├── app.js                # Express app
└── package.json          # Dependencies

Total: 12 modules, 300+ functions, 19,000+ lines
```

---

## 🔧 Troubleshooting

### **MySQL Connection Error**
```bash
# Check MySQL is running
sudo systemctl status mysql

# Start MySQL
sudo systemctl start mysql

# Test connection
mysql -u root -p -e "SELECT 1;"
```

### **Port Already in Use**
```bash
# Change port in .env
PORT=3001

# Or kill process on port 3000
sudo lsof -ti:3000 | xargs kill -9
```

### **Permission Denied on setup.sh**
```bash
chmod +x setup.sh
```

### **Database Already Exists**
```bash
# Reset database
npm run db:reset
```

---

## 📚 Documentation

- **Complete Guides** (140+ pages):
  - `SCORING_SYSTEM_GUIDE.md`
  - `PAYMENT_MODULE_GUIDE.md`
  - `REFEREE_MODULE_GUIDE.md`
  - And more...

- **Module Summaries**:
  - `*_MODULE_COMPLETE.md` files
  - `MODULE_STATUS.md`

- **Database**:
  - `database/README.md`

---

## 🎉 What's Next?

### **1. Test the API**
```bash
# Register a user
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123!",
    "first_name": "Test",
    "last_name": "User"
  }'
```

### **2. Test WebSocket**
```bash
# Open test client
open test-scoring-client.html
```

### **3. Explore API**
- Use Postman or Thunder Client
- Import endpoints from documentation
- Test all 130+ endpoints

### **4. Deploy to Production**
- See `PRODUCTION_CHECKLIST.md`
- Update environment variables
- Configure SSL/HTTPS
- Set up monitoring

---

## 🆘 Need Help?

- **Documentation**: Check `*_GUIDE.md` files
- **Database**: See `database/README.md`
- **API**: Check `*_MODULE_COMPLETE.md` files
- **Issues**: Check troubleshooting section

---

## ✅ Success Checklist

After setup, you should have:

- [x] ✅ Server running on port 3000
- [x] ✅ Database with 40+ tables
- [x] ✅ Health check responding
- [x] ✅ API endpoints accessible
- [x] ✅ WebSocket namespaces active
- [x] ✅ All dependencies installed

**Congratulations! Your SportLife Backend is ready!** 🎉

---

**Quick Links:**
- Health: http://localhost:3000/health
- API Info: http://localhost:3000/api/v1
- Test Client: `test-scoring-client.html`

**Last Updated**: October 15, 2025
