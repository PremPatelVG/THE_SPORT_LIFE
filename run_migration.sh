#!/bin/bash

# =====================================================
# Enhanced Tournament Migration Script
# =====================================================

echo "🚀 Starting Enhanced Tournament Migration..."
echo ""

# Database credentials from .env
DB_USER="tournament_user"
DB_PASSWORD="Tournament@2025!"
DB_NAME="sports_tournament_db_v3"
DB_HOST="localhost"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Backup
echo -e "${YELLOW}Step 1: Creating backup...${NC}"
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
mysqldump -u"$DB_USER" -p"$DB_PASSWORD" -h"$DB_HOST" "$DB_NAME" > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Backup created: $BACKUP_FILE${NC}"
else
    echo -e "${RED}❌ Backup failed!${NC}"
    exit 1
fi

echo ""

# Step 2: Run Migration
echo -e "${YELLOW}Step 2: Running migration...${NC}"
mysql -u"$DB_USER" -p"$DB_PASSWORD" -h"$DB_HOST" "$DB_NAME" < migrations/ALTER_TOURNAMENTS_ENHANCED.sql

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Migration completed successfully!${NC}"
else
    echo -e "${RED}❌ Migration failed!${NC}"
    echo -e "${YELLOW}To restore backup, run:${NC}"
    echo "mysql -u$DB_USER -p$DB_PASSWORD -h$DB_HOST $DB_NAME < $BACKUP_FILE"
    exit 1
fi

echo ""

# Step 3: Verify
echo -e "${YELLOW}Step 3: Verifying migration...${NC}"

# Check new columns
echo "Checking new columns in tournaments table..."
mysql -u"$DB_USER" -p"$DB_PASSWORD" -h"$DB_HOST" "$DB_NAME" -e "
SELECT COLUMN_NAME, DATA_TYPE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'tournaments' 
AND COLUMN_NAME IN ('tournament_type', 'match_config', 'logo_url');" 2>/dev/null

# Check sport_match_configs table
echo ""
echo "Checking sport_match_configs table..."
SPORT_COUNT=$(mysql -u"$DB_USER" -p"$DB_PASSWORD" -h"$DB_HOST" "$DB_NAME" -se "SELECT COUNT(*) FROM sport_match_configs;" 2>/dev/null)

if [ "$SPORT_COUNT" -eq 8 ]; then
    echo -e "${GREEN}✅ All 8 sports configured!${NC}"
    mysql -u"$DB_USER" -p"$DB_PASSWORD" -h"$DB_HOST" "$DB_NAME" -e "
    SELECT sport_name, match_structure 
    FROM sport_match_configs 
    ORDER BY sport_name;" 2>/dev/null
else
    echo -e "${RED}❌ Expected 8 sports, found $SPORT_COUNT${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Migration Complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Restart your backend server"
echo "2. Test the API: curl http://localhost:3000/api/v1/sport-configs"
echo ""
echo "Backup saved at: $BACKUP_FILE"
