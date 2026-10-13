# Database Migration System - Complete Guide

## 🎯 Problem Solved

**Before:** Every database change required dropping and recreating the entire database, losing all data.

**Now:** Make incremental changes to your database schema without losing any data!

---

## 📦 What is a Migration?

A migration is a file that describes:
1. **UP:** What changes to make (add column, create table, etc.)
2. **DOWN:** How to undo those changes (rollback)

---

## 🚀 Quick Start

### 1. Check Migration Status

```bash
npm run migrate:status
```

Shows which migrations are applied and which are pending.

### 2. Apply Pending Migrations

```bash
npm run migrate:up
```

Applies all pending migrations to your database.

### 3. Rollback Last Migration

```bash
npm run migrate:down
```

Undoes the last applied migration.

### 4. Create New Migration

```bash
npm run migrate:create add_email_verified_column
```

Creates a new migration file with timestamp.

---

## 📝 Real-World Examples

### Example 1: Add a New Column

**Scenario:** You want to add `email_verified` column to users table.

**Step 1:** Create migration
```bash
npm run migrate:create add_email_verified_to_users
```

**Step 2:** Edit the generated file:
```sql
-- Migration: add_email_verified_to_users
-- Created: 2025-10-24

-- UP
ALTER TABLE users 
ADD COLUMN email_verified BOOLEAN DEFAULT FALSE NOT NULL;

-- DOWN
ALTER TABLE users 
DROP COLUMN email_verified;
```

**Step 3:** Apply migration
```bash
npm run migrate:up
```

✅ Done! Column added without losing data!

---

### Example 2: Create a New Table

**Step 1:** Create migration
```bash
npm run migrate:create create_user_preferences_table
```

**Step 2:** Edit the file:
```sql
-- Migration: create_user_preferences_table
-- Created: 2025-10-24

-- UP
CREATE TABLE IF NOT EXISTS user_preferences (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    theme VARCHAR(20) DEFAULT 'light',
    language VARCHAR(10) DEFAULT 'en',
    notifications_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_preferences_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- DOWN
DROP TABLE IF EXISTS user_preferences;
```

**Step 3:** Apply migration
```bash
npm run migrate:up
```

---

### Example 3: Modify Existing Column

**Step 1:** Create migration
```bash
npm run migrate:create increase_team_name_length
```

**Step 2:** Edit the file:
```sql
-- Migration: increase_team_name_length
-- Created: 2025-10-24
-- Description: Increase team name from 255 to 500 characters

-- UP
ALTER TABLE teams 
MODIFY COLUMN name VARCHAR(500) NOT NULL;

-- DOWN
ALTER TABLE teams 
MODIFY COLUMN name VARCHAR(255) NOT NULL;
```

**Step 3:** Apply migration
```bash
npm run migrate:up
```

---

### Example 4: Add Index for Performance

**Step 1:** Create migration
```bash
npm run migrate:create add_index_to_matches_status
```

**Step 2:** Edit the file:
```sql
-- Migration: add_index_to_matches_status
-- Created: 2025-10-24
-- Description: Add index on matches.status for faster queries

-- UP
ALTER TABLE matches 
ADD INDEX idx_matches_status (status);

-- DOWN
ALTER TABLE matches 
DROP INDEX idx_matches_status;
```

**Step 3:** Apply migration
```bash
npm run migrate:up
```

---

### Example 5: Add Foreign Key

**Step 1:** Create migration
```bash
npm run migrate:create add_venue_to_matches
```

**Step 2:** Edit the file:
```sql
-- Migration: add_venue_to_matches
-- Created: 2025-10-24
-- Description: Link matches to venues

-- UP
ALTER TABLE matches 
ADD COLUMN venue_id INT NULL AFTER tournament_id,
ADD FOREIGN KEY (venue_id) REFERENCES venues(id) ON DELETE SET NULL,
ADD INDEX idx_matches_venue (venue_id);

-- DOWN
ALTER TABLE matches 
DROP FOREIGN KEY matches_ibfk_venue,
DROP INDEX idx_matches_venue,
DROP COLUMN venue_id;
```

**Step 3:** Apply migration
```bash
npm run migrate:up
```

---

## 🔄 Common Workflows

### Workflow 1: Development Changes

```bash
# 1. Make changes to your code
# 2. Create migration for database changes
npm run migrate:create my_changes

# 3. Edit the migration file
# 4. Apply migration
npm run migrate:up

# 5. Test your changes
# 6. If something wrong, rollback
npm run migrate:down

# 7. Fix and reapply
npm run migrate:up
```

### Workflow 2: Team Collaboration

```bash
# Developer A creates migration
npm run migrate:create add_feature_x

# Developer A commits migration file to git
git add database/migrations/
git commit -m "Add feature X migration"
git push

# Developer B pulls changes
git pull

# Developer B applies migration
npm run migrate:up

# ✅ Both databases are in sync!
```

### Workflow 3: Production Deployment

```bash
# 1. Backup production database first!
mysqldump -u user -p database > backup.sql

# 2. Pull latest code
git pull

# 3. Check migration status
npm run migrate:status

# 4. Apply migrations
npm run migrate:up

# 5. Restart application
npm start

# ✅ Production updated safely!
```

---

## 📊 Migration Commands Reference

| Command | Description | Example |
|---------|-------------|---------|
| `npm run migrate:status` | Show migration status | See what's pending |
| `npm run migrate:up` | Apply all pending migrations | Update database |
| `npm run migrate:down` | Rollback last migration | Undo last change |
| `npm run migrate:create <name>` | Create new migration | Add new feature |

