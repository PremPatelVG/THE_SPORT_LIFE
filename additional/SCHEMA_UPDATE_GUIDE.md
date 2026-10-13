# Schema Update Guide - Team Reusability

## ✅ Schema.sql Updated!

Your main `schema.sql` file has been updated with all team reusability changes.

---

## What Changed in schema.sql?

### 1. Teams Table - Updated Fields

**New Columns Added:**
```sql
is_tournament_specific BOOLEAN DEFAULT TRUE NOT NULL
sport_id INT NULL
is_public BOOLEAN DEFAULT FALSE NOT NULL
```

**Modified Columns:**
```sql
tournament_id INT NULL  -- Changed from NOT NULL to NULL
```

**New Indexes:**
```sql
INDEX idx_teams_sport (sport_id)
INDEX idx_teams_tournament_specific (is_tournament_specific)
```

**New Constraint:**
```sql
CONSTRAINT check_team_tournament_or_sport CHECK (
    (is_tournament_specific = TRUE AND tournament_id IS NOT NULL) OR
    (is_tournament_specific = FALSE AND sport_id IS NOT NULL)
)
```

### 2. New Table Added

**team_tournament_registrations:**
```sql
CREATE TABLE IF NOT EXISTS team_tournament_registrations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    team_id INT NOT NULL,
    tournament_id INT NOT NULL,
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status ENUM('pending', 'confirmed', 'rejected', 'withdrawn') DEFAULT 'pending',
    payment_status ENUM('pending', 'paid', 'refunded', 'waived') DEFAULT 'pending',
    ...
)
```

---

## For Fresh Installation

If you're setting up a **new database**, just run:

```bash
cd sportlife-backend
npm run db:setup
```

This will create all tables with the new structure automatically.

---

## For Existing Database (Migration Required)

If you already have data in your database, you need to run the migration:

### Option 1: Run Migration Script (Recommended)

```bash
cd sportlife-backend
mysql -u root -p sportlife < database/03_update_teams_for_reusability.sql
```

This migration will:
- ✅ Add new columns to teams table
- ✅ Create team_tournament_registrations table
- ✅ Migrate existing data (mark all as tournament-specific)
- ✅ Add indexes and constraints

### Option 2: Manual Update (If you prefer)

```sql
-- Connect to database
mysql -u root -p sportlife

-- Add new columns
ALTER TABLE teams 
ADD COLUMN is_tournament_specific BOOLEAN DEFAULT TRUE NOT NULL,
ADD COLUMN sport_id INT NULL,
ADD COLUMN is_public BOOLEAN DEFAULT FALSE NOT NULL;

-- Make tournament_id nullable
ALTER TABLE teams 
MODIFY COLUMN tournament_id INT NULL;

-- Add foreign key
ALTER TABLE teams 
ADD CONSTRAINT fk_teams_sport FOREIGN KEY (sport_id) REFERENCES sports(id) ON DELETE SET NULL;

-- Add indexes
ALTER TABLE teams 
ADD INDEX idx_teams_sport (sport_id),
ADD INDEX idx_teams_tournament_specific (is_tournament_specific);

-- Update unique constraint
ALTER TABLE teams 
DROP INDEX unique_team_name_tournament;

ALTER TABLE teams
ADD UNIQUE KEY unique_team_name_creator_tournament (name, creator_id, tournament_id);

-- Add check constraint
ALTER TABLE teams
ADD CONSTRAINT check_team_tournament_or_sport CHECK (
    (is_tournament_specific = TRUE AND tournament_id IS NOT NULL) OR
    (is_tournament_specific = FALSE AND sport_id IS NOT NULL)
);

-- Create new table
CREATE TABLE IF NOT EXISTS team_tournament_registrations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    team_id INT NOT NULL,
    tournament_id INT NOT NULL,
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    status ENUM('pending', 'confirmed', 'rejected', 'withdrawn') DEFAULT 'pending' NOT NULL,
    payment_status ENUM('pending', 'paid', 'refunded', 'waived') DEFAULT 'pending' NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    UNIQUE KEY unique_team_tournament_registration (team_id, tournament_id),
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    INDEX idx_team_tournament_reg_team (team_id),
    INDEX idx_team_tournament_reg_tournament (tournament_id),
    INDEX idx_team_tournament_reg_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migrate existing data
UPDATE teams 
SET is_tournament_specific = TRUE,
    sport_id = (SELECT sport_id FROM tournaments WHERE tournaments.id = teams.tournament_id)
WHERE tournament_id IS NOT NULL;
```

---

## Verification

After running the migration, verify the changes:

```sql
-- Check teams table structure
DESCRIBE teams;

-- Should see these new columns:
-- is_tournament_specific (tinyint(1))
-- sport_id (int)
-- is_public (tinyint(1))

-- Check new table exists
DESCRIBE team_tournament_registrations;

-- Check existing teams
SELECT id, name, is_tournament_specific, tournament_id, sport_id 
FROM teams 
LIMIT 5;

-- All existing teams should have:
-- is_tournament_specific = 1
-- sport_id = (from their tournament)
```

---

## Rollback (If Needed)

If something goes wrong, you can rollback:

```sql
-- Remove new columns
ALTER TABLE teams 
DROP COLUMN is_tournament_specific,
DROP COLUMN sport_id,
DROP COLUMN is_public;

-- Restore tournament_id constraint
ALTER TABLE teams 
MODIFY COLUMN tournament_id INT NOT NULL;

-- Drop new table
DROP TABLE IF EXISTS team_tournament_registrations;

-- Restore old unique constraint
ALTER TABLE teams 
DROP INDEX unique_team_name_creator_tournament;

ALTER TABLE teams
ADD UNIQUE KEY unique_team_name_tournament (name, tournament_id);
```

---

## Summary

✅ **schema.sql updated** with all team reusability changes
✅ **Backward compatible** - existing teams work as before
✅ **Migration script available** - `03_update_teams_for_reusability.sql`
✅ **Fresh installs** - automatically get new structure
✅ **Existing databases** - can migrate safely

Choose your installation method:
- **New database:** Run `npm run db:setup`
- **Existing database:** Run migration script

Your database is ready for team reusability! 🎉
