# 🗄️ Database Setup Guide

Complete guide for setting up the SportLife database with credentials.

---

## 🎯 **Three Ways to Setup Database**

### **Option 1: Automated Setup (Recommended)** ⭐

Uses credentials from `.env` file automatically!

```bash
# 1. Create .env file
cp .env.example .env

# 2. Edit .env with your credentials
nano .env
```

Add these lines:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=sportlife
```

```bash
# 3. Run setup (reads from .env)
npm run db:setup
```

**Benefits:**
- ✅ Password only entered once (in .env)
- ✅ No repeated password prompts
- ✅ Secure (password not in command history)
- ✅ Reusable for all scripts

---

### **Option 2: Full Automated Setup**

Complete setup including dependencies:

```bash
./setup.sh
```

**What it does:**
1. Creates `.env` if missing
2. Asks for MySQL password (interactive)
3. Creates database
4. Runs all migrations
5. Installs npm dependencies
6. Optionally starts server

---

### **Option 3: Manual Setup**

If you prefer manual control:

```bash
# 1. Login to MySQL
mysql -u root -p

# 2. Create database
CREATE DATABASE sportlife CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sportlife;

# 3. Run migrations
SOURCE database/schema.sql;
SOURCE database/01_add_referee_ratings.sql;
SOURCE database/02_create_notifications.sql;

# 4. Verify
SHOW TABLES;
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'sportlife';

# 5. Exit
EXIT;
```

---

## 🔐 **Credential Management**

### **Recommended: Use .env file**

**Step 1: Create .env**
```bash
cp .env.example .env
```

**Step 2: Add credentials**
```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_secure_password
DB_NAME=sportlife
DB_CONNECTION_LIMIT=10
```

**Step 3: Run setup**
```bash
npm run db:setup
```

✅ **Password is read from .env automatically!**

---

### **Security Best Practices**

1. **Never commit .env to git**
   ```bash
   # Already in .gitignore
   .env
   ```

2. **Use strong passwords**
   ```
   ❌ Bad: password123
   ✅ Good: mY$3cur3P@ssw0rd!2024
   ```

3. **Different passwords for dev/prod**
   ```env
   # Development
   DB_PASSWORD=dev_password

   # Production (different .env)
   DB_PASSWORD=super_secure_prod_password
   ```

4. **Restrict database user permissions**
   ```sql
   -- Create dedicated user (not root)
   CREATE USER 'sportlife_user'@'localhost' IDENTIFIED BY 'secure_password';
   GRANT ALL PRIVILEGES ON sportlife.* TO 'sportlife_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

---

## 📋 **Available npm Scripts**

### **Database Setup**
```bash
npm run db:setup     # Setup database (reads from .env)
npm run db:reset     # Drop and recreate database
```

### **Full Setup**
```bash
npm run setup        # Complete automated setup
```

### **Development**
```bash
npm run dev          # Start server (development)
npm start            # Start server (production)
```

---

## 🔧 **How Scripts Work**

### **npm run db:setup**

**What it does:**
1. Reads `DB_USER`, `DB_PASSWORD`, `DB_NAME` from `.env`
2. Tests MySQL connection
3. Creates database if not exists
4. Runs all 3 SQL files:
   - `database/schema.sql` (35+ tables)
   - `database/01_add_referee_ratings.sql` (1 table)
   - `database/02_create_notifications.sql` (4 tables)
5. Shows total table count

**Script location:** `scripts/db-setup.sh`

**Credentials:** Read from `.env` file

---

## ✅ **Verification**

After setup, verify everything worked:

### **1. Check Tables**
```bash
mysql -u root -p sportlife -e "SHOW TABLES;"
```

Expected: **40+ tables**

### **2. Count Tables**
```bash
mysql -u root -p sportlife -e "SELECT COUNT(*) as total FROM information_schema.tables WHERE table_schema = 'sportlife';"
```

Expected: `total: 40` or more

### **3. Test Connection from App**
```bash
# Start server
npm run dev

# Should see:
# ✅ Database connected successfully
```

---

## 🚨 **Troubleshooting**

### **Problem: "Access denied for user"**

**Solution:**
```bash
# Check credentials in .env
cat .env | grep DB_

# Test MySQL connection
mysql -u root -p -e "SELECT 1;"

# Reset MySQL password if needed
sudo mysql
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'new_password';
FLUSH PRIVILEGES;
EXIT;
```

---

### **Problem: "Database already exists"**

**Solution:**
```bash
# Reset database
npm run db:reset

# Or manually
mysql -u root -p -e "DROP DATABASE sportlife; CREATE DATABASE sportlife;"
npm run db:setup
```

---

### **Problem: "Permission denied: ./scripts/db-setup.sh"**

**Solution:**
```bash
chmod +x scripts/db-setup.sh
chmod +x setup.sh
```

---

### **Problem: ".env file not found"**

**Solution:**
```bash
# Create from example
cp .env.example .env

# Edit with your credentials
nano .env
```

---

### **Problem: "Can't connect to MySQL server"**

**Solution:**
```bash
# Check if MySQL is running
sudo systemctl status mysql

# Start MySQL
sudo systemctl start mysql

# Enable on boot
sudo systemctl enable mysql
```

---

## 📊 **What Gets Created**

### **40+ Tables Including:**

**Core:**
- users, sports, categories
- venues, courts
- tournaments, tournament_participants
- teams, team_members
- matches, scoring_events

**Features:**
- payments, wallets, wallet_transactions
- referee_performance, referee_certifications
- notifications, notification_preferences
- brackets, groups
- weather_alerts
- push_tokens

**And more...**

---

## 🔄 **Updating Database**

### **Add New Migration**

1. Create new SQL file:
   ```bash
   nano database/03_your_migration.sql
   ```

2. Add to setup script:
   ```bash
   nano scripts/db-setup.sh
   # Add line:
   mysql ... < database/03_your_migration.sql
   ```

3. Run migration:
   ```bash
   npm run db:setup
   ```

---

## 💡 **Tips**

### **Quick Reset During Development**
```bash
# Drop, recreate, and migrate
npm run db:reset
```

### **Backup Database**
```bash
mysqldump -u root -p sportlife > backup_$(date +%Y%m%d).sql
```

### **Restore Database**
```bash
mysql -u root -p sportlife < backup_20251015.sql
```

### **Check Database Size**
```bash
mysql -u root -p sportlife -e "
SELECT 
  table_schema AS 'Database',
  ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)'
FROM information_schema.tables
WHERE table_schema = 'sportlife'
GROUP BY table_schema;
"
```

---

## 📝 **Summary**

### **Recommended Workflow:**

1. **Setup once:**
   ```bash
   cp .env.example .env
   nano .env  # Add DB_PASSWORD
   npm run db:setup
   ```

2. **Development:**
   ```bash
   npm run dev
   ```

3. **Reset when needed:**
   ```bash
   npm run db:reset
   ```

### **Key Points:**
- ✅ Use `.env` for credentials
- ✅ Never commit `.env` to git
- ✅ Use `npm run db:setup` for easy setup
- ✅ Use `npm run db:reset` to start fresh
- ✅ Credentials are read automatically

---

**Your database setup is now automated and secure!** 🎉

**Last Updated**: October 15, 2025
