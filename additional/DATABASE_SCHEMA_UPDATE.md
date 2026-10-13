# Database Schema Update - Match Status

## Changes Made

### 1. **Updated Match Status ENUM**

**File:** `sportlife-backend/database/schema.sql` (Line 620)

#### Before:
```sql
status ENUM('scheduled', 'in_progress', 'completed', 'cancelled', 'postponed', 'walkover') 
DEFAULT 'scheduled' NOT NULL
```

#### After:
```sql
status ENUM('pending', 'scheduled', 'ready', 'in_progress', 'completed', 'cancelled', 'postponed', 'walkover') 
DEFAULT 'pending' NOT NULL
```

**Changes:**
- ✅ Added `'pending'` status (for matches without date/time)
- ✅ Added `'ready'` status (for matches ready for check-in)
- ✅ Changed default from `'scheduled'` to `'pending'`

### 2. **Removed Participant Constraint**

**File:** `sportlife-backend/database/schema.sql` (Lines 661-662)

#### Before:
```sql
CONSTRAINT check_match_participants CHECK (
    participant1_id IS NOT NULL AND 
    participant2_id IS NOT NULL AND 
    participant1_id != participant2_id
)
```

#### After:
```sql
-- Note: Participants can be NULL for future rounds in knockout tournaments
-- They will be filled when previous rounds complete
```

**Reason:** Knockout tournaments create placeholder matches for future rounds with NULL participants.

## Match Status Definitions

| Status | Description | Has Date/Time | Has Participants | Can Schedule |
|--------|-------------|---------------|------------------|--------------|
| **pending** | Match created, awaiting scheduling | ❌ No | ✅ Yes (or NULL) | ✅ Yes |
| **scheduled** | Date/time assigned | ✅ Yes | ✅ Yes | ❌ No |
| **ready** | Ready for participant check-in | ✅ Yes | ✅ Yes | ❌ No |
| **in_progress** | Match currently being played | ✅ Yes | ✅ Yes | ❌ No |
| **completed** | Match finished with winner | ✅ Yes | ✅ Yes | ❌ No |
| **cancelled** | Match cancelled | N/A | N/A | ❌ No |
| **postponed** | Match postponed to later date | ✅ Yes | ✅ Yes | ✅ Yes |
| **walkover** | Won by walkover | ✅ Yes | ✅ Yes | ❌ No |

## Migration Steps

### For New Installations

1. **Drop existing database** (if testing):
   ```bash
   mysql -u root -p
   DROP DATABASE IF EXISTS sportlife;
   CREATE DATABASE sportlife;
   exit
   ```

2. **Run schema**:
   ```bash
   mysql -u root -p sportlife < database/schema.sql
   ```

### For Existing Databases

1. **Backup database first**:
   ```bash
   mysqldump -u root -p sportlife > backup_$(date +%Y%m%d).sql
   ```

2. **Run migration**:
   ```bash
   mysql -u root -p sportlife < database/migrations/03_add_pending_status.sql
   ```

3. **Verify migration**:
   ```sql
   -- Check status enum values
   SHOW COLUMNS FROM matches LIKE 'status';
   
   -- Check status distribution
   SELECT status, COUNT(*) as count 
   FROM matches 
   GROUP BY status;
   
   -- Check pending matches
   SELECT COUNT(*) as pending_without_date 
   FROM matches 
   WHERE status = 'pending' AND match_date IS NULL;
   ```

## Application Code Changes

### Files Already Updated

1. ✅ **bracketService.js** - Creates matches with `status: 'pending'`
2. ✅ **matchService.js** - Auto-updates status to `'scheduled'` when date assigned
3. ✅ **BulkSchedulingModal.jsx** - Filters pending matches correctly

### No Changes Needed

- All other code that reads/displays status will work automatically
- ENUM change is backward compatible (old values still valid)

## Testing Checklist

### 1. New Tournament Creation
```bash
# Create tournament
POST /api/v1/tournaments

# Generate brackets
POST /api/v1/tournaments/:id/generate-brackets

# Check match status
GET /api/v1/matches/tournament/:id

Expected: All matches have status: 'pending'
```

### 2. Bulk Scheduling
```bash
# Open bulk schedule modal
# Should show "X ready to schedule"

# Schedule matches
# Check updated status

Expected: Matches now have status: 'scheduled'
```

### 3. Individual Match Scheduling
```bash
# Update match with date
PUT /api/v1/matches/:id
{
  "match_date": "2025-11-03",
  "match_time": "09:00"
}

Expected: Status auto-updates to 'scheduled'
```

### 4. Knockout Tournament Flow
```bash
# Create 4-participant knockout
# Generate brackets

Expected:
- Semi-Final 1: status='pending', has participants
- Semi-Final 2: status='pending', has participants  
- Final: status='pending', participants=NULL
```

## Rollback Plan

If issues occur, rollback with:

```sql
-- Restore from backup
mysql -u root -p sportlife < backup_YYYYMMDD.sql

-- Or manually revert
ALTER TABLE matches 
MODIFY COLUMN status ENUM('scheduled', 'in_progress', 'completed', 'cancelled', 'postponed', 'walkover') 
DEFAULT 'scheduled' NOT NULL;

UPDATE matches SET status = 'scheduled' WHERE status = 'pending';
```

## Impact Analysis

### ✅ Positive Impacts

1. **Accurate Status Tracking**
   - Clear distinction between created and scheduled matches
   - Easy to identify matches needing scheduling

2. **Bulk Scheduling Fixed**
   - No more false "all matches scheduled" errors
   - Correct count of schedulable matches

3. **Better Workflow**
   - Status automatically updates when date assigned
   - No manual status management needed

4. **Future-Proof**
   - 'ready' status prepared for check-in feature
   - Supports complex tournament flows

### ⚠️ Potential Issues

1. **Existing Queries**
   - Queries filtering by `status = 'scheduled'` might need review
   - May need to include `status IN ('pending', 'scheduled')`

2. **UI Display**
   - UI components displaying status should handle 'pending'
   - Badge colors/labels may need updating

3. **Reports**
   - Reports counting "scheduled matches" should be reviewed
   - May need to differentiate pending vs scheduled

## Monitoring

### Queries to Monitor

```sql
-- Daily status distribution
SELECT 
    status,
    COUNT(*) as count,
    COUNT(CASE WHEN match_date IS NULL THEN 1 END) as without_date,
    COUNT(CASE WHEN match_date IS NOT NULL THEN 1 END) as with_date
FROM matches
GROUP BY status;

-- Matches in inconsistent state (should be 0)
SELECT COUNT(*) as inconsistent
FROM matches
WHERE (status = 'pending' AND match_date IS NOT NULL)
   OR (status = 'scheduled' AND match_date IS NULL);
```

## Documentation Updates Needed

1. **API Documentation**
   - Update match status enum values
   - Document auto-update behavior

2. **User Guide**
   - Explain match status meanings
   - Update scheduling workflow docs

3. **Developer Guide**
   - Document status lifecycle
   - Explain when each status is used

## Related Files

- ✅ `database/schema.sql` - Schema updated
- ✅ `database/migrations/03_add_pending_status.sql` - Migration created
- ✅ `services/bracketService.js` - Uses 'pending' status
- ✅ `services/matchService.js` - Auto-updates status
- ✅ `components/BulkSchedulingModal.jsx` - Filters correctly

## Next Steps

1. **Run migration** on development database
2. **Test thoroughly** with new tournaments
3. **Update existing tournaments** if needed
4. **Deploy to staging** for QA testing
5. **Deploy to production** with backup plan ready
