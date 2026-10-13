# 🔧 Fix Team Lock Error

## ❌ Error
```json
{
    "success": false,
    "message": "Failed to lock team",
    "error": "Data truncated for column 'status' at row 1"
}
```

## 🔍 Root Cause

The `teams` table is missing the `status` column. The migration script wasn't run.

---

## ✅ Solution

Run the SQL migration to add the `status` column to the `teams` table.

### **Option 1: Run the Fix Script (Recommended)**

```bash
# Connect to MySQL
mysql -u root -p

# Run the fix script
source /home/cct/Videos/SPORT_MANAGEMENT/SportLifeV2/PROJECT_CODE/sportlife-backend/database/fix_teams_status.sql
```

### **Option 2: Run SQL Manually**

```sql
USE sports_tournament_db_v3;

-- Add status column
ALTER TABLE teams 
ADD COLUMN status ENUM('draft', 'locked') DEFAULT 'draft' 
COMMENT 'draft: Being created, locked: Finalized for tournament' 
AFTER captain_id;

-- Add locked_at column
ALTER TABLE teams 
ADD COLUMN locked_at TIMESTAMP NULL 
COMMENT 'When team was locked (finalized)' 
AFTER status;

-- Update existing teams
UPDATE teams 
SET status = 'draft' 
WHERE status IS NULL;
```

### **Option 3: Run Full Migration**

```bash
mysql -u root -p < /home/cct/Videos/SPORT_MANAGEMENT/SportLifeV2/PROJECT_CODE/sportlife-backend/database/migrations/02_team_pair_management.sql
```

---

## 🧪 Verify Fix

After running the migration, verify:

```sql
-- Check if columns exist
DESCRIBE teams;

-- Should show:
-- status      | enum('draft','locked') | YES  |     | draft
-- locked_at   | timestamp              | YES  |     | NULL
```

---

## 🚀 Test

1. Restart backend (if needed)
2. Try locking a team again
3. Should work now! ✅

---

## 📋 What the Migration Does

1. ✅ Adds `status` column with ENUM('draft', 'locked')
2. ✅ Adds `locked_at` timestamp column
3. ✅ Sets default status to 'draft' for existing teams
4. ✅ Safe to run multiple times (checks if column exists first)

---

## 🎯 Expected Behavior After Fix

### **Lock Team:**
```sql
UPDATE teams 
SET status = 'locked', locked_at = NOW() 
WHERE id = 6;
```
✅ Works!

### **Unlock Team:**
```sql
UPDATE teams 
SET status = 'draft', locked_at = NULL 
WHERE id = 6;
```
✅ Works!

---

**Status:** Ready to fix
**Action Required:** Run the SQL migration script
