#!/bin/bash

# =====================================================
# Run Undo Logs Migrations
# Purpose: Execute all migrations for undo logging system
# Date: 2026-07-21
# =====================================================

echo "🚀 Starting undo logs migrations..."

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Database connection details
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:-sports_tournament_db_v3}"
DB_USER="${DB_USER:-root}"

echo "📊 Database: $DB_NAME"
echo "🔌 Host: $DB_HOST:$DB_PORT"
echo ""

# Run migrations in order
echo "1️⃣ Adding is_undone flag to match_events..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p "$DB_NAME" < database/migrations/add_is_undone_to_match_events.sql

echo ""
echo "2️⃣ Creating match_undo_logs table..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p "$DB_NAME" < database/migrations/create_match_undo_logs.sql

echo ""
echo "3️⃣ Adding undo event type..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p "$DB_NAME" < database/migrations/add_undo_event_type.sql

echo ""
echo "✅ All migrations completed successfully!"
echo ""
echo "📝 Summary:"
echo "   - is_undone flag added to match_events"
echo "   - match_undo_logs table created"
echo "   - undo event type added to match_events"
echo ""
echo "🎯 System ready for undo logging!"
