# Migration: Add Time Support to Tournament Dates

## Overview
This migration converts `start_date` and `end_date` columns from `DATE` to `DATETIME` to properly store and preserve time information selected during tournament creation and editing.

## Current Issue
- **start_date**: Stored as DATE (only date, no time) ❌
- **end_date**: Stored as DATE (only date, no time) ❌
- **registration_start**: Stored as DATETIME (has time) ✅
- **registration_end**: Stored as DATETIME (has time) ✅

When you select times in the UI, they are being truncated to midnight (00:00:00).

## Solution
Convert start_date and end_date to DATETIME to match registration dates.

## Steps to Run Migration

### Step 1: Backup Your Database
```bash
mysqldump -u tournament_user -p sportlife_db > backup_before_datetime_migration.sql
```

### Step 2: Run the Migration
```bash
mysql -u tournament_user -p sportlife_db < database/migrations/add_time_to_tournament_dates.sql
```

### Step 3: Verify the Migration
```sql
-- Check the schema
DESCRIBE tournaments;

-- Should show:
-- start_date: datetime
-- end_date: datetime

-- Check sample data
SELECT id, name, start_date, end_date, registration_start, registration_end 
FROM tournaments 
LIMIT 5;
```

### Step 4: Restart Backend Server
```bash
npm start
```

## What Changed in Backend

### File: `src/services/tournamentService.js`

1. **validateTournamentDates function** (lines 649-679):
   - Added `isEdit` parameter to distinguish between create and edit operations
   - Allows past dates for edits (isEdit=true)
   - Prevents past dates for new tournaments (isEdit=false)
   - Properly handles optional registration dates

2. **updateTournament function** (line 109):
   - Now passes `isEdit=true` to validateTournamentDates
   - Allows editing tournaments with past registration dates

## Frontend Changes (Already Done)

### File: `src/pages/EditTournament.jsx`
- ✅ Added `showTimeSelect` to all date pickers
- ✅ Changed date format to `yyyy-MM-dd h:mm aa`
- ✅ Preserves time in ISO format

### File: `src/pages/CreateTournament.jsx`
- ✅ Already has time selection
- ✅ Stores times in ISO format

## Testing

### Test 1: Create Tournament with Time
1. Go to Create Tournament
2. Select Start Date: 2025-11-20 at 14:30
3. Select End Date: 2025-11-21 at 16:45
4. Check database:
```sql
SELECT start_date, end_date FROM tournaments WHERE id = <your_tournament_id>;
-- Should show: 2025-11-20 14:30:00 and 2025-11-21 16:45:00
```

### Test 2: Edit Tournament with Past Registration Date
1. Go to Edit Tournament
2. Change Registration Start to a past date (e.g., 2025-11-05)
3. Should save successfully without "past date" error

### Test 3: Verify Time Preservation
1. Create a tournament with specific times
2. Edit the tournament (change name only)
3. Verify times are still preserved in database

## Rollback (If Needed)
```bash
mysql -u tournament_user -p sportlife_db < backup_before_datetime_migration.sql
```

## Database Schema After Migration

```sql
CREATE TABLE tournaments (
    ...
    start_date DATETIME NOT NULL,        -- ✅ Now stores time
    end_date DATETIME NOT NULL,          -- ✅ Now stores time
    registration_start DATETIME NOT NULL,
    registration_end DATETIME NOT NULL,
    ...
)
```

## Validation Rules After Migration

✅ **Allowed:**
- Create tournament with future times
- Edit tournament with past registration dates
- Select any time combination (15-minute intervals)

❌ **Still Validated:**
- End date must be after start date
- Registration end must be after registration start
- Registration must end before tournament starts
- (For new tournaments only) Registration start cannot be in the past

## Support
If you encounter any issues:
1. Check the backup file exists
2. Verify database connection
3. Check MySQL error logs
4. Restart backend server after migration
