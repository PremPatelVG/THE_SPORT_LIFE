# Live Scoring System - Database Migration Guide

## 📋 Overview

This guide will help you run the database migrations for the Live Match Scoring System.

## 🗂️ Migration Files

### Part 1: Database Schema Changes

1. **05_create_match_events.sql** - Creates `match_events` table
2. **06_create_match_score_details.sql** - Creates `match_score_details` table  
3. **07_alter_matches_add_live_scoring.sql** - Adds columns to `matches` table

## 🚀 Quick Start (Automated)

### Option 1: Run All Migrations with Script

```bash
cd /home/cct/Videos/SPORT_MANAGEMENT/SportLifeV2/PROJECT_CODE/sportlife-backend/database/migrations

# Make script executable (if not already)
chmod +x run_live_scoring_migrations.sh

# Run migrations
bash run_live_scoring_migrations.sh
```

The script will:
- ✅ Prompt for MySQL root password
- ✅ Run all 3 migrations in order
- ✅ Show success/failure for each step
- ✅ Stop if any migration fails

---

## 🔧 Manual Migration (Step-by-Step)

If you prefer to run migrations manually or if the script fails:

### Step 1: Login to MySQL as Root

```bash
mysql -u root -p
```

### Step 2: Run Migration 1 - Create match_events Table

```sql
source /home/cct/Videos/SPORT_MANAGEMENT/SportLifeV2/PROJECT_CODE/sportlife-backend/database/migrations/05_create_match_events.sql
```

**Expected Output:**
```
+--------------------------------------------------+
| status                                           |
+--------------------------------------------------+
| match_events table created successfully          |
+--------------------------------------------------+
```

### Step 3: Run Migration 2 - Create match_score_details Table

```sql
source /home/cct/Videos/SPORT_MANAGEMENT/SportLifeV2/PROJECT_CODE/sportlife-backend/database/migrations/06_create_match_score_details.sql
```

**Expected Output:**
```
+--------------------------------------------------+
| status                                           |
+--------------------------------------------------+
| match_score_details table created successfully   |
+--------------------------------------------------+
```

### Step 4: Run Migration 3 - Alter matches Table

```sql
source /home/cct/Videos/SPORT_MANAGEMENT/SportLifeV2/PROJECT_CODE/sportlife-backend/database/migrations/07_alter_matches_add_live_scoring.sql
```

**Expected Output:**
```
+--------------------------------------------------+
| status                                           |
+--------------------------------------------------+
| matches table altered successfully               |
+--------------------------------------------------+
```

---

## ✅ Verification

After running migrations, verify the schema:

### Option 1: Run Verification Script

```bash
mysql -u root -p < verify_live_scoring_schema.sql
```

### Option 2: Manual Verification

```sql
USE sportforlife;

-- Check if tables exist
SHOW TABLES LIKE 'match_%';

-- Check match_events structure
DESCRIBE match_events;

-- Check match_score_details structure
DESCRIBE match_score_details;

-- Check new columns in matches table
SHOW COLUMNS FROM matches LIKE 'current_%';
SHOW COLUMNS FROM matches LIKE 'live_score';
SHOW COLUMNS FROM matches LIKE 'is_paused';
```

**Expected Tables:**
- ✅ `match_events`
- ✅ `match_score_details`

**Expected New Columns in `matches`:**
- ✅ `current_set`
- ✅ `current_game`
- ✅ `live_score`
- ✅ `match_timer`
- ✅ `is_paused`
- ✅ `pause_reason`

---

## 📊 What Each Table Does

### 1. `match_events` Table
**Purpose:** Track every scoring event during a live match

**Key Columns:**
- `event_type` - Type of event (point, goal, ace, fault, etc.)
- `participant_side` - Which participant scored
- `score_snapshot` - Complete score state at time of event
- `event_order` - Sequential order of events
- `match_time` - When event occurred

**Example Data:**
```json
{
  "id": 1,
  "match_id": 123,
  "event_type": "point",
  "participant_side": "participant1",
  "score_snapshot": {"p1": "40", "p2": "30"},
  "event_order": 15,
  "match_time": "12:34"
}
```

### 2. `match_score_details` Table
**Purpose:** Store set-by-set or period-by-period scores

**Key Columns:**
- `set_number` - Which set/period
- `participant1_score` - Score for participant 1
- `participant2_score` - Score for participant 2
- `winner_participant_id` - Who won this set
- `is_tiebreak` - Was it a tiebreak

**Example Data:**
```
Set 1: 6-4 (Winner: Participant 1)
Set 2: 3-6 (Winner: Participant 2)
Set 3: 7-5 (Winner: Participant 1)
```

### 3. New `matches` Columns
**Purpose:** Track live match state

**Columns:**
- `current_set` - Which set is being played (1, 2, 3...)
- `current_game` - Which game in set (for tennis)
- `live_score` - JSON with complete current score
- `match_timer` - Timer for timed sports
- `is_paused` - Is match paused
- `pause_reason` - Why match was paused

**Example `live_score` JSON:**
```json
{
  "sport": "Tennis",
  "current_set": 2,
  "current_game": 5,
  "participant1": {
    "sets_won": 1,
    "games": [6, 3],
    "current_game_points": "40"
  },
  "participant2": {
    "sets_won": 0,
    "games": [4, 4],
    "current_game_points": "30"
  }
}
```

---

## 🔄 Rollback (If Needed)

If you need to undo these migrations:

```sql
USE sportforlife;

-- Drop new tables
DROP TABLE IF EXISTS match_events;
DROP TABLE IF EXISTS match_score_details;

-- Remove new columns from matches
ALTER TABLE matches 
DROP COLUMN IF EXISTS current_set,
DROP COLUMN IF EXISTS current_game,
DROP COLUMN IF EXISTS live_score,
DROP COLUMN IF EXISTS match_timer,
DROP COLUMN IF EXISTS is_paused,
DROP COLUMN IF EXISTS pause_reason;
```

---

## 🐛 Troubleshooting

### Error: "Table already exists"
**Solution:** Tables were already created. Run verification script to check.

### Error: "Column already exists"
**Solution:** Columns were already added. This is safe to ignore.

### Error: "Access denied"
**Solution:** Make sure you're using root user with correct password.

### Error: "Foreign key constraint fails"
**Solution:** Make sure base tables (matches, users, tournament_participants) exist.

---

## 📝 Next Steps

After successful migration:

1. ✅ **Verify schema** - Run verification script
2. ✅ **Test queries** - Try inserting sample data
3. ✅ **Proceed to Part 2** - Backend API implementation
4. ✅ **Update documentation** - Note migration completion date

---

## 📞 Support

If you encounter issues:
1. Check error messages carefully
2. Verify MySQL version compatibility
3. Ensure database user has proper permissions
4. Check existing schema doesn't conflict

---

## ✅ Migration Checklist

- [ ] Backed up database
- [ ] Ran migration 1 (match_events)
- [ ] Ran migration 2 (match_score_details)
- [ ] Ran migration 3 (alter matches)
- [ ] Verified all tables exist
- [ ] Verified all columns added
- [ ] Tested sample queries
- [ ] Ready for backend implementation

---

**Migration Date:** _______________  
**Migrated By:** _______________  
**Status:** _______________
