# Database Schema - Quick Reference Card

## 🚀 Quick Commands

### Create Fresh Database
```bash
mysql -u root -p -e "CREATE DATABASE sportlife CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p sportlife < schema.sql
```

### Update Existing Database
```bash
mysqldump -u root -p sportlife > backup_$(date +%Y%m%d).sql
mysql -u root -p sportlife < fix_schema_issues.sql
```

### Validate Schema
```bash
./test_schema.sh
```

### Drop and Recreate
```bash
mysql -u root -p -e "DROP DATABASE IF EXISTS sportlife;"
mysql -u root -p -e "CREATE DATABASE sportlife CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p sportlife < schema.sql
```

## 📊 Schema Stats

| Metric | Count |
|--------|-------|
| Tables | 70+ |
| Foreign Keys | 100+ |
| Views | 7 |
| Stored Procedures | 6 |
| Triggers | 4 |
| Indexes | 150+ |

## 🔑 Key Tables

### Core
- `users` - User accounts
- `sports` - Sport definitions
- `venues` - Venue information
- `courts` - Court details

### Tournament
- `tournaments` - Tournament core
- `tournament_participants` - Registrations
- `matches` - Match details
- `tournament_standings` - Leaderboards

### Financial
- `payments` - Transactions
- `tournament_creator_wallets` - Organizer wallets
- `escrow_accounts` - Escrow tracking

### Scoring
- `scoring_events` - Live scoring
- `live_match_state` - Real-time state
- `match_statistics` - Match stats

## 📝 Common Queries

### Get Tournament Participants
```sql
SELECT u.first_name, u.last_name, tp.status, tp.payment_status
FROM tournament_participants tp
JOIN users u ON tp.user_id = u.id
WHERE tp.tournament_id = ?;
```

### Get Match Schedule
```sql
SELECT m.*, t.name as tournament_name, v.name as venue_name
FROM matches m
JOIN tournaments t ON m.tournament_id = t.id
LEFT JOIN venues v ON m.venue_id = v.id
WHERE m.match_date = CURDATE()
ORDER BY m.match_time;
```

### Get Player Statistics
```sql
SELECT * FROM player_statistics
WHERE user_id = ? AND sport_id = ?;
```

### Get Live Matches
```sql
SELECT * FROM v_live_matches
WHERE is_live = TRUE;
```

## 🔧 Stored Procedures

### Check Tournament Creator Eligibility
```sql
CALL sp_check_tournament_creator_eligibility(user_id);
```

### Detect Role Conflicts
```sql
CALL sp_detect_role_conflicts(match_id, referee_id);
```

### Calculate Refund
```sql
CALL sp_calculate_refund_amount(tournament_id, participant_id, @amount, @percentage);
SELECT @amount, @percentage;
```

### Start Match
```sql
CALL sp_start_match(match_id, sport_id);
```

### Record Score Event
```sql
CALL sp_record_score_event(match_id, 'point_scored', player_id, '{"points": 1}', @event_id);
```

### Complete Match
```sql
CALL sp_complete_match_scoring(match_id, winner_participant_id, '{"sets": [6,4], "games": []}');
```

## 📈 Useful Views

### Tournament Dashboard
```sql
SELECT * FROM v_tournament_creator_dashboard
WHERE organizer_id = ?;
```

### Player Schedule
```sql
SELECT * FROM v_player_match_schedule
WHERE player_id = ?
AND scheduled_date >= CURDATE();
```

### Referee Workload
```sql
SELECT * FROM v_referee_workload
ORDER BY reliability_score DESC;
```

### Financial Summary
```sql
SELECT * FROM v_tournament_financial_summary
WHERE tournament_id = ?;
```

## 🔍 Debugging Queries

### Check Foreign Keys
```sql
SELECT 
    TABLE_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = 'sportlife'
AND REFERENCED_TABLE_NAME IS NOT NULL;
```

### Check Indexes
```sql
SELECT 
    TABLE_NAME,
    INDEX_NAME,
    GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) as COLUMNS
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = 'sportlife'
GROUP BY TABLE_NAME, INDEX_NAME;
```

### Check Table Sizes
```sql
SELECT 
    TABLE_NAME,
    ROUND((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024, 2) AS 'Size (MB)',
    TABLE_ROWS
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'sportlife'
ORDER BY (DATA_LENGTH + INDEX_LENGTH) DESC;
```

### Find Missing Indexes
```sql
SELECT * FROM sys.schema_unused_indexes
WHERE object_schema = 'sportlife';
```

## ⚠️ Common Issues

### Issue: Foreign Key Constraint Fails
```sql
-- Check if referenced record exists
SELECT * FROM parent_table WHERE id = ?;

-- Disable FK checks temporarily (use with caution!)
SET FOREIGN_KEY_CHECKS = 0;
-- Your operation
SET FOREIGN_KEY_CHECKS = 1;
```

### Issue: Duplicate Entry
```sql
-- Check existing records
SELECT * FROM table_name WHERE unique_column = ?;

-- Update instead of insert
INSERT INTO table_name (...) VALUES (...)
ON DUPLICATE KEY UPDATE column = value;
```

### Issue: Trigger Not Firing
```sql
-- Check if trigger exists
SHOW TRIGGERS WHERE `Table` = 'table_name';

-- Check trigger definition
SHOW CREATE TRIGGER trigger_name;
```

## 🛠️ Maintenance

### Optimize Tables
```sql
OPTIMIZE TABLE table_name;
```

### Analyze Tables
```sql
ANALYZE TABLE table_name;
```

### Repair Tables
```sql
REPAIR TABLE table_name;
```

### Check Tables
```sql
CHECK TABLE table_name;
```

## 📦 Backup & Restore

### Full Backup
```bash
mysqldump -u root -p sportlife > sportlife_backup_$(date +%Y%m%d_%H%M%S).sql
```

### Backup with Compression
```bash
mysqldump -u root -p sportlife | gzip > sportlife_backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Restore
```bash
mysql -u root -p sportlife < sportlife_backup.sql
```

### Restore from Compressed
```bash
gunzip < sportlife_backup.sql.gz | mysql -u root -p sportlife
```

## 🔐 Security

### Create Application User
```sql
CREATE USER 'sportlife_app'@'localhost' IDENTIFIED BY 'secure_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON sportlife.* TO 'sportlife_app'@'localhost';
FLUSH PRIVILEGES;
```

### Create Read-Only User
```sql
CREATE USER 'sportlife_readonly'@'localhost' IDENTIFIED BY 'secure_password';
GRANT SELECT ON sportlife.* TO 'sportlife_readonly'@'localhost';
FLUSH PRIVILEGES;
```

## 📊 Performance Tips

1. **Use Indexes**: Add indexes for frequently queried columns
2. **Limit Results**: Use LIMIT in queries
3. **Avoid SELECT ***: Select only needed columns
4. **Use Prepared Statements**: Prevent SQL injection and improve performance
5. **Monitor Slow Queries**: Enable slow query log
6. **Regular Maintenance**: Run OPTIMIZE and ANALYZE periodically

## 📞 Quick Help

| Need | File |
|------|------|
| Full documentation | README_SCHEMA_FIXES.md |
| Fix summary | SCHEMA_FIX_SUMMARY.md |
| Implementation guide | SCHEMA_CORRECTION_GUIDE.md |
| Validation checklist | VALIDATION_CHECKLIST.md |
| Test schema | ./test_schema.sh |

---

**Last Updated**: 2025-01-15
**Version**: 2.0 (Fixed)
