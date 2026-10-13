#!/bin/bash

# =====================================================
# Phase 1 Migration Runner
# Purpose: Run all Phase 1 database migrations safely
# Date: 2025-12-03
# =====================================================

echo "=========================================="
echo "Phase 1: Database Schema Enhancements"
echo "=========================================="
echo ""
echo "⚠️  IMPORTANT: This script will modify your database"
echo "✅ SAFE: All migrations preserve existing data"
echo "✅ SAFE: All new columns have default values"
echo "✅ SAFE: Existing queries will continue to work"
echo ""
read -p "Continue? (y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "❌ Migration cancelled by user"
    exit 1
fi

# Database credentials (update these if needed)
DB_HOST="localhost"
DB_USER="root"
DB_NAME="sportlife_db"

echo ""
echo "📋 Database: $DB_NAME"
echo "🔧 Host: $DB_HOST"
echo ""

# Get database password
read -sp "Enter MySQL password for $DB_USER: " DB_PASS
echo ""
echo ""

# Function to run migration with error handling
run_migration() {
    local migration_file=$1
    local migration_name=$2
    
    echo "=========================================="
    echo "Running: $migration_name"
    echo "File: $migration_file"
    echo "=========================================="
    
    if [ ! -f "$migration_file" ]; then
        echo "❌ ERROR: Migration file not found: $migration_file"
        exit 1
    fi
    
    # Run migration
    mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < "$migration_file"
    
    if [ $? -eq 0 ]; then
        echo "✅ SUCCESS: $migration_name completed"
        echo ""
    else
        echo "❌ ERROR: $migration_name failed"
        echo "Migration stopped. Please check the error above."
        exit 1
    fi
}

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo "Starting Phase 1 migrations..."
echo ""

# Migration 1: Enhance tournament_standings table
run_migration "$SCRIPT_DIR/01_enhance_tournament_standings.sql" "Migration 1: Enhance tournament_standings"

# Migration 2: Enhance match_statistics table
run_migration "$SCRIPT_DIR/02_enhance_match_statistics.sql" "Migration 2: Enhance match_statistics"

# Migration 3: Create comprehensive standings view
run_migration "$SCRIPT_DIR/03_create_standings_view.sql" "Migration 3: Create standings view"

echo "=========================================="
echo "🎉 Phase 1 Migrations Completed Successfully!"
echo "=========================================="
echo ""
echo "✅ tournament_standings table enhanced with new columns"
echo "✅ match_statistics table indexes added"
echo "✅ v_tournament_standings view created"
echo ""
echo "📊 Next Steps:"
echo "1. Verify changes: SELECT * FROM v_tournament_standings LIMIT 5;"
echo "2. Check new columns: DESCRIBE tournament_standings;"
echo "3. Proceed to Phase 2: Backend service updates"
echo ""
echo "🔄 To rollback: Run rollback_phase1_migrations.sh"
echo ""
