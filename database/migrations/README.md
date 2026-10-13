# Database Migrations

## Overview
This directory contains all database migrations. Migrations allow you to modify your database schema incrementally without losing data.

## Migration Naming Convention
```
YYYYMMDDHHMMSS_description.sql
```

Example: `20251024120000_add_sport_id_to_teams.sql`

## How It Works

1. Each migration file has an UP and DOWN section
2. UP: Changes to apply
3. DOWN: How to rollback the changes
4. Migrations are tracked in the `migrations` table

## Usage

### Apply all pending migrations:
```bash
npm run migrate:up
```

### Rollback last migration:
```bash
npm run migrate:down
```

### Check migration status:
```bash
npm run migrate:status
```

### Create new migration:
```bash
npm run migrate:create add_new_column
```

## Example Migration File

```sql
-- Migration: Add is_verified column to users
-- Created: 2025-10-24

-- UP
ALTER TABLE users ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;

-- DOWN
ALTER TABLE users DROP COLUMN is_verified;
```

## Best Practices

1. **Never edit applied migrations** - Create a new one instead
2. **Test migrations** - Test both UP and DOWN
3. **Keep migrations small** - One logical change per migration
4. **Add comments** - Explain why the change is needed
5. **Backup before migrating** - Always backup production data