---

## 🎨 Migration File Structure

```sql
-- Migration: descriptive_name
-- Created: YYYY-MM-DD
-- Description: What this migration does and why

-- UP
-- SQL statements to apply changes
ALTER TABLE users ADD COLUMN new_field VARCHAR(100);

-- DOWN
-- SQL statements to rollback changes
ALTER TABLE users DROP COLUMN new_field;
```

**Important Sections:**
- **Header:** Describes the migration
- **UP:** Changes to apply
- **DOWN:** How to undo (for rollback)

---

## ✅ Best Practices

### 1. **One Change Per Migration**
❌ Bad:
```sql
-- UP
ALTER TABLE users ADD COLUMN email_verified BOOLEAN;
ALTER TABLE teams ADD COLUMN is_public BOOLEAN;
CREATE TABLE notifications (...);
```

✅ Good:
```sql
-- UP
ALTER TABLE users ADD COLUMN email_verified BOOLEAN;
```

### 2. **Always Provide DOWN Section**
❌ Bad:
```sql
-- UP
ALTER TABLE users ADD COLUMN email_verified BOOLEAN;

-- DOWN
-- (empty)
```

✅ Good:
```sql
-- UP
ALTER TABLE users ADD COLUMN email_verified BOOLEAN;

-- DOWN
ALTER TABLE users DROP COLUMN email_verified;
```

### 3. **Test Both UP and DOWN**
```bash
# Apply migration
npm run migrate:up

# Test your application

# Rollback
npm run migrate:down

# Should work without errors

# Reapply
npm run migrate:up
```

### 4. **Use Descriptive Names**
❌ Bad: `npm run migrate:create update1`

✅ Good: `npm run migrate:create add_email_verification_to_users`

### 5. **Add Comments**
```sql
-- Migration: add_email_verified_to_users
-- Created: 2025-10-24
-- Description: Add email verification feature
-- Related to: Issue #123, Feature Request #456

-- UP
ALTER TABLE users 
ADD COLUMN email_verified BOOLEAN DEFAULT FALSE NOT NULL 
COMMENT 'Tracks if user has verified their email address';
```

---

## 🚨 Common Mistakes to Avoid

### ❌ Mistake 1: Editing Applied Migrations
**Problem:** Changing a migration that's already applied won't update the database.

**Solution:** Create a new migration instead.

### ❌ Mistake 2: Forgetting to Apply Migrations
**Problem:** Code expects new column but database doesn't have it.

**Solution:** Always run `npm run migrate:up` after pulling code.

### ❌ Mistake 3: No Rollback Plan
**Problem:** Can't undo changes if something goes wrong.

**Solution:** Always write the DOWN section.

### ❌ Mistake 4: Not Testing Rollback
**Problem:** DOWN section has errors and can't rollback.

**Solution:** Test both UP and DOWN before committing.

---

## 🔧 Troubleshooting

### Problem: "Migration failed"
```bash
# Check what went wrong
npm run migrate:status

# If migration partially applied, fix manually
mysql -u root -p database_name

# Then mark as failed or fix and retry
```

### Problem: "Migrations out of sync"
```bash
# Check status
npm run migrate:status

# If needed, manually update migrations table
mysql -u root -p database_name
SELECT * FROM schema_migrations;
```

### Problem: "Need to skip a migration"
```bash
# Manually mark as applied (use with caution!)
mysql -u root -p database_name
INSERT INTO schema_migrations (name) VALUES ('20251024000001_migration_name.sql');
```

---

## 📁 File Organization

```
sportlife-backend/
├── database/
│   ├── migrations/
│   │   ├── README.md
│   │   ├── 20251024000001_add_team_reusability.sql
│   │   ├── 20251024120000_add_email_verified.sql
│   │   └── 20251025093000_create_notifications.sql
│   └── schema.sql (full schema for fresh installs)
├── scripts/
│   └── migrate.js (migration runner)
└── package.json (migration commands)
```

---

## 🎓 Learning Path

### Beginner
1. ✅ Understand what migrations are
2. ✅ Run `migrate:status` to see current state
3. ✅ Create simple migration (add column)
4. ✅ Apply with `migrate:up`
5. ✅ Rollback with `migrate:down`

### Intermediate
1. ✅ Create table migrations
2. ✅ Add foreign keys and indexes
3. ✅ Modify existing columns
4. ✅ Write complex UP/DOWN sections

### Advanced
1. ✅ Data migrations (transform existing data)
2. ✅ Handle production deployments
3. ✅ Resolve migration conflicts
4. ✅ Write migration tests

---

## 📚 Summary

### What You Get:
✅ **No more data loss** - Incremental changes only
✅ **Version control** - Track all database changes
✅ **Rollback capability** - Undo mistakes easily
✅ **Team sync** - Everyone's database stays in sync
✅ **Production safe** - Test changes before deploying

### Your New Workflow:
1. Need to change database? → Create migration
2. Edit migration file → Add UP and DOWN
3. Apply migration → `npm run migrate:up`
4. Test changes → If wrong, rollback
5. Commit migration → Team can apply same changes

### Never Again:
❌ Drop entire database
❌ Lose all data
❌ Manual SQL scripts
❌ Database out of sync
❌ Production disasters

---

## 🎉 You're Ready!

Start using migrations today:

```bash
# Check current status
npm run migrate:status

# Create your first migration
npm run migrate:create my_first_migration

# Edit the file and apply
npm run migrate:up
```

**Happy Migrating! 🚀**
