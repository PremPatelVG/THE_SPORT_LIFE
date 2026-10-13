# Database Schema Correction Guide

## Summary of Issues

The current `schema.sql` file has **5 critical foreign key dependency issues** and **3 missing column issues** that will cause errors during table creation.

## Critical Issues

### Issue #1: partnerships → partnership_invitations (Line 449-450)
**Problem**: Trying to add FK before `partnership_invitations` exists
```sql
ALTER TABLE partnerships
ADD FOREIGN KEY (invitation_id) REFERENCES partnership_invitations(id);
```
**Location**: Between lines 449-450  
**Fix**: Move this ALTER statement to AFTER line 446 (after partnership_invitations is created)

### Issue #2: group_participants FK (Line 491-492)
**Problem**: Adding FK to `tournament_participants` before it exists
```sql
ALTER TABLE group_participants
ADD FOREIGN KEY (participant_id) REFERENCES tournament_participants(id) ON DELETE CASCADE;
```
**Location**: Line 491-492  
**Fix**: Move to AFTER line 488 (after tournament_participants is created)

### Issue #3: tournament_brackets FK (Line 495-496)
**Problem**: Adding FK to `tournament_participants` before it exists
```sql
ALTER TABLE tournament_brackets
ADD FOREIGN KEY (participant_id) REFERENCES tournament_participants(id) ON DELETE CASCADE;
```
**Location**: Line 495-496  
**Fix**: Move to AFTER line 488 (after tournament_participants is created)

### Issue #4: court_availability FK (Line 638-639)
**Problem**: Adding FK to `matches` before it exists
```sql
ALTER TABLE court_availability
ADD FOREIGN KEY (match_id) REFERENCES matches(id);
```
**Location**: Line 638-639  
**Fix**: Move to AFTER line 635 (after matches table is created)

### Issue #5: tournament_brackets second FK (Line 642-643)
**Problem**: Adding FK to `matches` before it exists
```sql
ALTER TABLE tournament_brackets
ADD FOREIGN KEY (advanced_from_match_id) REFERENCES matches(id);
```
**Location**: Line 642-643  
**Fix**: Move to AFTER line 635 (after matches table is created)

### Issue #6: scoring_events ALTER TABLE (Lines 1846-1861)
**Problem**: Using ALTER TABLE to add columns that should be in CREATE TABLE
**Fix**: Modify the CREATE TABLE scoring_events (lines 693-706) to include all columns directly

### Issue #7: Missing columns in users table
**Columns needed**:
- `profile_completion_percentage INT DEFAULT 0`
- `payment_method_verified BOOLEAN DEFAULT FALSE`
- `account_age_days INT DEFAULT 0`

**Referenced in**:
- Stored procedure `sp_check_tournament_creator_eligibility` (lines 1604, 1608)
- Trigger `trg_update_account_age` (line 1721)

### Issue #8: Missing columns in matches table
**Columns needed**:
- `actual_start_time DATETIME`
- `actual_end_time DATETIME`

**Referenced in**:
- Stored procedure `sp_start_match` (line 2121)
- Stored procedure `sp_complete_match_scoring` (line 2189)

## Solution Approach

### Option 1: Quick Fix (Recommended for existing databases)
Run the `fix_schema_issues.sql` script first, then run `schema.sql`

### Option 2: Complete Rewrite
Create a new schema file with proper ordering (see below)

## Corrected Table Creation Sequence

```
1. Core Tables (No Dependencies)
   - users
   - otp_verifications  
   - sports
   - venues

2. First Level Dependencies
   - user_sports (depends on: users, sports)
   - courts (depends on: venues)
   - venue_weather_alerts (depends on: venues)
   - tournaments (depends on: sports, venues, users)

3. Second Level Dependencies
   - tournament_creator_wallets (depends on: users)
   - tournament_templates (depends on: users, sports)
   - tournament_groups (depends on: tournaments)
   - tournament_brackets (depends on: tournaments) [WITHOUT FKs to participants/matches]
   - teams (depends on: tournaments, users)

4. Third Level Dependencies
   - team_members (depends on: teams, users)
   - team_invitations (depends on: teams, users)
   - partnerships (depends on: tournaments, users) [WITHOUT FK to invitations]
   - partnership_invitations (depends on: tournaments, users)

5. Add Deferred FK #1
   ALTER TABLE partnerships ADD FK to partnership_invitations

6. Fourth Level Dependencies
   - tournament_participants (depends on: tournaments, users, partnerships, teams)

7. Add Deferred FKs #2-3
   ALTER TABLE group_participants ADD FK to tournament_participants
   ALTER TABLE tournament_brackets ADD FK to tournament_participants

8. Fifth Level Dependencies
   - group_participants (depends on: tournament_groups) [WITHOUT FK initially]
   - lucky_losers (depends on: tournaments, tournament_participants)
   - schedule_constraints (depends on: tournaments)
   - court_availability (depends on: courts, tournaments, users) [WITHOUT match FK]

9. Sixth Level Dependencies
   - matches (depends on: tournaments, groups, participants, venues, courts, users)

10. Add Deferred FKs #4-5
    ALTER TABLE court_availability ADD FK to matches
    ALTER TABLE tournament_brackets ADD FK to matches

11. Remaining Tables (in order)
    - player_schedule
    - scheduling_conflicts
    - scoring_events (WITH all columns)
    - match_statistics
    - tournament_standings
    - ladder_rankings
    - ladder_challenges
    - player_statistics
    - achievements
    - user_achievements
    - payments
    - wallet_transactions
    - prize_distribution
    - referee_performance
    - referee_availability
    - referee_certifications
    - match_verifications
    - match_disputes
    - match_checkins
    - user_follows
    - notifications
    - notification_preferences
    - device_tokens
    - user_sessions
    - audit_logs
    - referee_assignment_requests
    - player_role_conflicts
    - refund_policies
    - refund_requests
    - emergency_referee_pool
    - tournament_violations
    - player_availability
    - match_reschedule_history
    - tiebreaker_matches
    - tournament_creator_eligibility
    - escrow_accounts
    - match_delays
    - tournament_analytics
    - live_match_state
    - match_timeline
    - sport_scoring_config
    - player_sport_performance
    - match_momentum

12. Views (after all tables)
13. Stored Procedures
14. Triggers
15. Additional Indexes
```

## Implementation Steps

1. **Backup existing database** (if any)
2. **Run fix_schema_issues.sql** to add missing columns
3. **Modify schema.sql**:
   - Add missing columns to users table (after line 43)
   - Add missing columns to matches table (after line 605)
   - Move ALTER TABLE statements as indicated above
   - Modify scoring_events CREATE TABLE to include all columns
4. **Test on development database**
5. **Deploy to production**

## Files Created

1. `SCHEMA_FIXES_REQUIRED.md` - Detailed issue analysis
2. `fix_schema_issues.sql` - Quick fix script for missing columns
3. `SCHEMA_CORRECTION_GUIDE.md` - This file (implementation guide)
