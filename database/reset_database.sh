#!/bin/bash

# =====================================================
# Reset Database Script
# Drops and recreates the database from scratch
# =====================================================

echo "⚠️  Database Reset"
echo "===================="
echo ""
echo "This will DROP the entire database and recreate it."
read -p "Are you sure? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Aborted"
    exit 1
fi

echo ""
echo "🗑️  Dropping database..."
sudo mysql -e "DROP DATABASE IF EXISTS sports_tournament_db_v2;"

echo "✅ Database dropped"
echo ""
echo "🔄 Running setup..."
npm run db:setup

echo ""
echo "✅ Database reset complete!"
