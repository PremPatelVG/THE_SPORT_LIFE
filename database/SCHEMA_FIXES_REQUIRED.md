# Database Schema Issues and Fixes Required

## Critical Issues Found

### 1. **Foreign Key Dependency Order Issues**

#### Problem: ALTER TABLE statements adding FKs before referenced tables exist

**Lines 449-450**: Partnership invitation FK added before `partnership_invitations` table is fully created
```sql
ALTER TABLE partnerships
ADD FOREIGN KEY (invitation_id) REFERENCES partnership_invitations(id);
```
**FIX**: Move this ALTER after both tables are created

**Lines 491-496**: Foreign keys added to tables before `tournament_participants` is created
```sql
ALTER TABLE group_participants
ADD FOREIGN KEY (participant_id) REFERENCES tournament_participants(id) ON DELETE CASCADE;

ALTER TABLE tournament_brackets
ADD FOREIGN KEY (participant_id) REFERENCES tournament_participants(id) ON DELETE CASCADE;
```
**FIX**: Move these ALTER statements AFTER `tournament_participants` table creation (after line 488)

**Lines 638-643**: Foreign keys added before `matches` table is fully created
```sql
ALTER TABLE court_availability
ADD FOREIGN KEY (match_id) REFERENCES matches(id);

ALTER TABLE tournament_brackets
ADD FOREIGN KEY (advanced_from_match_id) REFERENCES matches(id);
```
**FIX**: Move these ALTER statements AFTER `matches` table creation (after line 635)

### 2. **Missing Columns in Users Table**

**Stored Procedures reference non-existent columns:**

Lines 1604, 1608 - `sp_check_tournament_creator_eligibility` references:
- `profile_completion_percentage` - NOT IN users table
- `payment_method_verified` - NOT IN users table

Line 1721 - `trg_update_account_age` references:
- `account_age_days` - NOT IN users table

Line 2121 - `sp_start_match` references:
- `actual_start_time` - NOT IN matches table

**FIX**: Add these columns to the users and matches tables:

```sql
-- Add to users table after line 50:
profile_completion_percentage INT DEFAULT 0,
payment_method_verified BOOLEAN DEFAULT FALSE,
account_age_days INT DEFAULT 0,

-- Add to matches table after line 605:
actual_start_time DATETIME,
actual_end_time DATETIME,
```

### 3. **Circular/Forward Reference in live_match_state**

Line 1839: `live_match_state` references `scoring_events(id)` 
```sql
FOREIGN KEY (last_event_id) REFERENCES scoring_events(id),
```

But `scoring_events` is created BEFORE `live_match_state`, so this should work.
However, line 1856 tries to ALTER `scoring_events` to add FK to `sports` which already exists.

**FIX**: The ALTER TABLE on scoring_events (lines 1846-1861) should be removed and those columns should be added directly to the CREATE TABLE statement for `scoring_events` (lines 693-706).

### 4. **Procedure/Trigger Issues**

**Lines 1591-1636**: `sp_check_tournament_creator_eligibility` - Uses columns that don't exist
**Lines 1717-1722**: `trg_update_account_age` - Uses column that doesn't exist  
**Lines 2119-2122**: `sp_start_match` - Uses column that doesn't exist

### 5. **Index Creation on Non-Existent Columns**

Lines 1797-1800: Creating indexes before ensuring all columns exist

## Recommended Fix Sequence

1. **Add missing columns to users table** (profile_completion_percentage, payment_method_verified, account_age_days)
2. **Add missing columns to matches table** (actual_start_time, actual_end_time)
3. **Modify scoring_events CREATE TABLE** to include all columns instead of using ALTER TABLE
4. **Remove all ALTER TABLE foreign key statements** that appear before the referenced table is created
5. **Add a new section at the end** titled "FOREIGN KEY CONSTRAINTS" that adds all the deferred foreign keys AFTER all tables are created
6. **Fix stored procedures** to handle missing columns gracefully or remove them
7. **Fix triggers** to handle missing columns or remove them

## Correct Table Creation Order

1. users
2. otp_verifications
3. sports
4. user_sports
5. venues
6. courts
7. venue_weather_alerts
8. tournaments
9. tournament_creator_wallets
10. tournament_templates
11. tournament_groups
12. tournament_brackets (without participant_id FK)
13. teams
14. team_members
15. team_invitations
16. partnerships (without invitation_id FK)
17. partnership_invitations
18. **NOW ADD**: ALTER TABLE partnerships ADD FK to partnership_invitations
19. tournament_participants
20. **NOW ADD**: ALTER TABLE group_participants ADD FK
21. **NOW ADD**: ALTER TABLE tournament_brackets ADD FK to tournament_participants
22. group_participants (without participant_id FK initially)
23. lucky_losers
24. schedule_constraints
25. court_availability (without match_id FK)
26. matches
27. **NOW ADD**: ALTER TABLE court_availability ADD FK to matches
28. **NOW ADD**: ALTER TABLE tournament_brackets ADD FK to matches
29. player_schedule
30. scheduling_conflicts
31. scoring_events (with ALL columns including sport_id, player_id, etc.)
32. match_statistics
33. tournament_standings
34. ladder_rankings
35. ladder_challenges
36. player_statistics
37. achievements
38. user_achievements
39. payments
40. wallet_transactions
41. prize_distribution
42. referee_performance
43. referee_availability
44. referee_certifications
45. match_verifications
46. match_disputes
47. match_checkins
48. user_follows
49. notifications
50. notification_preferences
51. device_tokens
52. user_sessions
53. audit_logs
54. (All additional tables...)
55. live_match_state
56. match_timeline
57. sport_scoring_config
58. player_sport_performance
59. match_momentum

## Quick Fix Commands

Run these in order after backing up:

```sql
-- 1. Add missing columns to users
ALTER TABLE users 
ADD COLUMN profile_completion_percentage INT DEFAULT 0 AFTER is_active,
ADD COLUMN payment_method_verified BOOLEAN DEFAULT FALSE AFTER profile_completion_percentage,
ADD COLUMN account_age_days INT DEFAULT 0 AFTER payment_method_verified;

-- 2. Add missing columns to matches
ALTER TABLE matches
ADD COLUMN actual_start_time DATETIME AFTER notes,
ADD COLUMN actual_end_time DATETIME AFTER actual_start_time;
```
