# Database Migration - Quick Reference Card

## 🚀 Essential Commands

```bash
# Check what migrations are pending
npm run migrate:status

# Apply all pending migrations
npm run migrate:up

# Rollback last migration
npm run migrate:down

# Create new migration
npm run migrate:create add_new_feature
```

---

## 📝 Migration Template

```sql
-- Migration: descriptive_name
-- Created: 2025-10-24
-- Description: What and why

-- UP
ALTER TABLE table_name ADD COLUMN new_column VARCHAR(100);

-- DOWN
ALTER TABLE table_name DROP COLUMN new_column;
```

---

## 💡 Common Examples

### Add Column
```sql
-- UP
ALTER TABLE users ADD COLUMN phone VARCHAR(20);

-- DOWN
ALTER TABLE users DROP COLUMN phone;
```

### Create Table
```sql
-- UP
CREATE TABLE notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- DOWN
DROP TABLE IF EXISTS notifications;
```

### Add Index
```sql
-- UP
ALTER TABLE matches ADD INDEX idx_status (status);

-- DOWN
ALTER TABLE matches DROP INDEX idx_status;
```

### Modify Column
```sql
-- UP
ALTER TABLE teams MODIFY COLUMN name VARCHAR(500);

-- DOWN
ALTER TABLE teams MODIFY COLUMN name VARCHAR(255);
```

---

## ⚡ Daily Workflow

```bash
# Morning: Pull latest code
git pull

# Check if new migrations
npm run migrate:status

# Apply migrations
npm run migrate:up

# Start working
npm start
```

---

## 🎯 When You Need to Change Database

```bash
# 1. Create migration
npm run migrate:create my_change

# 2. Edit file in database/migrations/

# 3. Apply migration
npm run migrate:up

# 4. Test it

# 5. If wrong, rollback
npm run migrate:down

# 6. Fix and reapply
npm run migrate:up

# 7. Commit to git
git add database/migrations/
git commit -m "Add migration"
```

---

## ✅ Best Practices

- ✅ One change per migration
- ✅ Always write DOWN section
- ✅ Test both UP and DOWN
- ✅ Use descriptive names
- ✅ Add comments
- ✅ Never edit applied migrations

---

## 🚨 Emergency Rollback

```bash
# Something went wrong after migration?
npm run migrate:down

# Check status
npm run migrate:status

# Fix the migration file
# Reapply
npm run migrate:up
```

---

## 📊 Migration Status Output

```
📊 Migration Status

============================================================
✅ Applied  20251024000001_add_team_reusability.sql
⏳ Pending  20251024120000_add_email_verified.sql
⏳ Pending  20251025093000_create_notifications.sql
============================================================
Total: 3 | Applied: 1 | Pending: 2
```

---

## 🎓 Remember

**Before migrations:** Drop database → Lose all data 😢

**With migrations:** Incremental changes → Keep all data 🎉

---

## 📞 Need Help?

Read full guide: `DATABASE_MIGRATION_GUIDE.md`
