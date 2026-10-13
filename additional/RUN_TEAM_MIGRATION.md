# Run Team Reusability Migration

## Quick Start

### Step 1: Run the Migration

```bash
cd sportlife-backend
mysql -u root -p sportlife < database/03_update_teams_for_reusability.sql
```

Or if using a different database name:
```bash
mysql -u root -p your_database_name < database/03_update_teams_for_reusability.sql
```

### Step 2: Verify Migration

```bash
mysql -u root -p sportlife
```

Then run these queries:

```sql
-- Check teams table structure
DESCRIBE teams;

-- Should see new columns:
-- is_tournament_specific (tinyint(1))
-- sport_id (int)
-- is_public (tinyint(1))

-- Check new table
DESCRIBE team_tournament_registrations;

-- Verify existing teams
SELECT id, name, is_tournament_specific, tournament_id, sport_id 
FROM teams 
LIMIT 5;

-- All existing teams should have:
-- is_tournament_specific = 1
-- sport_id = (from their tournament)
```

### Step 3: Test the Backend

```bash
# Start the backend server
cd sportlife-backend
npm start
```

### Step 4: Test API Endpoints

#### Test 1: Create Reusable Team
```bash
curl -X POST http://localhost:5000/api/v1/teams \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Reusable Team",
    "sport_id": 1,
    "is_tournament_specific": false,
    "max_players": 11
  }'
```

#### Test 2: Get Reusable Teams
```bash
curl -X GET "http://localhost:5000/api/v1/teams/reusable?sport_id=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Test 3: Register Team for Tournament
```bash
curl -X POST http://localhost:5000/api/v1/teams/TEAM_ID/register-tournament \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tournament_id": 5
  }'
```

## Troubleshooting

### Error: "Table 'teams' doesn't exist"
- Make sure you're connected to the correct database
- Run: `USE sportlife;` before running queries

### Error: "Duplicate column name"
- Migration was already run
- Check: `SHOW COLUMNS FROM teams LIKE 'is_tournament_specific';`

### Error: "Cannot add foreign key constraint"
- Make sure sports table exists
- Check: `SELECT * FROM sports LIMIT 1;`

### Rollback (if needed)
```sql
-- Remove new columns
ALTER TABLE teams 
  DROP COLUMN is_tournament_specific,
  DROP COLUMN sport_id,
  DROP COLUMN is_public;

-- Drop new table
DROP TABLE IF EXISTS team_tournament_registrations;

-- Restore tournament_id constraint
ALTER TABLE teams 
  MODIFY COLUMN tournament_id INT NOT NULL;
```

## Success Indicators

✅ Migration successful if:
1. No errors during migration
2. New columns visible in teams table
3. New table `team_tournament_registrations` exists
4. Existing teams have `is_tournament_specific = 1`
5. API endpoints respond correctly

## Next Steps

After successful migration:
1. ✅ Backend is ready
2. ⏳ Update frontend (next step)
3. ⏳ Test complete flow
4. ⏳ Deploy to production

## Support

If you encounter issues:
1. Check the error message
2. Verify database connection
3. Ensure all tables exist
4. Check foreign key constraints
5. Review migration file for syntax errors
