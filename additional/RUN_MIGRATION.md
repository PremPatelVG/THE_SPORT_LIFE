# Run Database Migration - Fix Bracket Generation

## ⚠️ IMPORTANT: You MUST Run This Migration!

The code has been updated, but the **database constraint** still needs to be fixed.

---

## 🚀 Quick Fix (Copy & Paste)

### **Step 1: Open MySQL**

```bash
mysql -u YOUR_USERNAME -p
```

### **Step 2: Run These Commands**

```sql
USE sportlife_db;

ALTER TABLE matches DROP CONSTRAINT check_match_participants;

ALTER TABLE matches ADD CONSTRAINT check_match_participants CHECK (
    (participant1_id IS NULL AND participant2_id IS NULL) OR
    (participant1_id IS NOT NULL AND participant2_id IS NOT NULL AND participant1_id != participant2_id)
);

-- Verify it worked
SELECT CONSTRAINT_NAME, CHECK_CLAUSE 
FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS 
WHERE TABLE_NAME = 'matches' 
  AND CONSTRAINT_NAME = 'check_match_participants';

exit;
```

### **Step 3: Restart Backend**

```bash
cd sportlife-backend
npm restart
```

### **Step 4: Test**

Go to browser and try "Generate Brackets" again - should work! ✅

---

## 📋 Alternative: If You Use phpMyAdmin

1. Open phpMyAdmin
2. Select `sportlife_db` database
3. Click on `matches` table
4. Go to "SQL" tab
5. Paste this:

```sql
ALTER TABLE matches DROP CONSTRAINT check_match_participants;

ALTER TABLE matches ADD CONSTRAINT check_match_participants CHECK (
    (participant1_id IS NULL AND participant2_id IS NULL) OR
    (participant1_id IS NOT NULL AND participant2_id IS NOT NULL AND participant1_id != participant2_id)
);
```

6. Click "Go"
7. Restart backend

---

## ✅ What This Does

**Before:**
```
Constraint: Both participants MUST be NOT NULL
Result: Can't create Final match ❌
```

**After:**
```
Constraint: Both NULL OR both NOT NULL
Result: Can create placeholder matches ✅
```

---

## 🎯 Summary

**Files Updated:**
- ✅ `bracketService.js` - Fixed status from 'pending' to 'scheduled'
- ✅ `TournamentParticipant.js` - Fixed participant filtering

**Database Migration Needed:**
- ⚠️ **YOU MUST RUN THE SQL ABOVE!**

**Then:**
- Restart backend
- Try "Generate Brackets"
- Should work! ✅

---

**Run the SQL migration now!** 🚀
