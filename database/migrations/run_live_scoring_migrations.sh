#!/bin/bash

# =====================================================
# Live Scoring Migrations Runner
# Purpose: Run all live scoring related migrations
# Usage: bash run_live_scoring_migrations.sh
# =====================================================

echo "=========================================="
echo "Live Scoring System - Database Migrations"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Database credentials
DB_USER="root"
DB_NAME="sportforlife"

echo -e "${YELLOW}This script will run the following migrations:${NC}"
echo "1. Create match_events table"
echo "2. Create match_score_details table"
echo "3. Alter matches table (add live scoring columns)"
echo ""

# Prompt for password
echo -e "${YELLOW}Enter MySQL root password:${NC}"
read -s DB_PASSWORD
echo ""

# Function to run a migration
run_migration() {
    local migration_file=$1
    local migration_name=$2
    
    echo -e "${YELLOW}Running: ${migration_name}...${NC}"
    
    if mysql -u "$DB_USER" -p"$DB_PASSWORD" < "$migration_file" 2>&1; then
        echo -e "${GREEN}✓ ${migration_name} completed successfully${NC}"
        echo ""
        return 0
    else
        echo -e "${RED}✗ ${migration_name} failed${NC}"
        echo ""
        return 1
    fi
}

# Run migrations in order
echo "=========================================="
echo "Starting migrations..."
echo "=========================================="
echo ""

# Migration 1: Create match_events table
run_migration "$SCRIPT_DIR/05_create_match_events.sql" "Migration 1: Create match_events table"
if [ $? -ne 0 ]; then
    echo -e "${RED}Migration failed. Stopping.${NC}"
    exit 1
fi

# Migration 2: Create match_score_details table
run_migration "$SCRIPT_DIR/06_create_match_score_details.sql" "Migration 2: Create match_score_details table"
if [ $? -ne 0 ]; then
    echo -e "${RED}Migration failed. Stopping.${NC}"
    exit 1
fi

# Migration 3: Alter matches table
run_migration "$SCRIPT_DIR/07_alter_matches_add_live_scoring.sql" "Migration 3: Alter matches table"
if [ $? -ne 0 ]; then
    echo -e "${RED}Migration failed. Stopping.${NC}"
    exit 1
fi

echo "=========================================="
echo -e "${GREEN}All migrations completed successfully!${NC}"
echo "=========================================="
echo ""
echo "Summary:"
echo "✓ match_events table created"
echo "✓ match_score_details table created"
echo "✓ matches table updated with live scoring columns"
echo ""
echo "You can now proceed with backend implementation."
echo ""
