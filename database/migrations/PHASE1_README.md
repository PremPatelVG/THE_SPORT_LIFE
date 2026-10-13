# Phase 1: Database Schema Enhancements

## Overview

Phase 1 adds comprehensive statistics tracking to the tournament standings system **without affecting any existing functionality**.

## What Gets Added

### 1. New Columns in `tournament_standings` Table

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `goals_for` | INT | 0 | Total goals/points scored |
| `goals_against` | INT | 0 | Total goals/points conceded |
| `clean_sheets` | INT | 0 | Matches without conceding |
| `avg_goals_for` | DECIMAL(5,2) | 0.00 | Average goals scored per match |
| `avg_goals_against` | DECIMAL(5,2) | 0.00 | Average goals conceded per match |
| `winning_streak` | INT | 0 | Current consecutive wins |
| `losing_streak` | INT | 0 | Current consecutive losses |
| `form` | VARCHAR(10) | '' | Last 5 results (W/L/D) |
| `head_to_head` | JSON | NULL | Head-to-head records |

### 2. New Indexes for Performance

**On `tournament_standings`:**
- `idx_standings_goals_for` - Fast sorting by goals scored
- `idx_standings_goals_against` - Fast sorting by goals conceded
- `idx_standings_goal_diff` - Fast sorting by goal difference
- `idx_standings_points_position` - Composite index for leaderboard queries

**On `match_statistics`:**
- `idx_match_stats_goals` - Fast goal lookups
- `idx_match_stats_points_scored` - Fast points queries
- `idx_match_stats_points_conceded` - Fast defensive stats
- `idx_match_stats_match_participant` - Fast match-participant lookups
- `idx_match_stats_aces` - Sport-specific stats
- `idx_match_stats_assists` - Sport-specific stats
- `idx_match_stats_blocks` - Sport-specific stats

### 3. New Database View

**`v_tournament_standings`** - Comprehensive standings view with:
- All standings data
- Participant names (auto-resolved from users/partnerships/teams)
- Participant images/logos
- Calculated percentages (win%, loss%, draw%)
- Tournament and sport details
- Group information

## Safety Guarantees

✅ **Zero Data Loss**
- All existing data is preserved
- No columns are modified or deleted
- Only new columns are added

✅ **Backward Compatibility**
- All existing queries continue to work
- New columns have default values
- Existing code doesn't need changes

✅ **Rollback Available**
- Can be completely reversed
- Rollback script provided
- No permanent changes

✅ **Production Safe**
- Can run on live database
- No downtime required
- No service interruption

## Installation

### Option 1: Automated (Recommended)

```bash
cd sportlife-backend/database/migrations
chmod +x run_phase1_migrations.sh
./run_phase1_migrations.sh
```

### Option 2: Manual

Run each migration file in order:

```bash
mysql -u root -p sportlife_db < 01_enhance_tournament_standings.sql
mysql -u root -p sportlife_db < 02_enhance_match_statistics.sql
mysql -u root -p sportlife_db < 03_create_standings_view.sql
```

### Option 3: MySQL Workbench

1. Open MySQL Workbench
2. Connect to your database
3. Open each `.sql` file
4. Execute in order (01 → 02 → 03)

## Verification

After running migrations, verify the changes:

```sql
-- Check new columns
DESCRIBE tournament_standings;

-- Check new view
DESCRIBE v_tournament_standings;

-- Test the view
SELECT * FROM v_tournament_standings LIMIT 5;

-- Check indexes
SHOW INDEX FROM tournament_standings;
SHOW INDEX FROM match_statistics;
```

## Expected Results

### Before Migration
```sql
tournament_standings columns:
- id, tournament_id, group_id, participant_id
- matches_played, matches_won, matches_lost, matches_drawn
- points, sets_won, sets_lost, games_won, games_lost
- goal_difference, form, position, is_eliminated
```

### After Migration
```sql
tournament_standings columns:
- (all previous columns)
+ goals_for, goals_against
+ clean_sheets, avg_goals_for, avg_goals_against
+ winning_streak, losing_streak
+ head_to_head (JSON)
+ enhanced 'form' column
```

## Rollback

If you need to undo Phase 1 changes:

```bash
mysql -u root -p sportlife_db < rollback_phase1_migrations.sql
```

**Warning:** This will remove the new columns and their data. Make a backup first if needed.

## What Happens to Existing Data?

### Existing Tournaments
- All existing standings rows get new columns with default values (0 or empty)
- `goals_for` = 0
- `goals_against` = 0
- `goal_difference` remains unchanged
- All other stats start at 0

### New Tournaments
- Will use all new columns from the start
- Statistics will be tracked automatically (in Phase 2)

### Optional: Backfill Historical Data

If you want to populate statistics for existing tournaments, you can run the backfill script (will be provided in Phase 2).

## Impact on Application

### Backend
- ✅ No changes required yet
- ✅ Existing queries work as-is
- ✅ New columns available for future use

### Frontend
- ✅ No changes required yet
- ✅ Existing displays work as-is
- ✅ Ready for enhanced UI (Phase 5)

### Database
- ✅ Schema enhanced
- ✅ Performance improved (new indexes)
- ✅ Query capabilities expanded (new view)

## Troubleshooting

### Error: "Column already exists"
**Solution:** The migration uses `IF NOT EXISTS` - this is safe. The column was already added.

### Error: "Access denied"
**Solution:** Make sure you're using a database user with ALTER TABLE privileges.

### Error: "Unknown database"
**Solution:** Update the database name in the migration files if yours is different from `sportlife_db`.

### Want to check what changed?
```sql
-- See all columns in tournament_standings
SELECT 
  COLUMN_NAME, 
  COLUMN_TYPE, 
  COLUMN_DEFAULT,
  COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'sportlife_db' 
  AND TABLE_NAME = 'tournament_standings'
ORDER BY ORDINAL_POSITION;
```

## Next Steps

After Phase 1 is complete:

1. ✅ Verify all migrations ran successfully
2. ✅ Check that existing tournaments still work
3. ✅ Proceed to **Phase 2: Backend Service Updates**
   - Update `updateStandings()` function
   - Add statistics extraction from live_score
   - Implement automatic tracking

## Questions?

- Check the main implementation plan: `TOURNAMENT_LEADERBOARD_IMPLEMENTATION_PLAN.md`
- Review individual migration files for detailed comments
- Test on a development database first if unsure

---

**Status:** Ready to run ✅  
**Risk Level:** Low (backward compatible, rollback available)  
**Estimated Time:** 2-5 minutes  
**Downtime Required:** None
