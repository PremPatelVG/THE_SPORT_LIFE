# 🗄️ Database Schema Files

This folder contains all database schema and migration files for SportLife Backend.

## 📁 Files

### **schema.sql** (Main Schema)
- **35+ tables** for the complete application
- Users, Tournaments, Teams, Matches, Payments, Venues, etc.
- Stored procedures, triggers, and views
- **Source**: `ProjectScope/COMPLETE_UPDATED_SCHEMA.sql`

### **01_add_referee_ratings.sql**
- Adds `referee_ratings` table
- Referee performance rating system
- **Source**: `migrations/add_referee_ratings.sql`

### **02_create_notifications.sql**
- Creates 4 notification tables:
  - `notifications` - Main notifications
  - `notification_preferences` - User settings
  - `push_tokens` - Device tokens
  - `notification_templates` - 10 default templates
- **Source**: `migrations/create_notifications.sql`

## 🚀 Quick Setup

### **Automated Setup (Recommended)**
```bash
# Run the setup script
./setup.sh
```

The script will:
1. ✅ Create `.env` if not exists
2. ✅ Test MySQL connection
3. ✅ Create database
4. ✅ Run all migrations
5. ✅ Install dependencies
6. ✅ Start the server (optional)

### **Manual Setup**
```bash
# 1. Create database
mysql -u root -p -e "CREATE DATABASE sportlife CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2. Run main schema
mysql -u root -p sportlife < database/schema.sql

# 3. Run migrations
mysql -u root -p sportlife < database/01_add_referee_ratings.sql
mysql -u root -p sportlife < database/02_create_notifications.sql

# 4. Verify
mysql -u root -p sportlife -e "SHOW TABLES;"
```

### **Using npm scripts**
```bash
# Setup database only
npm run db:setup

# Reset database (drop and recreate)
npm run db:reset

# Seed sample data (if available)
npm run db:seed
```

## 📊 Database Structure

### **Total Tables**: 40+

**Core Tables:**
- users, sports, categories
- venues, courts
- tournaments, tournament_participants
- teams, team_members
- matches, scoring_events
- payments, wallets
- referees, certifications
- notifications, preferences

**Supporting Tables:**
- brackets, groups
- match_timeline, statistics
- weather_alerts
- push_tokens
- and more...

## 🔧 Troubleshooting

### **Connection Error**
```bash
# Check MySQL is running
sudo systemctl status mysql

# Test connection
mysql -u root -p -e "SELECT 1;"
```

### **Permission Error**
```bash
# Grant permissions
mysql -u root -p -e "GRANT ALL PRIVILEGES ON sportlife.* TO 'your_user'@'localhost'; FLUSH PRIVILEGES;"
```

### **Table Already Exists**
```bash
# Drop and recreate
npm run db:reset
```

## 📝 Notes

- All tables use `utf8mb4` charset for emoji support
- Foreign keys ensure data integrity
- Indexes optimize query performance
- Triggers automate wallet updates
- Views simplify complex queries

## 🔄 Adding New Migrations

1. Create new file: `database/03_your_migration.sql`
2. Add to `setup.sh` script
3. Add to `package.json` scripts
4. Document in this README

## ✅ Verification

After setup, verify with:
```bash
# Count tables
mysql -u root -p sportlife -e "SELECT COUNT(*) as total FROM information_schema.tables WHERE table_schema = 'sportlife';"

# List all tables
mysql -u root -p sportlife -e "SHOW TABLES;"

# Check specific table
mysql -u root -p sportlife -e "DESCRIBE users;"
```

Expected: **40+ tables**

---

**Last Updated**: October 15, 2025
