#!/bin/bash

# Load environment variables
if [ -f ../.env ]; then
    export $(cat ../.env | grep -v '^#' | xargs)
fi

# Database connection details
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:-sportlife}"
DB_USER="${DB_USER:-root}"

echo "======================================"
echo "Seeding Sports Data"
echo "======================================"
echo "Database: $DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo "User: $DB_USER"
echo "======================================"
echo ""

# Run the migration
echo "Running sports seed migration..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p "$DB_NAME" < 04_seed_sports_data.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Sports data seeded successfully!"
    echo ""
    echo "Available sports:"
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p "$DB_NAME" -e "SELECT id, name, category FROM sports ORDER BY id;"
else
    echo ""
    echo "❌ Failed to seed sports data"
    exit 1
fi
